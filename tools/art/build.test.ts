import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { art, buildAtlas, palettes } from './build.js'

describe('code-generated art atlas', () => {
  it('contains the required palettes and São Paulo art', () => {
    expect(Object.keys(palettes)).toEqual([
      'sampa-dawn',
      'sampa-day',
      'sampa-dusk',
      'sampa-night',
      'sampa-rain',
    ])
    expect(Object.keys(art)).toEqual(
      expect.arrayContaining([
        'calcada_portuguesa',
        'asfalto_molhado',
        'grafite',
        'poste',
        'banca_jornal',
        'mureta_viaduto',
        'azulejo_pensao',
        'fachada_cantina',
      ])
    )
    expect(Object.keys(art).filter((key) => key.startsWith('portrait_'))).toHaveLength(6)
  })

  it('generates byte-identical output on repeated builds', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'garoa-art-'))
    const first = await buildAtlas(directory)
    const second = await buildAtlas(directory)
    expect(second.png).toEqual(first.png)
    expect(second.json).toBe(first.json)
    expect(await readFile(join(directory, 'atlas.png'))).toEqual(first.png)
    const metadata = JSON.parse(first.json) as {
      frames: Record<string, { frame: object } | undefined>
    }
    expect(metadata.frames.protagonista_down_0?.frame).toBeDefined()
  })
})
