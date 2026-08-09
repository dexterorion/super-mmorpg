import { describe, expect, it } from 'vitest'
import { CITY_MAP_HEIGHT, CITY_MAP_WIDTH, cityMapFor, cityMaps } from './cityMaps.js'

describe('modular city maps', () => {
  it('defines a distinct deterministic layout for every campaign district', () => {
    expect(Object.keys(cityMaps)).toEqual([
      'tiete',
      'centro',
      'bixiga',
      'liberdade',
      'paulista',
      'zona_leste',
      'minhocao',
      'ibirapuera',
    ])
    expect(new Set(Object.values(cityMaps).map((map) => JSON.stringify(map.tiles))).size).toBe(8)
    expect(cityMapFor('centro')).toBe(cityMapFor('centro'))
  })

  it('keeps every tile and collision inside the playable grid', () => {
    for (const map of Object.values(cityMaps)) {
      expect(map.tiles.length).toBeGreaterThanOrEqual(CITY_MAP_WIDTH * CITY_MAP_HEIGHT)
      for (const tile of map.tiles) {
        expect(tile.x).toBeGreaterThanOrEqual(0)
        expect(tile.y).toBeGreaterThanOrEqual(0)
        expect(tile.x).toBeLessThan(CITY_MAP_WIDTH)
        expect(tile.y).toBeLessThan(CITY_MAP_HEIGHT)
      }
      for (const collision of map.collisions) {
        expect(collision.x + collision.width).toBeLessThanOrEqual(CITY_MAP_WIDTH)
        expect(collision.y + collision.height).toBeLessThanOrEqual(CITY_MAP_HEIGHT)
        const containsPlayerSpawn =
          collision.x <= CITY_MAP_WIDTH / 2 &&
          collision.x + collision.width > CITY_MAP_WIDTH / 2 &&
          collision.y <= CITY_MAP_HEIGHT * 0.8 &&
          collision.y + collision.height > CITY_MAP_HEIGHT * 0.8
        expect(containsPlayerSpawn).toBe(false)
      }
    }
  })

  it('falls back to Tietê for unknown content districts', () => {
    expect(cityMapFor('unknown')).toBe(cityMaps.tiete)
  })
})
