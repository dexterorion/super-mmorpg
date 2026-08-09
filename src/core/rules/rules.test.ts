import { describe, expect, it } from 'vitest'
import {
  describeUnmet,
  evaluate,
  evaluateAll,
  referencedIds,
  type Condition,
} from './conditions.js'
import { applyEffect, applyEffects, grantedIds, type Effect } from './effects.js'
import { createInitialState } from '../state/state.js'

const initial = () => createInitialState({ name: 'Ana', hometown: 'bauru', seed: 1 })

describe('conditions', () => {
  it('evaluates every domain gate', () => {
    const state = {
      ...initial(),
      flags: { yes: true, count: 3 },
      inventory: { coffee: 2 },
      quests: { job: { status: 'active' as const, step: 2, startedOnDay: 1 } },
      relationships: { bia: 2 },
      seenNodes: ['hello'],
      clearedDesenrolos: ['queue'],
    }
    const trueConditions: Condition[] = [
      { kind: 'flag', id: 'yes' },
      { kind: 'flagAtLeast', id: 'count', min: 3 },
      { kind: 'affinity', affinity: 'gab', min: 1 },
      { kind: 'savvy', min: 1 },
      { kind: 'money', min: 100 },
      { kind: 'energy', min: 1 },
      { kind: 'item', id: 'coffee', min: 2 },
      { kind: 'quest', id: 'job', status: 'active' },
      { kind: 'quest', id: 'new', status: 'notStarted' },
      { kind: 'questStep', id: 'job', min: 2 },
      { kind: 'relationship', npc: 'bia', min: 2 },
      { kind: 'day', min: 1, max: 1 },
      { kind: 'period', period: 'morning' },
      { kind: 'act', min: 1, max: 1 },
      { kind: 'seen', node: 'hello' },
      { kind: 'cleared', desenrolo: 'queue' },
      { kind: 'visited', district: 'tiete' },
      { kind: 'not', of: { kind: 'flag', id: 'no' } },
      { kind: 'all', of: [{ kind: 'flag', id: 'yes' }] },
      {
        kind: 'any',
        of: [
          { kind: 'flag', id: 'no' },
          { kind: 'flag', id: 'yes' },
        ],
      },
    ]
    expect(trueConditions.every((condition) => evaluate(state, condition))).toBe(true)
    expect(evaluateAll(state)).toBe(true)
    expect(evaluateAll(state, [])).toBe(true)
  })

  it('rejects unmet variants without coercing missing state', () => {
    const state = initial()
    const falseConditions: Condition[] = [
      { kind: 'flag', id: 'missing' },
      { kind: 'flag', id: 'missing', equals: 'value' },
      { kind: 'flagAtLeast', id: 'missing', min: 1 },
      { kind: 'affinity', affinity: 'gab', min: 2 },
      { kind: 'savvy', min: 2 },
      { kind: 'money', min: 100_000 },
      { kind: 'energy', min: 99 },
      { kind: 'item', id: 'missing' },
      { kind: 'quest', id: 'missing', status: 'done' },
      { kind: 'questStep', id: 'missing', min: 0 },
      { kind: 'relationship', npc: 'missing', min: 1 },
      { kind: 'day', min: 2 },
      { kind: 'day', max: 0 },
      { kind: 'period', period: 'night' },
      { kind: 'act', min: 2 },
      { kind: 'seen', node: 'missing' },
      { kind: 'cleared', desenrolo: 'missing' },
      { kind: 'visited', district: 'missing' },
      { kind: 'not', of: { kind: 'money', min: 1 } },
      { kind: 'all', of: [{ kind: 'flag', id: 'missing' }] },
      { kind: 'any', of: [{ kind: 'flag', id: 'missing' }] },
    ]
    expect(falseConditions.every((condition) => !evaluate(state, condition))).toBe(true)
    expect(evaluateAll(state, falseConditions)).toBe(false)
  })

  it('describes player-facing requirements and exposes referenced ids', () => {
    expect(describeUnmet({ kind: 'affinity', affinity: 'instinct', min: 4 })).toBe('Faro 4')
    expect(describeUnmet({ kind: 'savvy', min: 2 })).toBe('Manha 2')
    expect(describeUnmet({ kind: 'money', min: 1234 })).toBe('R$ 12,34')
    expect(describeUnmet({ kind: 'energy', min: 5 })).toBe('Disposição 5')
    expect(describeUnmet({ kind: 'item', id: 'coffee' })).toBe('precisa de: coffee')
    expect(describeUnmet({ kind: 'flag', id: 'x' })).toBe('ainda não')
    expect(
      describeUnmet({
        kind: 'all',
        of: [
          { kind: 'savvy', min: 2 },
          { kind: 'energy', min: 5 },
        ],
      })
    ).toBe('Manha 2, Disposição 5')
    expect(
      describeUnmet({
        kind: 'any',
        of: [
          { kind: 'savvy', min: 2 },
          { kind: 'energy', min: 5 },
        ],
      })
    ).toBe('Manha 2 ou Disposição 5')
    expect(
      referencedIds({
        kind: 'all',
        of: [
          { kind: 'flag', id: 'x' },
          { kind: 'item', id: 'coffee' },
          { kind: 'questStep', id: 'job', min: 1 },
          { kind: 'seen', node: 'hello' },
          { kind: 'cleared', desenrolo: 'queue' },
          { kind: 'relationship', npc: 'bia', min: 1 },
          { kind: 'visited', district: 'centro' },
        ],
      })
    ).toEqual([
      'flag:x',
      'item:coffee',
      'quest:job',
      'node:hello',
      'desenrolo:queue',
      'npc:bia',
      'district:centro',
    ])
    expect(
      referencedIds({ kind: 'not', of: { kind: 'flagAtLeast', id: 'count', min: 1 } })
    ).toEqual(['flag:count'])
    expect(referencedIds({ kind: 'money', min: 1 })).toEqual([])
  })
})

describe('effects', () => {
  it('applies the complete serialisable effect vocabulary', () => {
    const effects: Effect[] = [
      { kind: 'flag', id: 'x', value: true },
      { kind: 'flagAdd', id: 'count', delta: 2 },
      { kind: 'money', delta: -100 },
      { kind: 'energy', delta: -2 },
      { kind: 'transit', delta: 500 },
      { kind: 'savvyXp', amount: 100 },
      { kind: 'affinity', affinity: 'gab', delta: 1 },
      { kind: 'item', id: 'coffee', delta: 1 },
      { kind: 'relationship', npc: 'bia', delta: 1 },
      { kind: 'questStart', id: 'job' },
      { kind: 'questStep', id: 'job', step: 2 },
      { kind: 'journal', id: 'note', text: 'Aprendi.', entryKind: 'lesson' },
      { kind: 'advancePeriod' },
      { kind: 'act', act: 2 },
      { kind: 'moveTo', district: 'centro', place: 'centro_republica' },
    ]
    const result = applyEffects(initial(), effects)
    expect(result.state).toMatchObject({ act: 2, district: 'centro', place: 'centro_republica' })
    expect(result.state.flags).toMatchObject({ x: true, count: 2 })
    expect(result.state.quests.job).toMatchObject({ status: 'active', step: 2 })
    expect(result.state.inventory.coffee).toBe(1)
  })

  it('handles quest outcomes, sleep, modes, and game endings', () => {
    let state = applyEffect(initial(), { kind: 'questDone', id: 'job' }).state
    expect(state.quests.job?.status).toBe('done')
    state = applyEffect(state, { kind: 'questFail', id: 'other' }).state
    expect(state.quests.other?.status).toBe('failed')
    expect(applyEffect(state, { kind: 'sleep', quality: 'rough' }).events[0]).toMatchObject({
      type: 'slept',
    })
    expect(applyEffect(state, { kind: 'startDesenrolo', id: 'queue' }).state.mode.kind).toBe(
      'desenrolo'
    )
    expect(applyEffect(state, { kind: 'startDialogue', id: 'hello' }).state.mode.kind).toBe(
      'dialogue'
    )
    expect(applyEffect(state, { kind: 'endGame', endingId: 'home' }).state.mode.kind).toBe('ended')
  })

  it('reports ids granted by effects', () => {
    expect(grantedIds({ kind: 'flag', id: 'x', value: true })).toEqual(['flag:x'])
    expect(grantedIds({ kind: 'item', id: 'coffee', delta: 1 })).toEqual(['item:coffee'])
    expect(grantedIds({ kind: 'item', id: 'coffee', delta: -1 })).toEqual([])
    expect(grantedIds({ kind: 'questDone', id: 'job' })).toEqual(['quest:job'])
    expect(grantedIds({ kind: 'relationship', npc: 'bia', delta: 1 })).toEqual(['npc:bia'])
    expect(grantedIds({ kind: 'moveTo', district: 'centro', place: 'x' })).toEqual([
      'district:centro',
    ])
    expect(grantedIds({ kind: 'energy', delta: 1 })).toEqual([])
  })
})
