import { describe, expect, it } from 'vitest'
import {
  advanceCareer,
  availableCareerMove,
  canAdvanceCareer,
  careerWorkDaysRequired,
  currentCareer,
} from './career.js'
import { enrollInEducation } from './education.js'
import { createInitialState, withFlag } from '../state/state.js'

const initial = () => {
  const state = createInitialState({
    name: 'Jaci',
    hometown: 'prudente',
    seed: 7,
    archetype: 'pedreiro',
  })
  return {
    ...state,
    player: { ...state.player, occupation: 'Construção civil', monthlyIncome: 280_000 },
  }
}

describe('career paths', () => {
  it('gives each archetype its own workload and transition', () => {
    const career = currentCareer(initial())
    expect(career).toMatchObject({ archetype: 'pedreiro', occupation: 'Construção civil' })
    expect(availableCareerMove(initial())).toMatchObject({ occupation: 'Mestre de obras' })
  })

  it('requires both work experience and completed education', () => {
    let state = withFlag(initial(), 'career:work-days', 60)
    expect(canAdvanceCareer(state)).toBe(false)
    state = {
      ...enrollInEducation(state, 'free_course'),
      education: {
        pathId: 'free_course',
        status: 'completed',
        enrolledOnDay: 1,
        lastProgressDay: 91,
        completedMonths: 3,
      },
    }
    expect(canAdvanceCareer(state)).toBe(true)
    const advanced = advanceCareer(state)
    expect(advanced.player).toMatchObject({
      occupation: 'Mestre de obras',
      monthlyIncome: 380_000,
    })
    expect(advanceCareer(advanced)).toBe(advanced)
  })

  it('opens a second transition only after 160 worked days', () => {
    let state = withFlag(initial(), 'career:work-days', 60)
    state = {
      ...enrollInEducation(state, 'free_course'),
      education: {
        pathId: 'free_course',
        status: 'completed',
        enrolledOnDay: 1,
        lastProgressDay: 91,
        completedMonths: 3,
      },
    }
    const first = advanceCareer(state)
    expect(careerWorkDaysRequired(availableCareerMove(first)!)).toBe(160)
    expect(canAdvanceCareer(first)).toBe(false)
    const experienced = withFlag(first, 'career:work-days', 160)
    const second = advanceCareer(experienced)
    expect(second.player).toMatchObject({
      occupation: 'Supervisão de obras',
      monthlyIncome: 500_000,
    })
    expect(availableCareerMove(second)).toBeUndefined()
  })
})
