import { describe, expect, it } from 'vitest'
import { allCommutes, estimateCommute } from './commute.js'

describe('metropolitan commute', () => {
  it('trades time, money and energy between modes', () => {
    const context = { referenceMinutes: 60, peak: false, raining: false }
    const walk = estimateCommute('walk', context)
    const metro = estimateCommute('metro', context)
    expect(walk.cost).toBe(0)
    expect(walk.minutes).toBeGreaterThan(metro.minutes)
    expect(walk.energy).toBeGreaterThan(metro.energy)
  })

  it('makes rain and rush hour materially affect the journey', () => {
    const calm = estimateCommute('bus', { referenceMinutes: 60, peak: false, raining: false })
    const difficult = estimateCommute('bus', { referenceMinutes: 60, peak: true, raining: true })
    expect(difficult.minutes).toBeGreaterThan(calm.minutes)
    expect(difficult.reliability).toBeLessThan(calm.reliability)
    expect(allCommutes({ referenceMinutes: 60, peak: true, raining: true })).toHaveLength(4)
  })
})
