import type { ArchetypeId } from '../types.js'
import type { GameEvent } from '../types.js'
import { clamp, withJournalEntry, type GameState } from '../state/state.js'

export type ConjunctureId =
  'selic_2026_06' | 'rent_2025' | 'construction_jobs_2025' | 'financial_crime_investigation_2026_05'

export interface ConjunctureImpact {
  /** Relative pressure on monthly income or access to paid work. */
  readonly income: number
  /** Relative pressure on recurring housing costs. */
  readonly housingCost: number
  /** New work, study or network openings created by the event. */
  readonly opportunity: number
  /** Extra strain imposed by the event. */
  readonly strain: number
}

export interface ConjunctureOutcome extends ConjunctureImpact {
  readonly eventId: ConjunctureId
  readonly occurredOn: string
  readonly headline: string
  readonly fact: string
  readonly source: string
  /** Conjuncture changes the route to study, never whether study is allowed. */
  readonly educationAvailable: true
}

interface ConjunctureEvent {
  readonly id: ConjunctureId
  readonly occurredOn: string
  readonly headline: string
  readonly fact: string
  readonly source: string
  readonly impacts: Readonly<Record<ArchetypeId, ConjunctureImpact>>
}

const impact = (
  income: number,
  housingCost: number,
  opportunity: number,
  strain: number
): ConjunctureImpact => ({ income, housingCost, opportunity, strain })

/**
 * Dated context used by the life simulation. Scores are deliberately small:
 * they make a starting position matter without deciding a person's future.
 */
export const conjunctureEvents: Readonly<Record<ConjunctureId, ConjunctureEvent>> = {
  selic_2026_06: {
    id: 'selic_2026_06',
    occurredOn: '2026-06-17',
    headline: 'Copom reduz a Selic para 14,25% ao ano',
    fact: 'O Copom reduziu a taxa básica, mantendo uma política monetária ainda restritiva.',
    source: 'https://www.bcb.gov.br/controleinflacao/comunicadoscopom',
    impacts: {
      pedreiro: impact(0, 0, 1, 1),
      faria_limer: impact(1, 0, 2, 2),
      artista: impact(-1, 0, 1, 2),
      entregador: impact(-1, 0, 0, 2),
      estudante: impact(0, 0, 1, 1),
      saude: impact(0, 0, 1, 1),
    },
  },
  rent_2025: {
    id: 'rent_2025',
    occurredOn: '2025-12-31',
    headline: 'Aluguel residencial sobe acima do IPCA em 2025',
    fact: 'O aluguel residencial acumulou alta de 6,06% em 2025, ante IPCA de 4,26%.',
    source:
      'https://agenciadenoticias.ibge.gov.br/agencia-sala-de-imprensa/2013-agencia-de-noticias/releases/45612-ipca-vai-a-0-33-em-dezembro-e-fecha-o-ano-em-4-26',
    impacts: {
      pedreiro: impact(0, 3, 0, 2),
      faria_limer: impact(0, 2, 0, 1),
      artista: impact(0, 3, 0, 3),
      entregador: impact(0, 3, 0, 3),
      estudante: impact(0, 3, 0, 3),
      saude: impact(0, 2, 0, 2),
    },
  },
  construction_jobs_2025: {
    id: 'construction_jobs_2025',
    occurredOn: '2025-11-30',
    headline: 'Construção amplia emprego formal em 2025',
    fact: 'A construção acumulou 192.176 novos postos formais entre janeiro e novembro de 2025.',
    source:
      'https://www.gov.br/trabalho-e-emprego/pt-br/noticias-e-conteudo/2025/dezembro/pais-registra-saldo-positivo-de-85-8-mil-vagas-em-novembro/',
    impacts: {
      pedreiro: impact(3, 0, 3, 1),
      faria_limer: impact(0, 0, 1, 0),
      artista: impact(0, 0, 1, 0),
      entregador: impact(1, 0, 2, 1),
      estudante: impact(0, 0, 2, 0),
      saude: impact(0, 0, 1, 0),
    },
  },
  financial_crime_investigation_2026_05: {
    id: 'financial_crime_investigation_2026_05',
    occurredOn: '2026-05-28',
    headline: 'Instituições ampliam investigação de estruturas financeiras ilícitas',
    fact: 'Receita Federal e MPSP firmaram cooperação para investigar lavagem de dinheiro e ocultação patrimonial.',
    source:
      'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/maio/receita-federal-e-mpsp-intensificam-ofensiva-contra-o-crime-organizado/',
    impacts: {
      pedreiro: impact(0, 0, 1, 0),
      faria_limer: impact(0, 0, 3, 2),
      artista: impact(0, 0, 1, 0),
      entregador: impact(0, 0, 1, 0),
      estudante: impact(0, 0, 2, 0),
      saude: impact(0, 0, 1, 0),
    },
  },
}

export function resolveConjuncture(
  eventId: ConjunctureId,
  archetype: ArchetypeId
): ConjunctureOutcome {
  const event = conjunctureEvents[eventId]
  return {
    eventId: event.id,
    occurredOn: event.occurredOn,
    headline: event.headline,
    fact: event.fact,
    source: event.source,
    educationAvailable: true,
    ...event.impacts[archetype],
  }
}

/**
 * News reaches the player as the first act unfolds. The dates above keep the
 * real-world reference honest; these day numbers pace the playable campaign.
 */
export const conjunctureSchedule: readonly {
  readonly day: number
  readonly eventId: ConjunctureId
}[] = [
  { day: 2, eventId: 'rent_2025' },
  { day: 3, eventId: 'construction_jobs_2025' },
  { day: 4, eventId: 'financial_crime_investigation_2026_05' },
  { day: 5, eventId: 'selic_2026_06' },
]

export interface ConjunctureResolution {
  readonly state: GameState
  readonly events: readonly GameEvent[]
}

const appliedFlag = (id: ConjunctureId): string => `conjuncture:applied:${id}`

/** Turns contextual scores into modest, legible consequences in centavos. */
export function applyConjuncture(state: GameState, eventId: ConjunctureId): ConjunctureResolution {
  if (state.flags[appliedFlag(eventId)] === true) return { state, events: [] }

  const outcome = resolveConjuncture(eventId, state.player.archetype)
  const incomeDelta = Math.round((state.player.monthlyIncome * outcome.income * 3) / 100)
  const rentDelta = Math.round((state.player.monthlyRent * outcome.housingCost * 2) / 100)
  const opportunityMoney = outcome.opportunity * 3_000
  const immediateDelta = incomeDelta + opportunityMoney - rentDelta
  const energyDelta = -(outcome.strain * 3)

  let next: GameState = {
    ...state,
    player: {
      ...state.player,
      monthlyIncome: Math.max(0, state.player.monthlyIncome + incomeDelta),
      monthlyRent: Math.max(0, state.player.monthlyRent + rentDelta),
      money: Math.max(0, state.player.money + immediateDelta),
      energy: clamp(state.player.energy + energyDelta, 0, state.player.energyMax),
    },
    flags: {
      ...state.flags,
      [appliedFlag(eventId)]: true,
      'conjuncture:last': eventId,
    },
  }
  next = withJournalEntry(next, {
    id: `conjuncture:${eventId}`,
    kind: 'lesson',
    text: `${outcome.headline}. No seu mês: ${signedMoney(immediateDelta)} e ${energyDelta} de disposição.`,
  })

  return {
    state: next,
    events: [
      {
        type: 'conjuncture',
        eventId,
        headline: outcome.headline,
        moneyDelta: immediateDelta,
        energyDelta,
        incomeDelta,
        rentDelta,
      },
    ],
  }
}

/** Applies every missed bulletin, which also makes old saves catch up safely. */
export function applyDueConjuncture(state: GameState): ConjunctureResolution {
  let next = state
  const events: GameEvent[] = []
  for (const scheduled of conjunctureSchedule) {
    if (scheduled.day > next.clock.day) continue
    const resolved = applyConjuncture(next, scheduled.eventId)
    next = resolved.state
    events.push(...resolved.events)
  }
  return { state: next, events }
}

export function activeConjuncture(state: GameState): ConjunctureOutcome | undefined {
  const id = state.flags['conjuncture:last']
  return typeof id === 'string' && id in conjunctureEvents
    ? resolveConjuncture(id as ConjunctureId, state.player.archetype)
    : undefined
}

function signedMoney(centavos: number): string {
  const sign = centavos >= 0 ? '+' : '−'
  return `${sign}R$ ${(Math.abs(centavos) / 100).toFixed(2).replace('.', ',')}`
}
