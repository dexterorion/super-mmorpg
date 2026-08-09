import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { globSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('core architecture', () => {
  it('remains independent from Phaser and browser globals', () => {
    const forbidden = [
      /from\s+['"]phaser['"]/,
      /\bdocument\s*\./,
      /\bwindow\s*\./,
      /\blocalStorage\b/,
    ]
    const violations: string[] = []

    for (const relative of globSync('src/core/**/*.ts', { exclude: ['**/*.test.ts'] })) {
      const source = readFileSync(join(process.cwd(), relative), 'utf8')
      for (const pattern of forbidden) {
        if (pattern.test(source)) violations.push(`${relative}: ${pattern.source}`)
      }
    }

    expect(violations).toEqual([])
  })
})
