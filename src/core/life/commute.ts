import type { Centavos } from '../types.js'

export type TravelMode = 'walk' | 'bike' | 'bus' | 'metro'

export interface CommuteContext {
  readonly referenceMinutes: number
  readonly peak: boolean
  readonly raining: boolean
}

export interface CommuteEstimate {
  readonly mode: TravelMode
  readonly minutes: number
  readonly cost: Centavos
  readonly energy: number
  readonly reliability: number
}

const modes: Readonly<Record<TravelMode, Omit<CommuteEstimate, 'mode' | 'minutes'>>> = {
  walk: { cost: 0, energy: 10, reliability: 0.92 },
  bike: { cost: 0, energy: 6, reliability: 0.86 },
  bus: { cost: 500, energy: 3, reliability: 0.68 },
  metro: { cost: 520, energy: 2, reliability: 0.84 },
}

export function estimateCommute(mode: TravelMode, context: CommuteContext): CommuteEstimate {
  const base = modes[mode]
  const ratio = { walk: 2.35, bike: 0.78, bus: 1.2, metro: 0.88 }[mode]
  const peak = context.peak && (mode === 'bus' || mode === 'metro') ? 1.18 : 1
  const rain = context.raining ? (mode === 'walk' ? 1.22 : mode === 'bike' ? 1.35 : 1.08) : 1
  const rainEnergy = context.raining && (mode === 'walk' || mode === 'bike') ? 3 : 0
  return {
    mode,
    minutes: Math.round(context.referenceMinutes * ratio * peak * rain),
    cost: base.cost,
    energy: base.energy + rainEnergy,
    reliability: Math.max(0, base.reliability - (context.raining ? 0.08 : 0)),
  }
}

export function allCommutes(context: CommuteContext): readonly CommuteEstimate[] {
  return (Object.keys(modes) as TravelMode[]).map((mode) => estimateCommute(mode, context))
}
