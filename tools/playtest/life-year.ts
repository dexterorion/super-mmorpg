import { mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { archetypes } from '../../src/content/archetypes.js'
import { content } from '../../src/content/index.js'
import { housing } from '../../src/content/housing.js'
import { enrollInEducation } from '../../src/core/life/education.js'
import { deserialize, serialize } from '../../src/core/save/save.js'
import { GameSession } from '../../src/core/session.js'
import { createInitialState } from '../../src/core/state/state.js'
import type { ArchetypeId, GameEvent } from '../../src/core/types.js'

const ARCHETYPES = Object.keys(archetypes) as ArchetypeId[]
const session = new GameSession(content)

export interface LifeYearResult {
  readonly archetype: ArchetypeId
  readonly seed: number
  readonly daysClosed: number
  readonly monthsSettled: number
  readonly finalDay: number
  readonly finalMoney: number
  readonly activities: Readonly<Record<string, number>>
  readonly educationStatus: string
  readonly finalOccupation: string
  readonly finalHousing: string
  readonly careerChanges: number
  readonly housingChanges: number
  readonly familyDecision: 'yes' | 'no'
  readonly partnershipStatus: string
  readonly children: number
  readonly careDays: number
  readonly epilogue: string
  readonly invariants: {
    readonly noSoftlock: boolean
    readonly safeIntegerMoney: boolean
    readonly monthlyCyclesUnique: boolean
    readonly careerChanged: boolean
    readonly housingChanged: boolean
    readonly monthlyLedgerReflectsChanges: boolean
    readonly familyDecisionMade: boolean
    readonly careConsistent: boolean
    readonly secondCareerReached: boolean
    readonly yearClosedOnce: boolean
    readonly finalSaveRoundTrip: boolean
  }
}

export function runLifeYear(archetypeId: ArchetypeId, seed: number): LifeYearResult {
  const profile = archetypes[archetypeId]
  const home = housing.pensao_bixiga
  let state = createInitialState({
    name: 'Jaci',
    hometown: 'prudente',
    seed,
    archetype: archetypeId,
    profile: {
      startingMoney: profile.startingMoney,
      energy: profile.energy,
      stats: profile.stats,
      occupation: profile.occupation,
      monthlyIncome: profile.monthlyIncome,
      housing: home.id,
      monthlyRent: home.monthlyRent,
    },
  })
  state = {
    ...enrollInEducation(state, 'free_course'),
    place: 'tiete_metro',
    district: 'tiete',
    mode: { kind: 'world' },
    relationships: { ...state.relationships, yumi: 2 },
  }

  const events: GameEvent[] = []
  const activityCounts: Record<string, number> = {}
  const familyDecision: 'yes' | 'no' =
    archetypeId === 'faria_limer' || archetypeId === 'artista' ? 'no' : 'yes'
  for (let closed = 0; closed < 365; closed += 1) {
    if (state.clock.day === 40) {
      const family = session.performById(state, 'family:partner:yumi')
      state = family.state
      events.push(...family.events)
    }
    if (state.clock.day === 100) {
      const career = session.performById(state, 'career:advance')
      state = career.state
      events.push(...career.events)
    }
    if (state.clock.day === 121) {
      const marriage = session.performById(state, 'family:marry')
      state = marriage.state
      events.push(...marriage.events)
    }
    if (state.clock.day === 122) {
      const decision = session.performById(state, `family:children:${familyDecision}`)
      state = decision.state
      events.push(...decision.events)
    }
    if (state.clock.day === 123 && familyDecision === 'yes') {
      const child = session.performById(state, 'family:welcome-child')
      state = child.state
      events.push(...child.events)
    }
    if (state.clock.day === 180) {
      const move = session.performById(state, 'housing:move:quarto_guarulhos')
      state = move.state
      events.push(...move.events)
    }
    if (state.clock.day === 250) {
      const career = session.performById(state, 'career:advance')
      state = career.state
      events.push(...career.events)
    }
    if (state.family.children.length > 0) {
      const care = session.performById(state, 'family:care-day')
      state = care.state
      events.push(...care.events)
    }
    const weekday = ((state.clock.day - 1) % 7) + 1
    const planned = [
      ...(weekday <= 5 ? ['work'] : []),
      ...(weekday === 6 ? ['socialize'] : []),
      ...(weekday === 7 ? ['rest'] : []),
      ...(weekday <= 5 && state.clock.day % 2 === 0 ? ['study'] : []),
    ]
    for (const activity of planned) {
      const result = session.performById(state, `agenda:${activity}`)
      state = result.state
      events.push(...result.events)
    }
    const close = session.performById(state, 'agenda:close-day')
    if (close.state === state) throw new Error(`softlock closing day ${state.clock.day}`)
    state = close.state
    events.push(...close.events)
  }

  for (const event of events) {
    if (event.type !== 'agendaActivity' || typeof event.activity !== 'string') continue
    activityCounts[event.activity] = (activityCounts[event.activity] ?? 0) + 1
  }
  const months = events
    .filter((event) => event.type === 'monthSettled')
    .map((event) => Number(event.month))
  const careerChanges = events.filter((event) => event.type === 'careerChanged').length
  const housingChanges = events.filter((event) => event.type === 'housingChanged').length
  const monthlyStatements = events.filter((event) => event.type === 'monthSettled')
  const annualEvents = events.filter((event) => event.type === 'lifeYearCompleted')
  const annual = annualEvents[0]
  const careDays = events.filter((event) => event.type === 'familyCare').length
  const replayState = { ...state, clock: { ...state.clock, day: 365 } }
  const replay = session.performById(replayState, 'agenda:close-day')
  const loaded = deserialize(serialize(state, 1_000))
  const saveRoundTrip =
    loaded.ok &&
    loaded.state.flags['life:year:1:closed'] === true &&
    loaded.state.player.occupation === state.player.occupation &&
    loaded.state.player.housing === state.player.housing &&
    loaded.state.family.children.length === state.family.children.length
  return {
    archetype: archetypeId,
    seed,
    daysClosed: events.filter((event) => event.type === 'dayClosed').length,
    monthsSettled: months.length,
    finalDay: state.clock.day,
    finalMoney: state.player.money,
    activities: activityCounts,
    educationStatus: state.education?.status ?? 'none',
    finalOccupation: state.player.occupation,
    finalHousing: state.player.housing,
    careerChanges,
    housingChanges,
    familyDecision,
    partnershipStatus: state.family.partnership?.status ?? 'none',
    children: state.family.children.length,
    careDays,
    epilogue: typeof annual?.epilogue === 'string' ? annual.epilogue : '',
    invariants: {
      noSoftlock: state.clock.day === 366,
      safeIntegerMoney: Number.isSafeInteger(state.player.money) && state.player.money >= 0,
      monthlyCyclesUnique: months.length === new Set(months).size,
      careerChanged: careerChanges === 2,
      housingChanged: housingChanges === 1,
      monthlyLedgerReflectsChanges:
        monthlyStatements.some((event) => event.occupation === state.player.occupation) &&
        monthlyStatements.some((event) => event.housing === state.player.housing),
      familyDecisionMade:
        state.family.childrenDecision === familyDecision &&
        state.family.partnership?.status === 'married',
      careConsistent:
        familyDecision === 'yes'
          ? state.family.children.length === 1 && careDays >= 200
          : state.family.children.length === 0 && careDays === 0,
      secondCareerReached: careerChanges === 2,
      yearClosedOnce:
        annualEvents.length === 1 && replay.state === replayState && replay.events.length === 0,
      finalSaveRoundTrip: saveRoundTrip,
    },
  }
}

export async function writeLifeYearReport(): Promise<readonly LifeYearResult[]> {
  const results = ARCHETYPES.map((archetype, index) => runLifeYear(archetype, 7 + index))
  if (
    results.some(
      (result) =>
        result.daysClosed !== 365 ||
        result.monthsSettled !== 12 ||
        Object.values(result.invariants).some((value) => !value)
    )
  ) {
    throw new Error('life-year invariant failed')
  }
  await mkdir('playtest-report', { recursive: true })
  await writeFile(
    'playtest-report/life-year.json',
    `${JSON.stringify({ version: 1, horizonDays: 365, results }, null, 2)}\n`
  )
  return results
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === invokedPath) {
  const results = await writeLifeYearReport()
  console.warn(
    `GAROA life-year: ${results.length} archetypes crossed 365 days and 12 monthly cycles.`
  )
}
