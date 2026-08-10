import type { Centavos, HousingId, NpcId } from '../types.js'
import { assertCentavos } from '../economy/economy.js'
import type { GameState } from '../state/state.js'

export type ChildrenDecision = 'undecided' | 'yes' | 'no'
export type ChildAge = 'baby' | 'child' | 'teen'

export interface Partnership {
  readonly partnerNpcId: NpcId
  readonly status: 'partnered' | 'married'
  readonly startedOnDay: number
  readonly marriedOnDay: number | null
  /** Share of care covered by the partner, from 0 to 1. */
  readonly partnerCareShare: number
}

export interface ChildState {
  readonly id: string
  readonly name: string
  readonly age: ChildAge
  readonly joinedOnDay: number
}

export interface FamilyState {
  readonly partnership: Partnership | null
  readonly childrenDecision: ChildrenDecision
  readonly children: readonly ChildState[]
}

export interface FamilyContext {
  readonly family: FamilyState
  readonly housing: HousingId
  readonly housingComfort: number
  readonly monthlyHouseholdIncome: Centavos
  readonly weeklyWorkHours: number
  readonly commuteMinutesPerDay: number
}

export interface FamilyImpact {
  readonly householdSize: number
  readonly monthlyCareCost: Centavos
  readonly weeklyCareHours: number
  readonly availableWorkHours: number
  readonly careCommuteMinutesPerWeek: number
  readonly housingPressure: number
  readonly moneyPressure: number
  readonly timePressure: number
}

const careByAge: Readonly<
  Record<ChildAge, { monthlyCost: Centavos; weeklyHours: number; trips: number }>
> = {
  baby: { monthlyCost: 74_000, weeklyHours: 42, trips: 10 },
  child: { monthlyCost: 49_000, weeklyHours: 28, trips: 10 },
  teen: { monthlyCost: 38_000, weeklyHours: 14, trips: 6 },
}

const housingCapacity: Readonly<Record<HousingId, number>> = {
  pensao_bixiga: 1,
  kitnet_centro: 2,
  apartamento_zona_leste: 4,
  quarto_guarulhos: 1,
  studio_copan: 2,
}

function clampShare(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function beginPartnership(
  state: GameState,
  partnerNpcId: NpcId,
  partnerCareShare = 0.5
): GameState {
  if (state.family.partnership) return state
  return {
    ...state,
    family: {
      ...state.family,
      partnership: {
        partnerNpcId,
        status: 'partnered',
        startedOnDay: state.clock.day,
        marriedOnDay: null,
        partnerCareShare: clampShare(partnerCareShare),
      },
    },
  }
}

export function marryPartner(state: GameState): GameState {
  const partnership = state.family.partnership
  if (!partnership || partnership.status === 'married') return state
  return {
    ...state,
    family: {
      ...state.family,
      partnership: { ...partnership, status: 'married', marriedOnDay: state.clock.day },
    },
  }
}

export function endPartnership(state: GameState): GameState {
  if (!state.family.partnership) return state
  return { ...state, family: { ...state.family, partnership: null } }
}

export function decideChildren(state: GameState, decision: ChildrenDecision): GameState {
  return { ...state, family: { ...state.family, childrenDecision: decision } }
}

export function welcomeChild(
  state: GameState,
  child: Pick<ChildState, 'id' | 'name'> & Partial<Pick<ChildState, 'age'>>
): GameState {
  if (
    state.family.childrenDecision !== 'yes' ||
    state.family.children.some(({ id }) => id === child.id)
  )
    return state
  return {
    ...state,
    family: {
      ...state.family,
      children: [
        ...state.family.children,
        { id: child.id, name: child.name, age: child.age ?? 'baby', joinedOnDay: state.clock.day },
      ],
    },
  }
}

/** GAROA compresses life stages so they remain visible inside a 365-day playthrough. */
export function advanceFamily(state: GameState): GameState {
  let changed = false
  const children = state.family.children.map((child) => {
    const daysTogether = Math.max(0, state.clock.day - child.joinedOnDay)
    const age: ChildAge = daysTogether >= 180 ? 'teen' : daysTogether >= 30 ? 'child' : 'baby'
    if (age === child.age) return child
    changed = true
    return { ...child, age }
  })
  return changed ? { ...state, family: { ...state.family, children } } : state
}

export function assessFamilyImpact(context: FamilyContext): FamilyImpact {
  assertCentavos(context.monthlyHouseholdIncome)
  const rawCost = context.family.children.reduce(
    (sum, child) => sum + careByAge[child.age].monthlyCost,
    0
  )
  const rawHours = context.family.children.reduce(
    (sum, child) => sum + careByAge[child.age].weeklyHours,
    0
  )
  const trips = context.family.children.reduce((sum, child) => sum + careByAge[child.age].trips, 0)
  const partnerShare = context.family.partnership?.partnerCareShare ?? 0
  const monthlyCareCost = Math.round(rawCost * (1 - partnerShare / 2))
  const weeklyCareHours = Math.round(rawHours * (1 - partnerShare))
  const householdSize = 1 + (context.family.partnership ? 1 : 0) + context.family.children.length
  const availableWorkHours = Math.max(
    0,
    84 - weeklyCareHours - (context.commuteMinutesPerDay * 5) / 60
  )
  const careCommuteMinutesPerWeek = Math.round(trips * context.commuteMinutesPerDay * 0.35)
  const housingPressure =
    Math.max(0, householdSize - housingCapacity[context.housing]) * 4 +
    Math.max(0, 3 - context.housingComfort)
  const moneyPressure = Math.max(
    0,
    Math.round((monthlyCareCost / Math.max(1, context.monthlyHouseholdIncome)) * 10)
  )
  const timePressure = Math.max(
    0,
    Math.round(
      context.weeklyWorkHours + weeklyCareHours + (context.commuteMinutesPerDay * 5) / 60 - 72
    )
  )

  return {
    householdSize,
    monthlyCareCost,
    weeklyCareHours,
    availableWorkHours,
    careCommuteMinutesPerWeek,
    housingPressure,
    moneyPressure,
    timePressure,
  }
}
