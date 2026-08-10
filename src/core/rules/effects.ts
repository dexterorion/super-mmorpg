import type {
  ActId,
  Affinity,
  Centavos,
  DesenroloId,
  DialogueId,
  DistrictId,
  FlagId,
  FlagValue,
  GameEvent,
  ItemId,
  NpcId,
  PlaceId,
  QuestId,
} from '../types.js'
import {
  withFlag,
  withItem,
  withJournalEntry,
  withRelationship,
  type GameState,
  type QuestProgress,
} from '../state/state.js'
import {
  addMoney,
  assertCentavos,
  advancePeriod,
  awardSavvy,
  restoreEnergy,
  sleep,
  trainAffinity,
} from '../economy/economy.js'

/**
 * Effects are data too, for the same reason conditions are: the harness needs
 * to know what a choice *gives* in order to prove a gate is openable.
 */
export type Effect =
  | { readonly kind: 'flag'; readonly id: FlagId; readonly value: FlagValue }
  | { readonly kind: 'flagAdd'; readonly id: FlagId; readonly delta: number }
  | { readonly kind: 'money'; readonly delta: Centavos }
  | { readonly kind: 'energy'; readonly delta: number }
  | { readonly kind: 'transit'; readonly delta: Centavos }
  | { readonly kind: 'savvyXp'; readonly amount: number }
  | { readonly kind: 'affinity'; readonly affinity: Affinity; readonly delta: number }
  | { readonly kind: 'item'; readonly id: ItemId; readonly delta: number }
  | { readonly kind: 'relationship'; readonly npc: NpcId; readonly delta: number }
  | { readonly kind: 'questStart'; readonly id: QuestId }
  | { readonly kind: 'questStep'; readonly id: QuestId; readonly step: number }
  | { readonly kind: 'questDone'; readonly id: QuestId }
  | { readonly kind: 'questFail'; readonly id: QuestId }
  | {
      readonly kind: 'journal'
      readonly id: string
      readonly text: string
      readonly entryKind: 'objective' | 'lesson' | 'contact'
      readonly source?: { readonly label: string; readonly url: string }
    }
  | { readonly kind: 'advancePeriod' }
  | { readonly kind: 'sleep'; readonly quality?: 'bed' | 'couch' | 'rough' }
  | { readonly kind: 'act'; readonly act: ActId }
  | { readonly kind: 'moveTo'; readonly district: DistrictId; readonly place: PlaceId }
  | { readonly kind: 'startDesenrolo'; readonly id: DesenroloId }
  | { readonly kind: 'startDialogue'; readonly id: DialogueId }
  | { readonly kind: 'endGame'; readonly endingId: string }

export interface EffectResult {
  readonly state: GameState
  readonly events: readonly GameEvent[]
}

export function applyEffect(state: GameState, effect: Effect): EffectResult {
  const events: GameEvent[] = []

  switch (effect.kind) {
    case 'flag':
      return { state: withFlag(state, effect.id, effect.value), events }

    case 'flagAdd': {
      const current = state.flags[effect.id]
      const base = typeof current === 'number' ? current : 0
      return { state: withFlag(state, effect.id, base + effect.delta), events }
    }

    case 'money':
      events.push({ type: 'money', delta: effect.delta })
      return { state: addMoney(state, effect.delta), events }

    case 'energy':
      return { state: restoreEnergy(state, effect.delta), events }

    case 'transit':
      assertCentavos(effect.delta)
      return {
        state: {
          ...state,
          player: { ...state.player, transit: Math.max(0, state.player.transit + effect.delta) },
        },
        events,
      }

    case 'savvyXp': {
      const before = state.player.stats.savvy
      const next = awardSavvy(state, effect.amount)
      if (next.player.stats.savvy > before) {
        events.push({ type: 'savvyLevelUp', level: next.player.stats.savvy })
      }
      return { state: next, events }
    }

    case 'affinity': {
      const next = trainAffinity(state, effect.affinity, effect.delta)
      if (next.player.stats[effect.affinity] !== state.player.stats[effect.affinity]) {
        events.push({
          type: 'affinityChanged',
          affinity: effect.affinity,
          value: next.player.stats[effect.affinity],
        })
      }
      return { state: next, events }
    }

    case 'item':
      events.push({ type: 'item', id: effect.id, delta: effect.delta })
      return { state: withItem(state, effect.id, effect.delta), events }

    case 'relationship':
      return { state: withRelationship(state, effect.npc, effect.delta), events }

    case 'questStart': {
      if (state.quests[effect.id]) return { state, events }
      const progress: QuestProgress = {
        status: 'active',
        step: 0,
        startedOnDay: state.clock.day,
      }
      events.push({ type: 'questStarted', id: effect.id })
      return { state: { ...state, quests: { ...state.quests, [effect.id]: progress } }, events }
    }

    case 'questStep': {
      const current = state.quests[effect.id]
      if (current?.status !== 'active') return { state, events }
      return {
        state: {
          ...state,
          quests: { ...state.quests, [effect.id]: { ...current, step: effect.step } },
        },
        events,
      }
    }

    case 'questDone':
    case 'questFail': {
      const current = state.quests[effect.id] ?? {
        status: 'active' as const,
        step: 0,
        startedOnDay: state.clock.day,
      }
      const status = effect.kind === 'questDone' ? ('done' as const) : ('failed' as const)
      events.push({ type: 'questEnded', id: effect.id, status })
      return {
        state: { ...state, quests: { ...state.quests, [effect.id]: { ...current, status } } },
        events,
      }
    }

    case 'journal':
      return {
        state: withJournalEntry(state, {
          id: effect.id,
          text: effect.text,
          kind: effect.entryKind,
          ...(effect.source ? { source: effect.source } : {}),
        }),
        events,
      }

    case 'advancePeriod':
      return { state: advancePeriod(state), events }

    case 'sleep':
      events.push({ type: 'slept', quality: effect.quality ?? 'bed' })
      return { state: sleep(state, effect.quality ?? 'bed'), events }

    case 'act':
      events.push({ type: 'actChanged', act: effect.act })
      return { state: { ...state, act: effect.act }, events }

    case 'moveTo': {
      const visited = state.visitedDistricts.includes(effect.district)
        ? state.visitedDistricts
        : [...state.visitedDistricts, effect.district]
      return {
        state: {
          ...state,
          district: effect.district,
          place: effect.place,
          visitedDistricts: visited,
        },
        events,
      }
    }

    case 'startDesenrolo':
      return {
        state: { ...state, mode: { kind: 'desenrolo', desenroloId: effect.id } },
        events: [{ type: 'desenroloStarted', id: effect.id }],
      }

    case 'startDialogue':
      return {
        state: {
          ...state,
          mode: { kind: 'dialogue', dialogueId: effect.id, nodeId: 'start', lineIndex: 0 },
        },
        events,
      }

    case 'endGame':
      events.push({ type: 'gameEnded', endingId: effect.endingId })
      return { state: { ...state, mode: { kind: 'ended', endingId: effect.endingId } }, events }
  }
}

export function applyEffects(state: GameState, effects?: readonly Effect[]): EffectResult {
  if (!effects || effects.length === 0) return { state, events: [] }

  let current = state
  const events: GameEvent[] = []
  for (const effect of effects) {
    const result = applyEffect(current, effect)
    current = result.state
    events.push(...result.events)
  }
  return { state: current, events }
}

/** What this effect grants — the mirror of `referencedIds`, used by reachability analysis. */
export function grantedIds(effect: Effect): string[] {
  switch (effect.kind) {
    case 'flag':
    case 'flagAdd':
      return [`flag:${effect.id}`]
    case 'item':
      return effect.delta > 0 ? [`item:${effect.id}`] : []
    case 'questStart':
    case 'questStep':
    case 'questDone':
      return [`quest:${effect.id}`]
    case 'relationship':
      return effect.delta > 0 ? [`npc:${effect.npc}`] : []
    case 'moveTo':
      return [`district:${effect.district}`]
    case 'affinity':
    case 'energy':
    case 'money':
    case 'act':
    case 'savvyXp':
    case 'transit':
    case 'questFail':
    case 'journal':
    case 'advancePeriod':
    case 'sleep':
    case 'startDesenrolo':
    case 'startDialogue':
    case 'endGame':
    default:
      return []
  }
}
