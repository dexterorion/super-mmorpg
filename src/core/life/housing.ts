import { addMoney } from '../economy/economy.js'
import { isFlagTrue, withFlag, type GameState } from '../state/state.js'
import type { Centavos, HousingId } from '../types.js'

export interface HousingOption {
  readonly id: HousingId
  readonly name: string
  readonly monthlyRent: Centavos
  readonly commuteMinutes: number
}

export function movingCost(option: HousingOption): Centavos {
  return option.monthlyRent
}

export function canMoveHousing(state: GameState, option: HousingOption): boolean {
  return (
    state.clock.day >= 30 &&
    state.player.housing !== option.id &&
    !isFlagTrue(state, `housing:moved:${state.clock.day}`) &&
    state.player.money >= movingCost(option)
  )
}

export function moveHousing(state: GameState, option: HousingOption): GameState {
  if (!canMoveHousing(state, option)) return state
  let next = addMoney(state, -movingCost(option))
  next = withFlag(next, `housing:moved:${state.clock.day}`, true)
  return {
    ...next,
    player: {
      ...next.player,
      housing: option.id,
      monthlyRent: option.monthlyRent,
    },
  }
}
