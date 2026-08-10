import { addMoney, periodAt, restoreEnergy, spendEnergy } from '../economy/economy.js'
import { isFlagTrue, withFlag, withJournalEntry, type GameState } from '../state/state.js'
import type { GameEvent } from '../types.js'
import { currentCareer } from './career.js'

export type AgendaActivity = 'work' | 'study' | 'socialize' | 'rest'

export interface AgendaDefinition {
  readonly id: AgendaActivity
  readonly label: string
  readonly minutes: number
  readonly energy: number
}

export const agenda: Readonly<Record<AgendaActivity, AgendaDefinition>> = {
  work: { id: 'work', label: 'Trabalhar', minutes: 480, energy: 12 },
  study: { id: 'study', label: 'Estudar', minutes: 240, energy: 8 },
  socialize: { id: 'socialize', label: 'Socializar', minutes: 180, energy: 5 },
  rest: { id: 'rest', label: 'Descansar', minutes: 120, energy: -14 },
}

export interface CalendarResult {
  readonly state: GameState
  readonly events: readonly GameEvent[]
}

const activityKey = (day: number, activity: AgendaActivity): string =>
  `life:agenda:${day}:${activity}`
const closedKey = (day: number): string => `life:closed:${day}`
const settledKey = (month: number): string => `life:month:${month}:settled`

export function hasScheduled(state: GameState, activity: AgendaActivity): boolean {
  return isFlagTrue(state, activityKey(state.clock.day, activity))
}

export function canSchedule(state: GameState, activity: AgendaActivity): boolean {
  if (isFlagTrue(state, closedKey(state.clock.day)) || hasScheduled(state, activity)) return false
  if (activity === 'study' && state.education?.status !== 'active') return false
  const definition = agendaFor(state, activity)
  return activity === 'rest' || state.player.energy >= definition.energy
}

export function agendaFor(state: GameState, activity: AgendaActivity): AgendaDefinition {
  if (activity !== 'work') return agenda[activity]
  const career = currentCareer(state)
  return {
    id: 'work',
    label: `Trabalhar · ${career.occupation}`,
    minutes: career.workdayMinutes,
    energy: career.workdayEnergy,
  }
}

/** Records one activity at most once per day and keeps it inside the current day. */
export function scheduleActivity(state: GameState, activity: AgendaActivity): CalendarResult {
  if (!canSchedule(state, activity)) return { state, events: [] }
  const definition = agendaFor(state, activity)
  let next = withFlag(state, activityKey(state.clock.day, activity), true)
  if (activity === 'work') {
    next = withFlag(next, 'career:work-days', Number(next.flags['career:work-days'] ?? 0) + 1)
  }
  next =
    definition.energy < 0
      ? restoreEnergy(next, -definition.energy)
      : spendEnergy(next, definition.energy)
  const minuteOfDay = Math.min(1_439, next.clock.minuteOfDay + definition.minutes)
  next = { ...next, clock: { ...next.clock, minuteOfDay, period: periodAt(minuteOfDay) } }
  return {
    state: next,
    events: [
      {
        type: 'agendaActivity',
        activity,
        day: state.clock.day,
        minutes: definition.minutes,
        energy: definition.energy,
      },
    ],
  }
}

export interface MonthStatement {
  readonly month: number
  readonly workDays: number
  readonly salary: number
  readonly rent: number
  readonly net: number
  readonly occupation: string
  readonly housing: string
}

export function monthStatement(state: GameState, month: number): MonthStatement {
  const firstDay = (month - 1) * 30 + 1
  const lastDay = month * 30
  let workDays = 0
  for (let day = firstDay; day <= lastDay; day += 1) {
    if (isFlagTrue(state, activityKey(day, 'work'))) workDays += 1
  }
  const salary = Math.round((state.player.monthlyIncome * Math.min(workDays, 20)) / 20)
  const rent = state.player.monthlyRent
  return {
    month,
    workDays,
    salary,
    rent,
    net: salary - rent,
    occupation: state.player.occupation,
    housing: state.player.housing,
  }
}

/**
 * Closes the current day once. Every 30th day also settles that month once.
 * Flags make both operations safe to retry after reload or adapter failures.
 */
export function closeDay(state: GameState): CalendarResult {
  const day = state.clock.day
  if (isFlagTrue(state, closedKey(day))) return { state, events: [] }

  let next = withFlag(state, closedKey(day), true)
  const events: GameEvent[] = [{ type: 'dayClosed', day }]
  if (day % 30 === 0) {
    const month = day / 30
    if (!isFlagTrue(next, settledKey(month))) {
      const statement = monthStatement(next, month)
      next = addMoney(next, statement.net)
      next = withFlag(next, settledKey(month), true)
      next = withJournalEntry(next, {
        id: `life:month:${month}`,
        kind: 'lesson',
        text: `Mês ${month}: ${statement.workDays} dias de trabalho, salário e aluguel acertados.`,
      })
      events.push({ type: 'monthSettled', ...statement })
    }
  }

  next = {
    ...next,
    clock: { day: day + 1, period: 'morning', minuteOfDay: 420 },
    player: { ...next.player, energy: next.player.energyMax },
  }
  return { state: next, events }
}

export function isDayClosed(state: GameState, day = state.clock.day): boolean {
  return isFlagTrue(state, closedKey(day))
}

export function isMonthSettled(state: GameState, month: number): boolean {
  return isFlagTrue(state, settledKey(month))
}
