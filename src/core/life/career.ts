import { isFlagTrue, withFlag, type GameState } from '../state/state.js'
import type { ArchetypeId } from '../types.js'

export interface CareerDef {
  readonly id: string
  readonly archetype: ArchetypeId
  readonly occupation: string
  readonly monthlyIncome: number
  readonly weeklyHours: number
  readonly flexibility: number
  readonly workdayMinutes: number
  readonly workdayEnergy: number
}

const startingCareerId: Readonly<Record<ArchetypeId, string>> = {
  pedreiro: 'construction_worker',
  faria_limer: 'finance_analyst',
  artista: 'cultural_producer',
  entregador: 'courier',
  estudante: 'intern',
  saude: 'health_worker',
}

export const careers: Readonly<Record<string, CareerDef>> = {
  construction_worker: career(
    'construction_worker',
    'pedreiro',
    'Construção civil',
    280_000,
    48,
    0.15,
    540,
    14
  ),
  construction_foreman: career(
    'construction_foreman',
    'pedreiro',
    'Mestre de obras',
    380_000,
    46,
    0.22,
    510,
    12
  ),
  finance_analyst: career(
    'finance_analyst',
    'faria_limer',
    'Mercado financeiro',
    850_000,
    52,
    0.35,
    600,
    13
  ),
  compliance_specialist: career(
    'compliance_specialist',
    'faria_limer',
    'Compliance financeiro',
    950_000,
    48,
    0.4,
    540,
    11
  ),
  cultural_producer: career(
    'cultural_producer',
    'artista',
    'Produção cultural',
    190_000,
    38,
    0.65,
    420,
    9
  ),
  cultural_coordinator: career(
    'cultural_coordinator',
    'artista',
    'Coordenação cultural',
    280_000,
    40,
    0.58,
    450,
    10
  ),
  courier: career('courier', 'entregador', 'Entrega por aplicativo', 240_000, 50, 0.45, 540, 15),
  logistics_coordinator: career(
    'logistics_coordinator',
    'entregador',
    'Logística urbana',
    330_000,
    44,
    0.5,
    480,
    11
  ),
  intern: career('intern', 'estudante', 'Estudo e estágio', 120_000, 24, 0.7, 360, 7),
  junior_analyst: career(
    'junior_analyst',
    'estudante',
    'Analista júnior',
    260_000,
    40,
    0.45,
    480,
    10
  ),
  health_worker: career('health_worker', 'saude', 'Saúde', 480_000, 48, 0.2, 540, 14),
  health_coordinator: career(
    'health_coordinator',
    'saude',
    'Coordenação de UBS',
    620_000,
    44,
    0.28,
    510,
    12
  ),
}

const nextCareer: Readonly<Record<string, string>> = {
  construction_worker: 'construction_foreman',
  finance_analyst: 'compliance_specialist',
  cultural_producer: 'cultural_coordinator',
  courier: 'logistics_coordinator',
  intern: 'junior_analyst',
  health_worker: 'health_coordinator',
}

function career(
  id: string,
  archetype: ArchetypeId,
  occupation: string,
  monthlyIncome: number,
  weeklyHours: number,
  flexibility: number,
  workdayMinutes: number,
  workdayEnergy: number
): CareerDef {
  return {
    id,
    archetype,
    occupation,
    monthlyIncome,
    weeklyHours,
    flexibility,
    workdayMinutes,
    workdayEnergy,
  }
}

export function currentCareer(state: GameState): CareerDef {
  const selected = state.flags['career:current']
  const id = typeof selected === 'string' ? selected : startingCareerId[state.player.archetype]
  return careers[id] ?? careers[startingCareerId[state.player.archetype]]!
}

export function availableCareerMove(state: GameState): CareerDef | undefined {
  const targetId = nextCareer[currentCareer(state).id]
  if (!targetId || isFlagTrue(state, `career:completed:${targetId}`)) return undefined
  return careers[targetId]
}

export function canAdvanceCareer(state: GameState): boolean {
  return (
    availableCareerMove(state) !== undefined &&
    Number(state.flags['career:work-days'] ?? 0) >= 60 &&
    state.education?.status === 'completed'
  )
}

export function advanceCareer(state: GameState): GameState {
  const previous = currentCareer(state)
  const target = availableCareerMove(state)
  if (!target || !canAdvanceCareer(state)) return state
  let next = withFlag(state, 'career:current', target.id)
  next = withFlag(next, `career:completed:${target.id}`, true)
  return {
    ...next,
    player: {
      ...next.player,
      occupation: target.occupation,
      monthlyIncome: next.player.monthlyIncome + target.monthlyIncome - previous.monthlyIncome,
    },
  }
}
