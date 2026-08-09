import type {
  ActId,
  Affinity,
  Centavos,
  DesenroloId,
  DistrictId,
  FlagId,
  FlagValue,
  ItemId,
  NodeId,
  NpcId,
  Period,
  QuestId,
} from '../types.js'
import {
  hasSeenNode,
  isDesenroloCleared,
  itemCount,
  relationship,
  type GameState,
} from '../state/state.js'

/**
 * Conditions are data, not functions.
 *
 * That is the whole point: because a gate is a plain object, the playtest
 * harness can read every gate in the game, work out what it would take to
 * open it, and prove that no dialogue option is unreachable. A predicate
 * closure would be opaque to that analysis.
 */
export type Condition =
  | { readonly kind: 'flag'; readonly id: FlagId; readonly equals?: FlagValue }
  | { readonly kind: 'flagAtLeast'; readonly id: FlagId; readonly min: number }
  | { readonly kind: 'affinity'; readonly affinity: Affinity; readonly min: number }
  | { readonly kind: 'savvy'; readonly min: number }
  | { readonly kind: 'money'; readonly min: Centavos }
  | { readonly kind: 'energy'; readonly min: number }
  | { readonly kind: 'item'; readonly id: ItemId; readonly min?: number }
  | {
      readonly kind: 'quest'
      readonly id: QuestId
      readonly status: 'active' | 'done' | 'failed' | 'notStarted'
    }
  | { readonly kind: 'questStep'; readonly id: QuestId; readonly min: number }
  | { readonly kind: 'relationship'; readonly npc: NpcId; readonly min: number }
  | { readonly kind: 'day'; readonly min?: number; readonly max?: number }
  | { readonly kind: 'period'; readonly period: Period }
  | { readonly kind: 'act'; readonly min?: ActId; readonly max?: ActId }
  | { readonly kind: 'seen'; readonly node: NodeId }
  | { readonly kind: 'cleared'; readonly desenrolo: DesenroloId }
  | { readonly kind: 'visited'; readonly district: DistrictId }
  | { readonly kind: 'not'; readonly of: Condition }
  | { readonly kind: 'all'; readonly of: readonly Condition[] }
  | { readonly kind: 'any'; readonly of: readonly Condition[] }

export function evaluate(state: GameState, condition: Condition): boolean {
  switch (condition.kind) {
    case 'flag': {
      const value = state.flags[condition.id]
      return condition.equals === undefined ? value === true : value === condition.equals
    }
    case 'flagAtLeast': {
      const value = state.flags[condition.id]
      return typeof value === 'number' && value >= condition.min
    }
    case 'affinity':
      return state.player.stats[condition.affinity] >= condition.min
    case 'savvy':
      return state.player.stats.savvy >= condition.min
    case 'money':
      return state.player.money >= condition.min
    case 'energy':
      return state.player.energy >= condition.min
    case 'item':
      return itemCount(state, condition.id) >= (condition.min ?? 1)
    case 'quest': {
      const progress = state.quests[condition.id]
      if (condition.status === 'notStarted') return progress === undefined
      return progress?.status === condition.status
    }
    case 'questStep':
      return (state.quests[condition.id]?.step ?? -1) >= condition.min
    case 'relationship':
      return relationship(state, condition.npc) >= condition.min
    case 'day':
      return (
        state.clock.day >= (condition.min ?? Number.NEGATIVE_INFINITY) &&
        state.clock.day <= (condition.max ?? Number.POSITIVE_INFINITY)
      )
    case 'period':
      return state.clock.period === condition.period
    case 'act':
      return state.act >= (condition.min ?? 1) && state.act <= (condition.max ?? 5)
    case 'seen':
      return hasSeenNode(state, condition.node)
    case 'cleared':
      return isDesenroloCleared(state, condition.desenrolo)
    case 'visited':
      return state.visitedDistricts.includes(condition.district)
    case 'not':
      return !evaluate(state, condition.of)
    case 'all':
      return condition.of.every((c) => evaluate(state, c))
    case 'any':
      return condition.of.some((c) => evaluate(state, c))
  }
}

export function evaluateAll(state: GameState, conditions?: readonly Condition[]): boolean {
  if (!conditions || conditions.length === 0) return true
  return conditions.every((c) => evaluate(state, c))
}

/**
 * Human-readable reason a gate is closed, shown to the player as a greyed-out
 * option ("precisa de Lábia 4"). Telling the player what they lack is what
 * turns a locked door into a goal.
 */
export function describeUnmet(condition: Condition): string {
  switch (condition.kind) {
    case 'affinity': {
      const label = { gab: 'Lábia', instinct: 'Faro', grit: 'Fôlego' }[condition.affinity]
      return `${label} ${condition.min}`
    }
    case 'savvy':
      return `Manha ${condition.min}`
    case 'money':
      return `R$ ${(condition.min / 100).toFixed(2).replace('.', ',')}`
    case 'energy':
      return `Disposição ${condition.min}`
    case 'item':
      return `precisa de: ${condition.id}`
    case 'all':
      return condition.of.map(describeUnmet).join(', ')
    case 'any':
      return condition.of.map(describeUnmet).join(' ou ')
    case 'not':
    case 'flag':
    case 'flagAtLeast':
    case 'quest':
    case 'questStep':
    case 'relationship':
    case 'day':
    case 'period':
    case 'act':
    case 'seen':
    case 'cleared':
    case 'visited':
    default:
      return 'ainda não'
  }
}

/** Every flag/quest/item/node this condition tree touches — used by the reachability checker. */
export function referencedIds(condition: Condition): string[] {
  switch (condition.kind) {
    case 'flag':
    case 'flagAtLeast':
      return [`flag:${condition.id}`]
    case 'item':
      return [`item:${condition.id}`]
    case 'quest':
    case 'questStep':
      return [`quest:${condition.id}`]
    case 'seen':
      return [`node:${condition.node}`]
    case 'cleared':
      return [`desenrolo:${condition.desenrolo}`]
    case 'relationship':
      return [`npc:${condition.npc}`]
    case 'visited':
      return [`district:${condition.district}`]
    case 'not':
      return referencedIds(condition.of)
    case 'all':
    case 'any':
      return condition.of.flatMap(referencedIds)
    case 'affinity':
    case 'energy':
    case 'savvy':
    case 'money':
    case 'day':
    case 'period':
    case 'act':
    default:
      return []
  }
}
