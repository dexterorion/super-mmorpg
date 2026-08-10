export const CITY_MAP_WIDTH = 24
export const CITY_MAP_HEIGHT = 15

export interface MapTile {
  readonly x: number
  readonly y: number
  readonly frame: number
  readonly depth?: number
}

export interface CollisionRect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface CityMap {
  readonly id: CityMapId
  readonly landmark: string
  readonly tiles: readonly MapTile[]
  readonly collisions: readonly CollisionRect[]
}

export type CityMapId =
  | 'tiete'
  | 'centro'
  | 'bixiga'
  | 'liberdade'
  | 'paulista'
  | 'zona_leste'
  | 'minhocao'
  | 'ibirapuera'

const frame = (column: number, row: number): number => row * 27 + column
const tile = (x: number, y: number, column: number, row: number, depth = 0): MapTile => ({
  x,
  y,
  frame: frame(column, row),
  depth,
})

function ground(a: readonly [number, number], b: readonly [number, number]): MapTile[] {
  return Array.from({ length: CITY_MAP_WIDTH * CITY_MAP_HEIGHT }, (_, index) => {
    const x = index % CITY_MAP_WIDTH
    const y = Math.floor(index / CITY_MAP_WIDTH)
    const [column, row] = (x + y) % 4 === 0 ? b : a
    return tile(x, y, column, row)
  })
}

function road(horizontalY: number): MapTile[] {
  return Array.from({ length: CITY_MAP_WIDTH }, (_, x) =>
    tile(x, horizontalY, x % 6 === 0 ? 1 : 4, 17, 1)
  )
}

function building(x: number, y: number, width: number, height: number, variant = 0): MapTile[] {
  const columnOffset = variant % 2 === 0 ? 0 : 8
  return Array.from({ length: width * height }, (_, index) => {
    const localX = index % width
    const localY = Math.floor(index / width)
    const onLeft = localX === 0
    const onRight = localX === width - 1
    const column = columnOffset + (onLeft ? 0 : onRight ? 7 : 1 + (localX % 2))
    const row = localY === 0 ? 3 : localY === height - 1 ? 5 : 4
    return tile(x + localX, y + localY, column, row, 2)
  })
}

function trees(points: readonly (readonly [number, number])[], autumn = false): MapTile[] {
  return points.map(([x, y], index) => tile(x, y, 16 + (index % 2), autumn ? 12 : 9, 3))
}

function parkedCars(y: number, frames: readonly number[]): MapTile[] {
  return frames.map((carFrame, index) => ({
    x: 3 + index * 4,
    y,
    frame: carFrame,
    depth: 3,
  }))
}

const layouts: Readonly<Record<CityMapId, CityMap>> = {
  tiete: {
    id: 'tiete',
    landmark: 'RODOVIÁRIA · METRÔ',
    tiles: [
      ...ground([9, 1], [10, 1]),
      ...road(11),
      ...building(1, 1, 7, 5),
      ...building(16, 1, 7, 5, 1),
      ...parkedCars(10, [422, 425, 426, 476, 480]),
      tile(10, 2, 5, 7, 3),
      tile(13, 2, 6, 7, 3),
    ],
    collisions: [
      { x: 1, y: 1, width: 7, height: 5 },
      { x: 16, y: 1, width: 7, height: 5 },
    ],
  },
  centro: {
    id: 'centro',
    landmark: 'CENTRO · VALE DO ANHANGABAÚ',
    tiles: [
      ...ground([9, 1], [10, 1]),
      ...road(10),
      ...building(1, 1, 6, 7),
      ...building(9, 1, 6, 5, 1),
      ...building(17, 1, 6, 7),
      ...trees([
        [8, 8],
        [15, 8],
      ]),
    ],
    collisions: [
      { x: 1, y: 1, width: 6, height: 7 },
      { x: 9, y: 1, width: 6, height: 5 },
      { x: 17, y: 1, width: 6, height: 7 },
    ],
  },
  bixiga: {
    id: 'bixiga',
    landmark: 'BIXIGA · CANTINAS',
    tiles: [
      ...ground([1, 4], [2, 4]),
      ...road(10),
      ...building(1, 2, 8, 5, 1),
      ...building(15, 1, 8, 6),
      ...trees(
        [
          [10, 3],
          [13, 5],
          [10, 8],
        ],
        true
      ),
      tile(11, 9, 8, 9, 3),
    ],
    collisions: [
      { x: 1, y: 2, width: 8, height: 5 },
      { x: 15, y: 1, width: 8, height: 6 },
    ],
  },
  liberdade: {
    id: 'liberdade',
    landmark: 'LIBERDADE · 東洋街',
    tiles: [
      ...ground([9, 1], [10, 1]),
      ...road(10),
      ...building(1, 1, 7, 6),
      ...building(16, 1, 7, 6, 1),
      ...[3, 6, 9, 12, 15, 18, 21].map((x) => tile(x, 8, 25, 8, 3)),
      ...parkedCars(11, [422, 426, 476]),
    ],
    collisions: [
      { x: 1, y: 1, width: 7, height: 6 },
      { x: 16, y: 1, width: 7, height: 6 },
    ],
  },
  paulista: {
    id: 'paulista',
    landmark: 'AV. PAULISTA · MASP',
    tiles: [
      ...ground([9, 4], [10, 4]),
      ...road(11),
      ...building(1, 1, 6, 7),
      ...building(17, 1, 6, 7, 1),
      ...Array.from({ length: 8 }, (_, x) => tile(8 + x, 4, 16 + (x % 7), 0, 2)),
      ...trees([
        [8, 9],
        [11, 9],
        [14, 9],
      ]),
      ...parkedCars(12, [422, 425, 476, 480]),
    ],
    collisions: [
      { x: 1, y: 1, width: 6, height: 7 },
      { x: 17, y: 1, width: 6, height: 7 },
      { x: 8, y: 4, width: 8, height: 1 },
    ],
  },
  zona_leste: {
    id: 'zona_leste',
    landmark: 'ZONA LESTE · RADIAL',
    tiles: [
      ...ground([9, 1], [10, 1]),
      ...road(9),
      ...road(10),
      ...building(1, 1, 6, 5),
      ...building(17, 2, 6, 5, 1),
      ...parkedCars(8, [422, 426, 476, 480]),
      ...Array.from({ length: CITY_MAP_WIDTH }, (_, x) => tile(x, 12, 5 + (x % 3), 0, 1)),
    ],
    collisions: [
      { x: 1, y: 1, width: 6, height: 5 },
      { x: 17, y: 2, width: 6, height: 5 },
    ],
  },
  minhocao: {
    id: 'minhocao',
    landmark: 'MINHOCÃO · ELEVADO',
    tiles: [
      ...ground([4, 17], [4, 17]),
      ...Array.from({ length: CITY_MAP_WIDTH }, (_, x) => tile(x, 4, 3 + (x % 4), 13, 2)),
      ...Array.from({ length: CITY_MAP_WIDTH }, (_, x) => tile(x, 8, 9, 5, 1)),
      ...trees([
        [3, 2],
        [8, 2],
        [15, 2],
        [20, 2],
      ]),
      tile(6, 10, 6, 12, 3),
      tile(17, 10, 8, 12, 3),
    ],
    collisions: [{ x: 0, y: 0, width: 24, height: 3 }],
  },
  ibirapuera: {
    id: 'ibirapuera',
    landmark: 'IBIRAPUERA · MARQUISE',
    tiles: [
      ...ground([1, 4], [2, 4]),
      ...Array.from({ length: 12 }, (_, x) => tile(6 + x, 5, 16 + (x % 7), 3, 2)),
      ...trees([
        [1, 2],
        [4, 3],
        [20, 2],
        [22, 5],
        [2, 8],
        [21, 9],
        [5, 11],
        [18, 11],
      ]),
      ...Array.from({ length: 16 }, (_, x) => tile(4 + x, 10, 5 + (x % 3), 4, 1)),
    ],
    collisions: [{ x: 6, y: 5, width: 12, height: 1 }],
  },
}

export function cityMapFor(district: string): CityMap {
  return layouts[district as CityMapId] ?? layouts.tiete
}

export const cityMaps = layouts
