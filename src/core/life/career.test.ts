import { describe, expect, it } from 'vitest'
import { advanceCareer, availableCareerMove, canAdvanceCareer, currentCareer } from './career.js'
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
})
