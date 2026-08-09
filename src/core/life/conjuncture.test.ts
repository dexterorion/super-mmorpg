import { describe, expect, it } from 'vitest'
import type { ArchetypeId } from '../types.js'
import { conjunctureEvents, resolveConjuncture, type ConjunctureId } from './conjuncture.js'

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
})
