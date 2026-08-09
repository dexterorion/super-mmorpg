import { beforeEach, describe, expect, it } from 'vitest'
import { createInitialState, type GameState } from '../state/state.js'
import {
  FARE,
  addMoney,
  advancePeriod,
  awardSavvy,
  canAfford,
  canRide,
  formatMoney,
  isExhausted,
  nextPeriod,
  payFare,
  restoreEnergy,
  sleep,
  spendEnergy,
  spendMoney,
  topUpTransit,
  trainAffinity,
  xpForNextLevel,
} from './economy.js'

let state: GameState

beforeEach(() => {
  state = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 1 })
})

describe('formatMoney', () => {
  it('renders centavos as Brazilian currency', () => {
    expect(formatMoney(34_000)).toBe('R$ 340,00')
    expect(formatMoney(520)).toBe('R$ 5,20')
    expect(formatMoney(5)).toBe('R$ 0,05')
    expect(formatMoney(0)).toBe('R$ 0,00')
  })

  it('keeps the sign outside the amount', () => {
    expect(formatMoney(-150)).toBe('-R$ 1,50')
  })
})

describe('money', () => {
  it('rejects fractional centavos at domain boundaries', () => {
    expect(() => addMoney(state, 0.5)).toThrow(/safe integer/)
    expect(() => topUpTransit(state, 500.5)).toThrow(/safe integer/)
    expect(() => formatMoney(1.5)).toThrow(/safe integer/)
  })

  it('never goes negative', () => {
    expect(addMoney(state, -999_999).player.money).toBe(0)
  })

  it('spendMoney is a no-op when the player cannot afford it', () => {
    const broke = addMoney(state, -34_000)
    expect(spendMoney(broke, 100)).toBe(broke)
  })

  it('spendMoney deducts when affordable', () => {
    expect(spendMoney(state, 1_000).player.money).toBe(33_000)
  })

  it('canAfford is inclusive of the exact amount', () => {
    expect(canAfford(state, 34_000)).toBe(true)
    expect(canAfford(state, 34_001)).toBe(false)
  })
})

describe('transit', () => {
  it('cannot ride with an empty Bilhete', () => {
    expect(canRide(state)).toBe(false)
  })

  it('top-up moves money onto the card', () => {
    const next = topUpTransit(state, 2_000)
    expect(next.player.money).toBe(32_000)
    expect(next.player.transit).toBe(2_000)
    expect(canRide(next)).toBe(true)
  })

  it('top-up is refused when the player cannot pay', () => {
    const broke = addMoney(state, -34_000)
    expect(topUpTransit(broke, 500)).toBe(broke)
  })

  it('paying a fare deducts exactly one ride', () => {
    const loaded = topUpTransit(state, 2_000)
    expect(payFare(loaded).player.transit).toBe(2_000 - FARE)
  })

  it('paying with insufficient credit is a no-op, not a negative balance', () => {
    expect(payFare(state)).toBe(state)
  })
})

describe('energy', () => {
  it('clamps at zero and at the maximum', () => {
    expect(spendEnergy(state, 999).player.energy).toBe(0)
    expect(restoreEnergy(state, 999).player.energy).toBe(state.player.energyMax)
  })

  it('reports exhaustion at exactly zero', () => {
    expect(isExhausted(spendEnergy(state, state.player.energy))).toBe(true)
    expect(isExhausted(spendEnergy(state, state.player.energy - 1))).toBe(false)
  })
})

describe('clock', () => {
  it('cycles morning → afternoon → night → next day', () => {
    expect(nextPeriod('morning')).toEqual({ period: 'afternoon', rolledOver: false })
    expect(nextPeriod('afternoon')).toEqual({ period: 'night', rolledOver: false })
    expect(nextPeriod('night')).toEqual({ period: 'morning', rolledOver: true })
  })

  it('advancing past night rolls the day over', () => {
    let next = state
    for (let i = 0; i < 3; i++) next = advancePeriod(next)
    expect(next.clock).toEqual({ day: 2, period: 'morning' })
  })

  it('sleeping in a bed restores fully and wakes the next morning', () => {
    const tired = spendEnergy(state, 50)
    const rested = sleep(tired, 'bed')
    expect(rested.player.energy).toBe(state.player.energyMax)
    expect(rested.clock).toEqual({ day: 2, period: 'morning' })
  })

  it('a rough night restores much less than a bed', () => {
    const tired = spendEnergy(state, 50)
    expect(sleep(tired, 'rough').player.energy).toBeLessThan(sleep(tired, 'bed').player.energy)
    expect(sleep(tired, 'couch').player.energy).toBeLessThan(sleep(tired, 'bed').player.energy)
  })
})

describe('progression', () => {
  it('ignores non-positive XP', () => {
    expect(awardSavvy(state, 0)).toBe(state)
    expect(awardSavvy(state, -10)).toBe(state)
  })

  it('levels up once enough is learned', () => {
    const next = awardSavvy(state, xpForNextLevel(1))
    expect(next.player.stats.savvy).toBe(2)
    expect(next.player.stats.savvyXp).toBe(0)
  })

  it('carries leftover XP into the new level', () => {
    const next = awardSavvy(state, xpForNextLevel(1) + 7)
    expect(next.player.stats.savvy).toBe(2)
    expect(next.player.stats.savvyXp).toBe(7)
  })

  it('can cross several levels in one award', () => {
    const next = awardSavvy(state, 10_000)
    expect(next.player.stats.savvy).toBe(10)
    expect(next.player.stats.savvyXp).toBe(0)
  })

  it('raises the energy ceiling as Manha grows', () => {
    const next = awardSavvy(state, xpForNextLevel(1))
    expect(next.player.energyMax).toBeGreaterThan(state.player.energyMax)
  })

  it('never lets current energy exceed a recalculated ceiling', () => {
    const next = awardSavvy(state, xpForNextLevel(1))
    expect(next.player.energy).toBeLessThanOrEqual(next.player.energyMax)
  })

  it('caps affinities at 10 and floors them at 0', () => {
    expect(trainAffinity(state, 'gab', 100).player.stats.gab).toBe(10)
    expect(trainAffinity(state, 'gab', -100).player.stats.gab).toBe(0)
  })

  it('is a no-op when already at the cap', () => {
    const maxed = trainAffinity(state, 'gab', 100)
    expect(trainAffinity(maxed, 'gab', 1)).toBe(maxed)
  })
})
