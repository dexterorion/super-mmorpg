import { describe, expect, it } from 'vitest'
import { createInitialState } from '../state/state.js'
import {
  advanceFamily,
  assessFamilyImpact,
  beginPartnership,
  decideChildren,
  endPartnership,
  marryPartner,
  welcomeChild,
} from './family.js'

describe('partnership, marriage and children', () => {
  it('records relationship decisions without mutating the previous state', () => {
    const initial = createInitialState({ name: 'Jaci', hometown: 'bauru', seed: 8 })
    const partnered = beginPartnership(initial, 'bia', 0.6)
    const married = marryPartner({ ...partnered, clock: { ...partnered.clock, day: 30 } })
    const parent = welcomeChild(decideChildren(married, 'yes'), { id: 'luz', name: 'Luz' })

    expect(initial.family.partnership).toBeNull()
    expect(married.family.partnership).toMatchObject({
      partnerNpcId: 'bia',
      status: 'married',
      marriedOnDay: 30,
    })
    expect(parent.family.children).toEqual([
      { id: 'luz', name: 'Luz', age: 'baby', joinedOnDay: 30 },
    ])
  })

  it('ages children as metropolitan life advances and preserves their identity', () => {
    const initial = createInitialState({ name: 'Jaci', hometown: 'prudente', seed: 1 })
    const parent = welcomeChild(decideChildren(initial, 'yes'), { id: 'luz', name: 'Luz' })
    expect(
      advanceFamily({ ...parent, clock: { ...parent.clock, day: 31 } }).family.children
    ).toEqual([expect.objectContaining({ id: 'luz', name: 'Luz', age: 'child' })])
    expect(
      advanceFamily({ ...parent, clock: { ...parent.clock, day: 181 } }).family.children
    ).toEqual([expect.objectContaining({ id: 'luz', age: 'teen' })])
  })

  it('ends a partnership without removing children or their history', () => {
    const initial = createInitialState({ name: 'Jaci', hometown: 'prudente', seed: 1 })
    const parent = welcomeChild(decideChildren(beginPartnership(initial, 'yumi'), 'yes'), {
      id: 'luz',
      name: 'Luz',
    })
    const separated = endPartnership(parent)
    expect(separated.family.partnership).toBeNull()
    expect(separated.family.children).toEqual(parent.family.children)
  })

  it('respects the decision not to have children', () => {
    const initial = createInitialState({ name: 'Jaci', hometown: 'bauru', seed: 8 })
    const unchanged = welcomeChild(decideChildren(initial, 'no'), { id: 'luz', name: 'Luz' })
    expect(unchanged.family.children).toEqual([])
  })

  it('turns care into money, time, housing, work and commute pressure', () => {
    let state = createInitialState({ name: 'Jaci', hometown: 'bauru', seed: 8 })
    state = beginPartnership(state, 'bia', 0.5)
    state = welcomeChild(decideChildren(state, 'yes'), { id: 'luz', name: 'Luz' })

    const impact = assessFamilyImpact({
      family: state.family,
      housing: 'pensao_bixiga',
      housingComfort: 2,
      monthlyHouseholdIncome: 190_000,
      weeklyWorkHours: 44,
      commuteMinutesPerDay: 90,
    })

    expect(impact.householdSize).toBe(3)
    expect(impact.monthlyCareCost).toBe(55_500)
    expect(impact.weeklyCareHours).toBe(21)
    expect(impact.housingPressure).toBeGreaterThan(0)
    expect(impact.timePressure).toBeGreaterThan(0)
    expect(impact.careCommuteMinutesPerWeek).toBeGreaterThan(0)
    expect(impact.availableWorkHours).toBeLessThan(84)
  })
})
