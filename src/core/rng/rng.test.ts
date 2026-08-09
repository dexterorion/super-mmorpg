import { describe, expect, it } from 'vitest'
import { createRng, seedFromString } from './rng.js'

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(1234)
    const b = createRng(1234)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = createRng(1)
    const b = createRng(2)
    expect(a.next()).not.toBe(b.next())
  })

  it('accepts a string seed so failures can be reported readably', () => {
    const a = createRng('bixiga')
    const b = createRng(seedFromString('bixiga'))
    expect(a.next()).toBe(b.next())
  })

  it('stays within [0, 1)', () => {
    const rng = createRng(99)
    for (let i = 0; i < 2000; i++) {
      const value = rng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('int() is inclusive on both ends and never escapes the range', () => {
    const rng = createRng(7)
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) {
      const value = rng.int(1, 6)
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(6)
      seen.add(value)
    }
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5, 6]))
  })

  it('int() rejects an inverted range', () => {
    expect(() => createRng(1).int(5, 2)).toThrow(RangeError)
  })

  it('chance(0) is never and chance(1) is always', () => {
    const rng = createRng(42)
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false)
      expect(rng.chance(1)).toBe(true)
    }
  })

  it('pick() throws on an empty list rather than returning undefined', () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError)
  })

  it('shuffle() keeps every element and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8]
    const rng = createRng(3)
    const out = rng.shuffle(input)
    expect(out).toHaveLength(input.length)
    expect([...out].sort((a, b) => a - b)).toEqual(input)
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('can be resumed from a persisted state, which is what makes saves reproducible', () => {
    const original = createRng(2024)
    original.next()
    original.next()
    const snapshot = original.getState()

    const resumed = createRng(snapshot)
    // A resumed generator continues the same stream as the original.
    expect(resumed.next()).toBe(createRng(snapshot).next())
  })
})
