import { describe, expect, it } from 'vitest'
import { canMoveHousing, moveHousing, type HousingOption } from './housing.js'
import { createInitialState } from '../state/state.js'

const option: HousingOption = {
  id: 'quarto_guarulhos',
  name: 'Quarto em Guarulhos',
  monthlyRent: 72_000,
  commuteMinutes: 108,
}

describe('housing changes', () => {
  it('charges one rent as moving cost and updates recurring rent', () => {
    const base = createInitialState({ name: 'Jaci', hometown: 'prudente', seed: 7 })
    const state = {
      ...base,
      clock: { ...base.clock, day: 30 },
      player: { ...base.player, money: 200_000 },
    }
    expect(canMoveHousing(state, option)).toBe(true)
    const moved = moveHousing(state, option)
    expect(moved.player).toMatchObject({
      housing: 'quarto_guarulhos',
      monthlyRent: 72_000,
      money: 128_000,
    })
    expect(moveHousing(moved, { ...option, id: 'studio_copan' })).toBe(moved)
  })

  it('blocks moving before day 30 or without the moving cost', () => {
    const state = createInitialState({ name: 'Jaci', hometown: 'prudente', seed: 7 })
    expect(canMoveHousing(state, option)).toBe(false)
    expect(moveHousing(state, option)).toBe(state)
  })
})
