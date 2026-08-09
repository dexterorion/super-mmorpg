import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

export const palettes = {
  'sampa-dawn': [
    '#17152b',
    '#342447',
    '#65405c',
    '#a96062',
    '#e59b71',
    '#ffd59a',
    '#483d58',
    '#776071',
    '#a38a8a',
    '#d9beb0',
    '#293a51',
    '#416477',
    '#6b9290',
    '#a9c4ad',
    '#d5ddbb',
    '#f6ecd1',
  ],
  'sampa-day': [
    '#18202b',
    '#303c4a',
    '#536675',
    '#82929b',
    '#bbc3bd',
    '#f0eadb',
    '#442d2f',
    '#794543',
    '#b56555',
    '#db9772',
    '#214a48',
    '#347068',
    '#57a17f',
    '#8fc898',
    '#d5dda5',
    '#f3c969',
  ],
  'sampa-dusk': [
    '#171629',
    '#33213d',
    '#633655',
    '#9a4f5e',
    '#d97963',
    '#f7b176',
    '#292f46',
    '#485270',
    '#727797',
    '#aca0ad',
    '#31504e',
    '#4f7867',
    '#7da37b',
    '#b8c58d',
    '#e4d29d',
    '#ffe3ad',
  ],
  'sampa-night': [
    '#0b1020',
    '#141b31',
    '#202b47',
    '#304267',
    '#466083',
    '#6883a0',
    '#2b263d',
    '#4b3b56',
    '#735671',
    '#a57887',
    '#24505d',
    '#347584',
    '#55a3a2',
    '#87c5b5',
    '#d0dec2',
    '#f2e3ad',
  ],
  'sampa-rain': [
    '#101923',
    '#1e2a36',
    '#304252',
    '#4b6070',
    '#718493',
    '#a7b2b5',
    '#2b303b',
    '#48505c',
    '#68727e',
    '#929ba2',
    '#264b52',
    '#3e6970',
    '#638c8d',
    '#91b0a9',
    '#c5d0bd',
    '#e8e0c5',
  ],
} as const

type PaletteName = keyof typeof palettes
interface ArtDef {
  readonly pixels: string
  readonly palette?: PaletteName
  readonly scale?: number
}

const tile = (rows: readonly string[]): string => rows.join('\n')
const checker = (a: string, b: string): string =>
  tile(
    Array.from({ length: 16 }, (_, y) =>
      Array.from({ length: 16 }, (_, x) => ((x + y) % 4 < 2 ? a : b)).join('')
    )
  )

export const art: Readonly<Record<string, ArtDef>> = {
  calcada_portuguesa: { pixels: checker('4', 'e') },
  asfalto_molhado: {
    pixels: tile(
      Array.from({ length: 16 }, (_, y) => (y % 5 === 0 ? '1111771111111a11' : '1111111111111111'))
    ),
  },
  grafite: {
    pixels: tile([
      '6666666666666666',
      '6666bb666b666666',
      '66bbb6bbbbb66666',
      '6b666bb666bb6666',
      '6b66bb66666b6666',
      '66bbb6bbbbbb6666',
      '6666666666666666',
      ...Array.from({ length: 9 }, () => '7777777777777777'),
    ]),
  },
  poste: {
    pixels: tile(
      Array.from({ length: 16 }, (_, y) => (y < 3 ? '.....888888.....' : '.......88.......'))
    ),
  },
  banca_jornal: {
    pixels: tile([
      '....77777777....',
      '...7999999997...',
      '..777777777777..',
      ...Array.from({ length: 9 }, () => '..7bcbcbcbcb7...'),
      '..777777777777..',
      '..77........77..',
      '..77........77..',
      '..77........77..',
    ]),
  },
  mureta_viaduto: {
    pixels: tile(
      Array.from({ length: 16 }, (_, y) =>
        y < 3 ? '5555555555555555' : y < 12 ? '4444544445444454' : '2222222222222222'
      )
    ),
  },
  azulejo_pensao: { pixels: checker('5', 'c') },
  fachada_cantina: {
    pixels: tile(
      Array.from({ length: 16 }, (_, y) =>
        y < 3 ? '7777777777777777' : y < 12 ? '7666999966666667' : '7777777777777777'
      )
    ),
  },
}

for (const key of [
  'calcada_portuguesa',
  'asfalto_molhado',
  'grafite',
  'poste',
  'banca_jornal',
  'mureta_viaduto',
  'azulejo_pensao',
  'fachada_cantina',
]) {
  const definition = art[key]
  if (definition) (art as Record<string, ArtDef>)[key] = { ...definition, scale: 2 }
}

const people = ['protagonista', 'ajudante', 'seu_jorge', 'dona_cida', 'yumi', 'tico'] as const
const directions = ['down', 'left', 'right', 'up'] as const
for (const [personIndex, person] of people.entries()) {
  for (const direction of directions)
    for (let frame = 0; frame < 2; frame += 1) {
      const color = (((personIndex + 7) % 15) + 1).toString(16)
      const rows = Array.from({ length: 16 }, (_, y) =>
        Array.from({ length: 16 }, (_, x) => {
          if (y < 2 || x < 3 || x > 12) return '.'
          if (y === 2) return x > 5 && x < 10 ? '2' : '.'
          if (y < 7) {
            if (x < 5 || x > 10) return '.'
            if (y === 3 || x === 5 || x === 10) return '2'
            if (direction === 'down' && y === 5 && (x === 6 || x === 9)) return '1'
            return 'e'
          }
          if (y < 12) return x > 4 && x < 11 ? color : y < 10 && (x === 3 || x === 12) ? 'e' : '.'
          if (y > 14) return '.'
          const movingLeft = frame === 0 ? x > 4 && x < 7 : x > 5 && x < 8
          const movingRight = frame === 0 ? x > 8 && x < 11 : x > 7 && x < 10
          return movingLeft || movingRight ? '2' : '.'
        }).join('')
      )
      ;(art as Record<string, ArtDef>)[`${person}_${direction}_${frame}`] = { pixels: tile(rows) }
    }
  ;(art as Record<string, ArtDef>)[`portrait_${person}`] = {
    pixels: portrait(((personIndex + 7) % 15) + 1),
    scale: 2,
  }
}

function portrait(color: number): string {
  const ink = color.toString(16)
  return tile(
    Array.from({ length: 16 }, (_, y) =>
      Array.from({ length: 16 }, (_, x) => {
        const dx = x - 7.5
        const dy = y - 7.5
        if (dx * dx + dy * dy > 48) return '.'
        if ((y === 7 && (x === 5 || x === 10)) || (y === 11 && x > 5 && x < 10)) return '1'
        return ink
      }).join('')
    )
  )
}

function rgba(hex: string): readonly [number, number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
    255,
  ]
}

export async function buildAtlas(
  outputDirectory = fileURLToPath(new URL('../../public', import.meta.url))
): Promise<{ png: Buffer; json: string }> {
  const entries = Object.entries(art).sort(([a], [b]) => a.localeCompare(b))
  const cell = 32
  const columns = 8
  const rows = Math.ceil(entries.length / columns)
  const png = new PNG({ width: columns * cell, height: rows * cell, colorType: 6 })
  png.data.fill(0)
  const frames: Record<string, object> = {}
  for (const [index, [name, def]] of entries.entries()) {
    const source = def.pixels
      .trim()
      .split(/\n/)
      .map((row) => row.trim())
    const scale = def.scale ?? 1
    const ox = (index % columns) * cell
    const oy = Math.floor(index / columns) * cell
    const palette = palettes[def.palette ?? 'sampa-day']
    for (const [y, row] of source.entries())
      for (const [x, char] of [...row].entries()) {
        if (char === '.') continue
        const color = rgba(palette[Number.parseInt(char, 16)] ?? palette[0])
        for (let sy = 0; sy < scale; sy += 1)
          for (let sx = 0; sx < scale; sx += 1) {
            const offset = ((oy + y * scale + sy) * png.width + ox + x * scale + sx) * 4
            png.data.set(color, offset)
          }
      }
    frames[name] = {
      frame: { x: ox, y: oy, w: cell, h: cell },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: cell, h: cell },
      sourceSize: { w: cell, h: cell },
    }
  }
  const buffer = PNG.sync.write(png, { colorType: 6, inputColorType: 6, deflateLevel: 9 })
  const json = `${JSON.stringify({ frames, meta: { app: 'GAROA code art', version: '1', image: 'atlas.png', format: 'RGBA8888', size: { w: png.width, h: png.height }, scale: '1', hash: createHash('sha256').update(buffer).digest('hex') } }, null, 2)}\n`
  await mkdir(outputDirectory, { recursive: true })
  await writeFile(`${outputDirectory}/atlas.png`, buffer)
  await writeFile(`${outputDirectory}/atlas.json`, json)
  return { png: buffer, json }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await buildAtlas()
