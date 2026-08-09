import type { ArchetypeId, Centavos } from '../types.js'
import { addMoney, awardSavvy, trainAffinity } from '../economy/economy.js'
import type { GameState } from '../state/state.js'

export type EducationPathId =
  'eja' | 'technical' | 'public_college' | 'private_college' | 'free_course'

export interface EducationPath {
  readonly id: EducationPathId
  readonly name: string
  readonly weeklyClassHours: number
  readonly weeklyStudyHours: number
  readonly monthlyCost: Centavos
  readonly durationMonths: number
  readonly completionDescription: string
}

export interface EducationEnrollment {
  readonly pathId: EducationPathId
  readonly status: 'active' | 'completed'
  readonly enrolledOnDay: number
  readonly lastProgressDay: number
  readonly completedMonths: number
}

export interface EducationContext {
  readonly archetype: ArchetypeId
  readonly monthlyDisposableIncome: Centavos
  readonly weeklyWorkHours: number
  readonly commuteMinutesPerDay: number
  /** 0 means fixed shifts; 1 means freely rearrangeable time. */
  readonly scheduleFlexibility: number
}

export interface EducationAssessment {
  readonly path: EducationPath
  /** Education is a right in GAROA; no archetype can remove the option. */
  readonly available: true
  readonly weeklyHoursRequired: number
  readonly monthlyCost: Centavos
  readonly timePressure: number
  readonly moneyPressure: number
  readonly accessDifficulty: number
  readonly feasibleNow: boolean
}

export const educationPaths: Readonly<Record<EducationPathId, EducationPath>> = {
  eja: {
    id: 'eja',
    name: 'EJA noturno',
    weeklyClassHours: 12,
    weeklyStudyHours: 4,
    monthlyCost: 0,
    durationMonths: 24,
    completionDescription: '+1 Lábia e +60 XP de Manha',
  },
  technical: {
    id: 'technical',
    name: 'Curso técnico',
    weeklyClassHours: 16,
    weeklyStudyHours: 6,
    monthlyCost: 18_000,
    durationMonths: 18,
    completionDescription: '+1 Fôlego e +R$ 400/mês de renda',
  },
  public_college: {
    id: 'public_college',
    name: 'Faculdade pública',
    weeklyClassHours: 20,
    weeklyStudyHours: 14,
    monthlyCost: 8_000,
    durationMonths: 48,
    completionDescription: '+2 Faro, +120 XP de Manha e +R$ 1.000/mês de renda',
  },
  private_college: {
    id: 'private_college',
    name: 'Faculdade particular',
    weeklyClassHours: 16,
    weeklyStudyHours: 10,
    monthlyCost: 72_000,
    durationMonths: 48,
    completionDescription: '+2 Lábia, +80 XP de Manha e +R$ 1.200/mês de renda',
  },
  free_course: {
    id: 'free_course',
    name: 'Curso livre',
    weeklyClassHours: 4,
    weeklyStudyHours: 3,
    monthlyCost: 9_000,
    durationMonths: 3,
    completionDescription: '+1 Faro e +35 XP de Manha',
  },
}

const archetypeLoad: Readonly<Record<ArchetypeId, number>> = {
  pedreiro: 5,
  faria_limer: 4,
  artista: 2,
  entregador: 5,
  estudante: 0,
  saude: 5,
}

export function assessEducation(
  pathId: EducationPathId,
  context: EducationContext
): EducationAssessment {
  const path = educationPaths[pathId]
  const weeklyHoursRequired = path.weeklyClassHours + path.weeklyStudyHours
  const commuteHours = (context.commuteMinutesPerDay * 5) / 60
  const committedHours = context.weeklyWorkHours + commuteHours + weeklyHoursRequired
  const flexibilityPenalty = Math.round((1 - context.scheduleFlexibility) * 10)
  const timePressure = Math.max(0, Math.round(committedHours - 72)) + flexibilityPenalty
  const moneyPressure =
    path.monthlyCost === 0
      ? 0
      : Math.max(
          0,
          Math.round((path.monthlyCost / Math.max(1, context.monthlyDisposableIncome)) * 10)
        )
  const accessDifficulty = timePressure + moneyPressure + archetypeLoad[context.archetype]

  return {
    path,
    available: true,
    weeklyHoursRequired,
    monthlyCost: path.monthlyCost,
    timePressure,
    moneyPressure,
    accessDifficulty,
    feasibleNow: timePressure <= 10 && moneyPressure <= 10,
  }
}

export function allEducationAssessments(context: EducationContext): readonly EducationAssessment[] {
  return (Object.keys(educationPaths) as EducationPathId[]).map((id) =>
    assessEducation(id, context)
  )
}

/** Enrollment is a player choice, never an archetype gate. Costs are charged as months pass. */
export function enrollInEducation(state: GameState, pathId: EducationPathId): GameState {
  if (state.education?.status === 'active') return state
  return {
    ...state,
    education: {
      pathId,
      status: 'active',
      enrolledOnDay: state.clock.day,
      lastProgressDay: state.clock.day,
      completedMonths: 0,
    },
  }
}

/** Applies every full 30-day study cycle crossed since the previous reconciliation. */
export function advanceEducation(state: GameState): GameState {
  const enrollment = state.education
  if (enrollment?.status !== 'active') return state

  const elapsedDays = state.clock.day - enrollment.lastProgressDay
  const elapsedMonths = Math.floor(elapsedDays / 30)
  if (elapsedMonths < 1) return state

  const path = educationPaths[enrollment.pathId]
  const monthsToComplete = path.durationMonths - enrollment.completedMonths
  const progressedMonths = Math.min(elapsedMonths, monthsToComplete)
  let next = addMoney(state, -path.monthlyCost * progressedMonths)
  const completedMonths = enrollment.completedMonths + progressedMonths
  const completed = completedMonths >= path.durationMonths
  next = {
    ...next,
    education: {
      ...enrollment,
      status: completed ? 'completed' : 'active',
      completedMonths,
      lastProgressDay: enrollment.lastProgressDay + progressedMonths * 30,
    },
  }
  return completed ? applyCompletionEffects(next, enrollment.pathId) : next
}

function applyCompletionEffects(state: GameState, pathId: EducationPathId): GameState {
  switch (pathId) {
    case 'eja':
      return awardSavvy(trainAffinity(state, 'gab'), 60)
    case 'technical':
      return withMonthlyIncome(trainAffinity(state, 'grit'), 40_000)
    case 'public_college':
      return withMonthlyIncome(awardSavvy(trainAffinity(state, 'instinct', 2), 120), 100_000)
    case 'private_college':
      return withMonthlyIncome(awardSavvy(trainAffinity(state, 'gab', 2), 80), 120_000)
    case 'free_course':
      return awardSavvy(trainAffinity(state, 'instinct'), 35)
  }
}

function withMonthlyIncome(state: GameState, delta: Centavos): GameState {
  return {
    ...state,
    player: { ...state.player, monthlyIncome: state.player.monthlyIncome + delta },
  }
}
