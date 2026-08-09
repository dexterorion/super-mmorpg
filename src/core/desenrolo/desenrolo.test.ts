import { describe, expect, it } from 'vitest'
import type { ItemDef } from '../items/item.js'
import { createInitialState, withItem } from '../state/state.js'
import { getView, perform, startBattle, type DesenroloDef } from './desenrolo.js'

const def: DesenroloDef = {
  id: 'queue',
  name: 'Fila',
  intro: ['A fila não anda.'],
  patience: 50,
  arguments: [
    { id: 'good', text: 'Tenho horário.', topic: 'time', power: 9 },
    { id: 'bad', text: 'Mas eu mereço.', topic: 'ego', power: 99, rebutted: true },
  ],
  tells: [
    { id: 'clock', text: 'Olha o relógio.' },
    { id: 'paper', text: 'Separa papéis.' },
  ],
  weakness: { affinity: 'gab', multiplier: 2, revealText: 'Organiza por horário.' },
  moves: [{ id: 'delay', text: 'Volta amanhã.', damage: 10 }],
  winText: ['Deu certo.'],
  loseText: ['Fechou.'],
}
const item: ItemDef = {
  id: 'phone',
  name: 'Telefone',
  description: 'Uma ligação.',
  key: true,
  battle: { text: 'Liga para ajudar.', patienceDamage: 2, oncePerBattle: true },
}
const lookup = (id: string) => (id === def.id ? def : undefined)
const items = (id: string) => (id === item.id ? item : undefined)
const playing = () => {
  const initial = createInitialState({ name: 'Ana', hometown: 'bauru', seed: 1 })
  return perform(startBattle(initial, def), { kind: 'beginFight' }, lookup, items).state
}

describe('Desenrolo', () => {
  it('returns no view without a battle or definition', () => {
    expect(
      getView(createInitialState({ name: 'Ana', hometown: 'bauru', seed: 1 }), lookup)
    ).toBeUndefined()
    expect(
      getView(
        startBattle(createInitialState({ name: 'Ana', hometown: 'bauru', seed: 1 }), def),
        () => undefined
      )
    ).toBeUndefined()
  })

  it('halves repeated argument damage and rebutted arguments deal zero', () => {
    const first = perform(playing(), { kind: 'argue', argumentId: 'good' }, lookup, items)
    const second = perform(first.state, { kind: 'argue', argumentId: 'good' }, lookup, items)
    expect(first.events).toContainEqual(
      expect.objectContaining({ type: 'desenroloArgue', damage: 10 })
    )
    expect(second.events).toContainEqual(
      expect.objectContaining({ type: 'desenroloArgue', damage: 5 })
    )

    const rebutted = perform(playing(), { kind: 'argue', argumentId: 'bad' }, lookup, items)
    expect(rebutted.events).toContainEqual(
      expect.objectContaining({ type: 'desenroloArgue', damage: 0 })
    )
  })

  it('reveals tells in order, exposes the weakness, and braces the next hit', () => {
    const observed = perform(playing(), { kind: 'observe' }, lookup, items)
    expect(observed.state.battle).toMatchObject({
      revealedTells: 1,
      weaknessRevealed: false,
      braced: true,
    })
    expect(observed.events).toContainEqual(
      expect.objectContaining({ type: 'desenroloPressure', damage: 5 })
    )

    const next = perform(observed.state, { kind: 'observe' }, lookup, items)
    expect(next.state.battle).toMatchObject({ revealedTells: 2, weaknessRevealed: true })
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: 'desenroloPressure', damage: 5 })
    )
    const exhaustedObservation = perform(next.state, { kind: 'observe' }, lookup, items)
    expect(exhaustedObservation.state.battle?.transcript[0]?.text).toMatch(/já entendeu/)
  })

  it('wins when patience reaches zero', () => {
    const fragile = { ...def, patience: 3 }
    const byId = (id: string) => (id === fragile.id ? fragile : undefined)
    const state = perform(
      startBattle(playing(), fragile),
      { kind: 'beginFight' },
      byId,
      items
    ).state
    const result = perform(state, { kind: 'argue', argumentId: 'good' }, byId, items)
    expect(result.state.battle?.phase).toBe('won')
  })

  it('loses from energy or the turn limit and leaves at least one energy after acknowledgement', () => {
    const tired = { ...playing(), player: { ...playing().player, energy: 3 } }
    const lost = perform(tired, { kind: 'insist' }, lookup, items)
    expect(lost.state.battle?.phase).toBe('lost')
    expect(perform(lost.state, { kind: 'acknowledge' }, lookup, items).state.player.energy).toBe(1)

    const timed = { ...def, turnLimit: 1 }
    const timedLookup = (id: string) => (id === timed.id ? timed : undefined)
    const started = perform(
      startBattle(playing(), timed),
      { kind: 'beginFight' },
      timedLookup,
      items
    ).state
    expect(perform(started, { kind: 'observe' }, timedLookup, items).state.battle?.phase).toBe(
      'lost'
    )
  })

  it('does not allow a once-per-battle item twice', () => {
    const state = withItem(playing(), 'phone', 1)
    const first = perform(state, { kind: 'item', itemId: 'phone' }, lookup, items)
    const second = perform(first.state, { kind: 'item', itemId: 'phone' }, lookup, items)
    expect(first.state.battle?.usedItems).toEqual(['phone'])
    expect(second.state).toBe(first.state)
  })

  it('ignores invalid moves and unavailable items', () => {
    const state = playing()
    expect(perform(state, { kind: 'argue', argumentId: 'missing' }, lookup, items).state).toBe(
      state
    )
    expect(perform(state, { kind: 'item', itemId: 'missing' }, lookup, items).state).toBe(state)
    expect(perform(state, { kind: 'acknowledge' }, lookup, items).state).toBe(state)
    expect(perform(state, { kind: 'beginFight' }, lookup, items).state).toBe(state)
  })

  it('supports weighted delayed moves and battles with no eligible pressure', () => {
    const quiet = { ...def, moves: [{ id: 'later', text: 'Depois.', damage: 1, notBeforeTurn: 9 }] }
    const quietLookup = (id: string) => (id === quiet.id ? quiet : undefined)
    const state = perform(
      startBattle(playing(), quiet),
      { kind: 'beginFight' },
      quietLookup,
      items
    ).state
    const result = perform(state, { kind: 'observe' }, quietLookup, items)
    expect(result.events.some((event) => event.type === 'desenroloPressure')).toBe(false)
  })
})
