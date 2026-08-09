import { describe, expect, it } from 'vitest'
import type { ArchetypeId } from '../types.js'
import { createInitialState } from '../state/state.js'
import {
  activeConjuncture,
  applyConjuncture,
  applyDueConjuncture,
  conjunctureEvents,
  resolveConjuncture,
  type ConjunctureId,
} from './conjuncture.js'

const archetypes: readonly ArchetypeId[] = [
  'pedreiro',
  'faria_limer',
  'artista',
  'entregador',
  'estudante',
  'saude',
]

const eventIds = Object.keys(conjunctureEvents) as ConjunctureId[]

describe('economic and social conjuncture', () => {
  it.each(eventIds)('resolves %s deterministically for every archetype', (eventId) => {
    for (const archetype of archetypes) {
      expect(resolveConjuncture(eventId, archetype)).toEqual(resolveConjuncture(eventId, archetype))
    }
  })

  it('varies effects by social and professional starting point', () => {
    const construction = archetypes.map((archetype) =>
      resolveConjuncture('construction_jobs_2025', archetype)
    )
    expect(construction.find((outcome) => outcome.opportunity === 3)?.income).toBe(3)
    expect(new Set(construction.map((outcome) => JSON.stringify(outcome))).size).toBeGreaterThan(1)

    const investigation = archetypes.map((archetype) =>
      resolveConjuncture('financial_crime_investigation_2026_05', archetype)
    )
    expect(new Set(investigation.map((outcome) => outcome.opportunity)).size).toBeGreaterThan(1)
  })

  it.each(eventIds)('keeps education available during %s for every archetype', (eventId) => {
    for (const archetype of archetypes) {
      expect(resolveConjuncture(eventId, archetype).educationAvailable).toBe(true)
    }
  })

  it('attaches a date and primary source to every fact', () => {
    for (const eventId of eventIds) {
      const outcome = resolveConjuncture(eventId, 'estudante')
      expect(outcome.occurredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(outcome.source).toMatch(/^https:\/\/(www\.)?(bcb|gov|agenciadenoticias\.ibge)/)
      expect(outcome.fact.length).toBeGreaterThan(30)
    }
  })

  it('turns rent pressure into visible recurring and immediate costs', () => {
    const state = createInitialState({ name: 'Jaci', hometown: 'prudente', seed: 42 })
    const result = applyConjuncture(state, 'rent_2025')

    expect(result.state.player.monthlyRent).toBeGreaterThan(state.player.monthlyRent)
    expect(result.state.player.money).toBeLessThan(state.player.money)
    expect(result.state.player.energy).toBeLessThan(state.player.energy)
    expect(result.state.journal.at(-1)?.text).toContain('Aluguel residencial')
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'conjuncture' }))
  })

  it('makes an employment expansion especially valuable to a construction worker', () => {
    const base = createInitialState({ name: 'Jaci', hometown: 'prudente', seed: 42 })
    const pedreiro = {
      ...base,
      player: { ...base.player, archetype: 'pedreiro' as const, monthlyIncome: 250_000 },
    }
    const artista = applyConjuncture(base, 'construction_jobs_2025').state
    const worker = applyConjuncture(pedreiro, 'construction_jobs_2025').state

    expect(worker.player.monthlyIncome - pedreiro.player.monthlyIncome).toBeGreaterThan(
      artista.player.monthlyIncome - base.player.monthlyIncome
    )
    expect(worker.player.money - pedreiro.player.money).toBeGreaterThan(
      artista.player.money - base.player.money
    )
  })

  it('applies missed events once when the campaign reaches their day', () => {
    const base = createInitialState({ name: 'Jaci', hometown: 'prudente', seed: 42 })
    const dayFour = { ...base, clock: { ...base.clock, day: 4 } }
    const first = applyDueConjuncture(dayFour)
    const repeated = applyDueConjuncture(first.state)

    expect(first.events).toHaveLength(3)
    expect(repeated).toEqual({ state: first.state, events: [] })
    expect(activeConjuncture(first.state)?.eventId).toBe('financial_crime_investigation_2026_05')
  })
})
