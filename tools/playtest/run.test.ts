import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'

describe('headless playtest', () => {
  it('completes all four campaign endings', () => {
    for (const horizonte of ['entrar', 'recusar']) {
      for (const val of ['fica', 'vai']) {
        expect(() =>
          execFileSync(
            process.execPath,
            [
              '--import',
              'tsx',
              'tools/playtest/run.ts',
              '--runs',
              '2',
              '--seed',
              '7',
              '--horizonte',
              horizonte,
              '--val',
              val,
            ],
            { stdio: 'pipe' }
          )
        ).not.toThrow()
      }
    }
  })
})
