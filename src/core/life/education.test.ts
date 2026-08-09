import { describe, expect, it } from 'vitest'
import type { ArchetypeId } from '../types.js'
import { allEducationAssessments, assessEducation } from './education.js'

const archetypes: readonly ArchetypeId[] = [
  'pedreiro',
  'faria_limer',
  'artista',
  'entregador',
  'estudante',
  'saude',
]

describe('education and social mobility', () => {
  it.each(archetypes)('keeps every education path available to %s', (archetype) => {
    const options = allEducationAssessments({
      archetype,
      monthlyDisposableIncome: 80_000,
      weeklyWorkHours: 44,
      commuteMinutesPerDay: 90,
      scheduleFlexibility: 0.3,
    })
    expect(options).toHaveLength(5)
    expect(options.every((option) => option.available)).toBe(true)
  })

  it('shows the heavier structural burden around construction work', () => {
    const common = {
      monthlyDisposableIncome: 40_000,
      weeklyWorkHours: 48,
      commuteMinutesPerDay: 120,
      scheduleFlexibility: 0.15,
    }
    const worker = assessEducation('technical', { ...common, archetype: 'pedreiro' })
    const student = assessEducation('technical', { ...common, archetype: 'estudante' })
    expect(worker.available).toBe(true)
    expect(worker.accessDifficulty).toBeGreaterThan(student.accessDifficulty)
  })

  it('distinguishes lack of money from lack of time', () => {
    const privateCollege = assessEducation('private_college', {
      archetype: 'artista',
      monthlyDisposableIncome: 20_000,
      weeklyWorkHours: 20,
      commuteMinutesPerDay: 20,
      scheduleFlexibility: 0.8,
    })
    expect(privateCollege.moneyPressure).toBeGreaterThan(privateCollege.timePressure)

    const publicCollege = assessEducation('public_college', {
      archetype: 'saude',
      monthlyDisposableIncome: 200_000,
      weeklyWorkHours: 60,
      commuteMinutesPerDay: 150,
      scheduleFlexibility: 0.1,
    })
    expect(publicCollege.timePressure).toBeGreaterThan(publicCollege.moneyPressure)
  })
})
