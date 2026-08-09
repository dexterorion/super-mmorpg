import type { ArchetypeId, Centavos } from '../types.js'

export type EducationPathId =
  'eja' | 'technical' | 'public_college' | 'private_college' | 'free_course'

export interface EducationPath {
  readonly id: EducationPathId
  readonly name: string
  readonly weeklyClassHours: number
  readonly weeklyStudyHours: number
  readonly monthlyCost: Centavos
  readonly durationMonths: number
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
  },
  technical: {
    id: 'technical',
    name: 'Curso técnico',
    weeklyClassHours: 16,
    weeklyStudyHours: 6,
    monthlyCost: 18_000,
    durationMonths: 18,
  },
  public_college: {
    id: 'public_college',
    name: 'Faculdade pública',
    weeklyClassHours: 20,
    weeklyStudyHours: 14,
    monthlyCost: 8_000,
    durationMonths: 48,
  },
  private_college: {
    id: 'private_college',
    name: 'Faculdade particular',
    weeklyClassHours: 16,
    weeklyStudyHours: 10,
    monthlyCost: 72_000,
    durationMonths: 48,
  },
  free_course: {
    id: 'free_course',
    name: 'Curso livre',
    weeklyClassHours: 4,
    weeklyStudyHours: 3,
    monthlyCost: 9_000,
    durationMonths: 3,
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
