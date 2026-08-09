/**
 * Deterministic, seedable RNG (mulberry32).
 *
 * Every random decision in GAROA flows through here. That is what makes a
 * failing playtest reproducible: the harness prints the seed, you replay it,
 * and you get byte-identical behaviour. Never call Math.random() in core.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number
  /** True with the given probability (0..1). */
  chance(probability: number): boolean
  /** Uniform pick. Throws on an empty list — a content bug, not a runtime one. */
  pick<T>(items: readonly T[]): T
  /** Fisher-Yates copy; does not mutate the input. */
  shuffle<T>(items: readonly T[]): T[]
  /** Current internal state, so it can be persisted in a save file. */
  getState(): number
}

const UINT32 = 0x100000000

/** Turns any string into a 32-bit seed, so seeds can be human-readable. */
export function seedFromString(text: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

export function createRng(seed: number | string): Rng {
  let state = (typeof seed === 'string' ? seedFromString(seed) : Math.trunc(seed)) >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / UINT32
  }

  return {
    next,
    int(min, max) {
      if (max < min) throw new RangeError(`int(${min}, ${max}): max must be >= min`)
      return min + Math.floor(next() * (max - min + 1))
    },
    chance(probability) {
      return next() < probability
    },
    pick(items) {
      if (items.length === 0) throw new RangeError('pick() on an empty list')
      return items[Math.floor(next() * items.length)]!
    },
    shuffle(items) {
      const out = [...items]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        const a = out[i]!
        const b = out[j]!
        out[i] = b
        out[j] = a
      }
      return out
    },
    getState() {
      return state
    },
  }
}
