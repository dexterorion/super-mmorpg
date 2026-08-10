import { describe, expect, it } from 'vitest'
import { runLifeYear } from './life-year.js'

describe('365-day life simulation', () => {
  it.each(['pedreiro', 'faria_limer', 'artista', 'entregador', 'estudante', 'saude'] as const)(
    'closes a deterministic year for %s without duplicate cycles',
    (archetype) => {
      const result = runLifeYear(archetype, 7)
      expect(result).toMatchObject({
        archetype,
        daysClosed: 365,
        monthsSettled: 12,
        finalDay: 366,
        educationStatus: 'completed',
        finalHousing: 'quarto_guarulhos',
        careerChanges: 2,
        housingChanges: 1,
        partnershipStatus: 'married',
        invariants: {
          noSoftlock: true,
          safeIntegerMoney: true,
          monthlyCyclesUnique: true,
          careerChanged: true,
          housingChanged: true,
          monthlyLedgerReflectsChanges: true,
          familyDecisionMade: true,
          careConsistent: true,
          secondCareerReached: true,
          yearClosedOnce: true,
          finalSaveRoundTrip: true,
        },
      })
      expect(result.activities.work).toBeGreaterThanOrEqual(260)
      expect(result.activities.study).toBeGreaterThan(0)
      expect(result.activities.socialize).toBeGreaterThan(0)
      expect(result.activities.rest).toBeGreaterThan(0)
      expect(result.epilogue.length).toBeGreaterThan(20)
      if (result.familyDecision === 'yes') {
        expect(result.children).toBe(1)
        expect(result.careDays).toBeGreaterThanOrEqual(200)
      } else {
        expect(result.children).toBe(0)
        expect(result.careDays).toBe(0)
      }
    }
  )
})
