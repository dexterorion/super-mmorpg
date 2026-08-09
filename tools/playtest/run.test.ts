import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'

describe('headless playtest', () => {
  it('completes the scripted Act 1 route', () => {
    expect(() =>
      execFileSync(
        process.execPath,
        ['--import', 'tsx', 'tools/playtest/run.ts', '--runs', '2', '--seed', '7'],
        { stdio: 'pipe' }
      )
    ).not.toThrow()
  })
})
