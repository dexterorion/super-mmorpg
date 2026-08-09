import type { Affinity, Centavos, Period } from '../types.js'
import { PERIODS } from '../types.js'
import { AFFINITY_MAX, SAVVY_MAX, clamp, type GameState, type PlayerStats } from '../state/state.js'

/**
 * Grana, Disposição, Bilhete Único and the clock.
 *
 * Design rule that shapes this whole module: the player can be broke, drained
 * and stranded, and the game still has to move forward. Nothing here can
 * produce a dead end — running out is a setback with a story, never a wall.
 */

export const FARE: Centavos = 520 // R$ 5,20 — one ride
export const TOP_UP_MIN: Centavos = 500

/** Walking instead of paying: cheap in Grana, expensive in everything else. */
export const WALK_ENERGY_COST = 12
export const RIDE_ENERGY_COST = 4

export function assertCentavos(value: number): asserts value is Centavos {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Centavos must be a safe integer, received ${value}`)
  }
}

export function formatMoney(centavos: Centavos): string {
  assertCentavos(centavos)
  const sign = centavos < 0 ? '-' : ''
  const abs = Math.abs(centavos)
  return `${sign}R$ ${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`
}

// --- Money -------------------------------------------------------------

export function canAfford(state: GameState, cost: Centavos): boolean {
  assertCentavos(cost)
  return state.player.money >= cost
}

export function addMoney(state: GameState, delta: Centavos): GameState {
  assertCentavos(delta)
  return {
    ...state,
    player: { ...state.player, money: Math.max(0, state.player.money + delta) },
  }
}

/** Spends money if possible. Returns the original state when it is not. */
export function spendMoney(state: GameState, cost: Centavos): GameState {
  if (!canAfford(state, cost)) return state
  return addMoney(state, -cost)
}

// --- Transit -----------------------------------------------------------

export function canRide(state: GameState, fare: Centavos = FARE): boolean {
  assertCentavos(fare)
  return state.player.transit >= fare
}

export function topUpTransit(state: GameState, amount: Centavos): GameState {
  assertCentavos(amount)
  if (!canAfford(state, amount)) return state
  return {
    ...state,
    player: {
      ...state.player,
      money: state.player.money - amount,
      transit: state.player.transit + amount,
    },
  }
}

export function payFare(state: GameState, fare: Centavos = FARE): GameState {
  if (!canRide(state, fare)) return state
  return {
    ...state,
    player: { ...state.player, transit: state.player.transit - fare },
  }
}

// --- Energy ------------------------------------------------------------

export function spendEnergy(state: GameState, cost: number): GameState {
  return {
    ...state,
    player: {
      ...state.player,
      energy: clamp(state.player.energy - cost, 0, state.player.energyMax),
    },
  }
}

export function restoreEnergy(state: GameState, amount: number): GameState {
  return spendEnergy(state, -amount)
}

export function isExhausted(state: GameState): boolean {
  return state.player.energy <= 0
}

// --- Clock -------------------------------------------------------------

export function nextPeriod(period: Period): { period: Period; rolledOver: boolean } {
  const index = PERIODS.indexOf(period)
  const nextIndex = (index + 1) % PERIODS.length
  return { period: PERIODS[nextIndex]!, rolledOver: nextIndex === 0 }
}

export function periodAt(minuteOfDay: number): Period {
  if (minuteOfDay >= 300 && minuteOfDay < 720) return 'morning'
  if (minuteOfDay >= 720 && minuteOfDay < 1080) return 'afternoon'
  return 'night'
}

export function advanceMinutes(state: GameState, minutes: number): GameState {
  if (!Number.isSafeInteger(minutes) || minutes < 0)
    throw new RangeError(`Minutes must be a non-negative integer, received ${minutes}`)
  const total = state.clock.minuteOfDay + minutes
  const minuteOfDay = total % 1440
  return {
    ...state,
    clock: {
      day: state.clock.day + Math.floor(total / 1440),
      minuteOfDay,
      period: periodAt(minuteOfDay),
    },
  }
}

/** Advances the clock by one period, rolling into the next day at night's end. */
export function advancePeriod(state: GameState): GameState {
  const { period, rolledOver } = nextPeriod(state.clock.period)
  const minuteOfDay = { morning: 360, afternoon: 720, night: 1080 }[period]
  return {
    ...state,
    clock: { day: state.clock.day + (rolledOver ? 1 : 0), period, minuteOfDay },
  }
}

/**
 * Sleeping restores Disposição and jumps to the next morning.
 *
 * `quality` is how good the night was: a real bed in the pensão beats a bench
 * at the rodoviária, and the difference is felt the next day, not moralised
 * about in text.
 */
export function sleep(state: GameState, quality: 'bed' | 'couch' | 'rough' = 'bed'): GameState {
  const recovery = quality === 'bed' ? 1 : quality === 'couch' ? 0.7 : 0.4
  const energy = Math.round(state.player.energyMax * recovery)

  let day = state.clock.day
  // Sleeping in the morning or afternoon still means you wake the next day.
  day += 1

  return {
    ...state,
    clock: { day, period: 'morning', minuteOfDay: 420 },
    player: { ...state.player, energy: clamp(energy, 0, state.player.energyMax) },
  }
}

// --- Progression -------------------------------------------------------

/** XP needed to go from `level` to `level + 1`. Deliberately gentle. */
export function xpForNextLevel(level: number): number {
  return 40 + (level - 1) * 25
}

/**
 * Manha rises by understanding the city. Callers award XP for learning
 * something — a shortcut, a scam, who to ask — never for winning a fight.
 */
export function awardSavvy(state: GameState, xp: number): GameState {
  if (xp <= 0) return state

  let { savvy, savvyXp } = state.player.stats
  savvyXp += xp

  while (savvy < SAVVY_MAX && savvyXp >= xpForNextLevel(savvy)) {
    savvyXp -= xpForNextLevel(savvy)
    savvy += 1
  }
  if (savvy >= SAVVY_MAX) savvyXp = 0

  const stats: PlayerStats = { ...state.player.stats, savvy, savvyXp }
  // Each level of Manha widens what a long day can take out of you.
  const energyMax = 60 + (savvy - 1) * 6

  return {
    ...state,
    player: {
      ...state.player,
      stats,
      energyMax,
      energy: Math.min(state.player.energy, energyMax),
    },
  }
}

export function trainAffinity(state: GameState, affinity: Affinity, delta = 1): GameState {
  const current = state.player.stats[affinity]
  const next = clamp(current + delta, 0, AFFINITY_MAX)
  if (next === current) return state
  return {
    ...state,
    player: { ...state.player, stats: { ...state.player.stats, [affinity]: next } },
  }
}
