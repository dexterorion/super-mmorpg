import type { SaveStorage } from '../core/save/save.js'

export class LocalSaveStorage implements SaveStorage {
  read(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }
  write(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* Safari private mode may reject writes. */
    }
  }
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      /* Storage can be unavailable. */
    }
  }
  keys(): readonly string[] {
    try {
      return Array.from({ length: localStorage.length }, (_, index) =>
        localStorage.key(index)
      ).filter((key): key is string => key !== null)
    } catch {
      return []
    }
  }
}

export interface Clock {
  now(): number
}
export const browserClock: Clock = { now: () => Date.now() }
