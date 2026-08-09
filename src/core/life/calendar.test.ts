import { describe, expect, it } from 'vitest'
import { enrollInEducation } from './education.js'
import { closeDay, isDayClosed, isMonthSettled, scheduleActivity } from './calendar.js'
import { createInitialState } from '../state/state.js'

const initial = () => createInitialState({ name: 'Jaci', hometown: 'prudente', seed: 7 })

describe('metropolitan calendar', () => {
  it('records each agenda activity at most once per day', () => {
    const worked = scheduleActivity(initial(), 'work')
    expect(worked.events).toContainEqual(expect.objectContaining({ type: 'agendaActivity' }))
    expect(worked.state.player.energy).toBe(48)
    expect(scheduleActivity(worked.state, 'work')).toEqual({ state: worked.state, events: [] })
  })

  it('requires an active enrollment to study', () => {
    expect(scheduleActivity(initial(), 'study').events).toEqual([])
    const enrolled = enrollInEducation(initial(), 'free_course')
    expect(scheduleActivity(enrolled, 'study').events).toHaveLength(1)
  })

  it('closes a day idempotently and restores disposition', () => {
    const worked = scheduleActivity(initial(), 'work').state
    const closed = closeDay(worked)
    expect(closed.state.clock).toEqual({ day: 2, period: 'morning', minuteOfDay: 420 })
    expect(closed.state.player.energy).toBe(closed.state.player.energyMax)
    expect(isDayClosed(closed.state, 1)).toBe(true)
    const replay = closeDay({ ...closed.state, clock: { ...closed.state.clock, day: 1 } })
    expect(replay.events).toEqual([])
  })

  it('settles salary and rent exactly once on each 30th day', () => {
    let state = initial()
    const startingMoney = state.player.money
    for (let day = 1; day <= 30; day += 1) {
      if (day <= 20) state = scheduleActivity(state, 'work').state
      state = closeDay(state).state
    }
    expect(isMonthSettled(state, 1)).toBe(true)
    expect(state.player.money).toBe(
      startingMoney + state.player.monthlyIncome - state.player.monthlyRent
    )
    const replay = closeDay({ ...state, clock: { ...state.clock, day: 30 } })
    expect(replay.events).toEqual([])
    expect(replay.state.player.money).toBe(state.player.money)
  })
})
