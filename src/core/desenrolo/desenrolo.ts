import type { Affinity, DesenroloId, GameEvent, ItemId } from '../types.js'
import type { Condition } from '../rules/conditions.js'
import type { Effect } from '../rules/effects.js'
import type { ItemLookup } from '../items/item.js'
import type { BattleLine, DesenroloBattle } from './battle.js'
import { evaluateAll } from '../rules/conditions.js'
import { applyEffects } from '../rules/effects.js'
import { clamp, itemCount, type GameState } from '../state/state.js'
import { spendEnergy } from '../economy/economy.js'
import { createRng } from '../rng/rng.js'
import { withItem } from '../state/state.js'

/**
 * Desenrolo — the game's conflict system.
 *
 * The enemy is always a *situation* (a queue, an interview, rising water),
 * never a person to be hurt. Their HP is Paciência; yours is Disposição.
 *
 * Two rules keep it from degenerating into button-mashing:
 *   1. Repeating the same argument topic gets weaker every time, so "spam the
 *      strongest line" stops working by turn three.
 *   2. Insistir always works and always costs Disposição, so brute force is a
 *      real option that has a real price.
 *
 * Losing is never a game over. It costs you the day, the money, or the
 * opportunity — and the story keeps going.
 */

export interface Argument {
  readonly id: string
  readonly text: string
  /** Repeating a topic within one Desenrolo halves its power each time. */
  readonly topic: string
  readonly power: number
  readonly conditions?: readonly Condition[]
  /** The situation has a comeback for this one: no damage, and it stings. */
  readonly rebutted?: boolean
  /** Shown after using it. */
  readonly reply?: string
}

export interface Tell {
  readonly id: string
  readonly text: string
}

export interface SituationMove {
  readonly id: string
  readonly text: string
  readonly damage: number
  readonly weight?: number
  readonly notBeforeTurn?: number
}

export interface DesenroloDef {
  readonly id: DesenroloId
  readonly name: string
  readonly subtitle?: string
  readonly intro: readonly string[]
  readonly patience: number
  readonly arguments: readonly Argument[]
  /** Revealed one per Observar, in order. The last one exposes the weakness. */
  readonly tells: readonly Tell[]
  readonly weakness: {
    readonly affinity: Affinity
    readonly multiplier: number
    readonly revealText: string
  }
  readonly moves: readonly SituationMove[]
  /** The office closes, the bus leaves, the water rises. */
  readonly turnLimit?: number
  readonly winText: readonly string[]
  readonly loseText: readonly string[]
  readonly onWin?: readonly Effect[]
  readonly onLose?: readonly Effect[]
}

export type DesenroloLookup = (id: DesenroloId) => DesenroloDef | undefined

export type { BattleLine, DesenroloBattle } from './battle.js'

export const INSIST_ENERGY_COST = 6
export const ARGUE_ENERGY_COST = 3
export const OBSERVE_ENERGY_COST = 1
export const BRACED_REDUCTION = 0.5

export type DesenroloAction =
  | { readonly kind: 'beginFight' }
  | { readonly kind: 'argue'; readonly argumentId: string }
  | { readonly kind: 'observe' }
  | { readonly kind: 'insist' }
  | { readonly kind: 'item'; readonly itemId: ItemId }
  | { readonly kind: 'acknowledge' }

export interface DesenroloResult {
  readonly state: GameState
  readonly events: readonly GameEvent[]
}

export function startBattle(state: GameState, def: DesenroloDef): GameState {
  const battle: DesenroloBattle = {
    id: def.id,
    patience: def.patience,
    patienceMax: def.patience,
    turn: 1,
    topicUses: {},
    revealedTells: 0,
    weaknessRevealed: false,
    usedItems: [],
    transcript: def.intro.map((text) => ({ who: 'situation' as const, text })),
    phase: 'intro',
    braced: false,
  }
  return { ...state, battle, mode: { kind: 'desenrolo', desenroloId: def.id } }
}

// --- View ---------------------------------------------------------------

export interface ArgumentView {
  readonly id: string
  readonly text: string
  readonly enabled: boolean
  /** Falls as you repeat a topic; the UI shows it as a fading bar. */
  readonly strength: 'forte' | 'gasto' | 'sem efeito'
}

export interface DesenroloView {
  readonly id: DesenroloId
  readonly name: string
  readonly subtitle?: string
  readonly patience: number
  readonly patienceMax: number
  readonly turn: number
  readonly turnLimit?: number
  readonly phase: DesenroloBattle['phase']
  readonly transcript: readonly BattleLine[]
  readonly arguments: readonly ArgumentView[]
  readonly revealedTells: readonly string[]
  readonly weaknessRevealed: boolean
  readonly canObserve: boolean
  readonly energy: number
  readonly energyMax: number
}

function topicMultiplier(uses: number): number {
  return 1 / Math.pow(2, uses)
}

function strengthLabel(uses: number, rebutted: boolean): ArgumentView['strength'] {
  if (rebutted) return 'sem efeito'
  return uses === 0 ? 'forte' : uses === 1 ? 'gasto' : 'sem efeito'
}

export function getView(state: GameState, lookup: DesenroloLookup): DesenroloView | undefined {
  const battle = state.battle
  if (!battle) return undefined
  const def = lookup(battle.id)
  if (!def) return undefined

  return {
    id: def.id,
    name: def.name,
    ...(def.subtitle ? { subtitle: def.subtitle } : {}),
    patience: battle.patience,
    patienceMax: battle.patienceMax,
    turn: battle.turn,
    ...(def.turnLimit ? { turnLimit: def.turnLimit } : {}),
    phase: battle.phase,
    transcript: battle.transcript,
    arguments: def.arguments
      .filter((a) => evaluateAll(state, a.conditions))
      .map((a) => {
        const uses = battle.topicUses[a.topic] ?? 0
        return {
          id: a.id,
          text: a.text,
          enabled: state.player.energy > 0,
          // The player can see an argument is spent before spending a turn on it.
          strength: strengthLabel(uses, a.rebutted === true && battle.weaknessRevealed),
        }
      }),
    revealedTells: def.tells.slice(0, battle.revealedTells).map((t) => t.text),
    weaknessRevealed: battle.weaknessRevealed,
    canObserve: battle.revealedTells < def.tells.length,
    energy: state.player.energy,
    energyMax: state.player.energyMax,
  }
}

// --- Turn resolution ----------------------------------------------------

export function perform(
  state: GameState,
  action: DesenroloAction,
  lookup: DesenroloLookup,
  items: ItemLookup
): DesenroloResult {
  const battle = state.battle
  if (!battle) return { state, events: [] }
  const def = lookup(battle.id)
  if (!def) return { state, events: [] }

  if (battle.phase === 'intro') {
    if (action.kind !== 'beginFight' && action.kind !== 'acknowledge') return { state, events: [] }
    return {
      state: { ...state, battle: { ...battle, phase: 'playing', transcript: [] } },
      events: [{ type: 'desenroloBegan', id: def.id }],
    }
  }

  if (battle.phase === 'won' || battle.phase === 'lost') {
    if (action.kind !== 'acknowledge') return { state, events: [] }
    return finish(state, def, battle.phase)
  }

  const rng = createRng(state.rngState)
  const transcript: BattleLine[] = []
  let current: GameState = state
  let next: DesenroloBattle = { ...battle, braced: false }
  const events: GameEvent[] = []

  // --- Player's move ---
  switch (action.kind) {
    case 'argue': {
      const arg = def.arguments.find((a) => a.id === action.argumentId)
      if (!arg || !evaluateAll(current, arg.conditions)) return { state, events: [] }

      const uses = next.topicUses[arg.topic] ?? 0
      transcript.push({ who: 'player', text: arg.text })

      let damage = 0
      if (arg.rebutted) {
        transcript.push({
          who: 'situation',
          text: arg.reply ?? 'Isso aí não cola comigo, não.',
        })
      } else {
        const base = (arg.power + current.player.stats.gab) * topicMultiplier(uses)
        const bonus =
          next.weaknessRevealed && def.weakness.affinity === 'gab' ? def.weakness.multiplier : 1
        damage = Math.max(1, Math.round(base * bonus))
        if (arg.reply) transcript.push({ who: 'situation', text: arg.reply })
      }

      next = {
        ...next,
        topicUses: { ...next.topicUses, [arg.topic]: uses + 1 },
        patience: Math.max(0, next.patience - damage),
      }
      current = spendEnergy(current, ARGUE_ENERGY_COST)
      events.push({ type: 'desenroloArgue', argumentId: arg.id, damage })
      break
    }

    case 'observe': {
      if (next.revealedTells >= def.tells.length) {
        transcript.push({ who: 'narrator', text: 'Você já entendeu a jogada. Agora é agir.' })
      } else {
        const tell = def.tells[next.revealedTells]!
        transcript.push({ who: 'narrator', text: tell.text })
        const revealed = next.revealedTells + 1
        const nowKnows = revealed >= def.tells.length
        if (nowKnows) transcript.push({ who: 'narrator', text: def.weakness.revealText })
        next = { ...next, revealedTells: revealed, weaknessRevealed: nowKnows }
      }
      // Reading the room means the next hit lands softer.
      next = { ...next, braced: true }
      current = spendEnergy(current, OBSERVE_ENERGY_COST)
      events.push({ type: 'desenroloObserve', revealed: next.revealedTells })
      break
    }

    case 'insist': {
      const damage = 2 + Math.floor(current.player.stats.grit / 2)
      const bonus =
        next.weaknessRevealed && def.weakness.affinity === 'grit' ? def.weakness.multiplier : 1
      const total = Math.round(damage * bonus)
      transcript.push({ who: 'player', text: 'Você insiste. Sem charme, sem pressa.' })
      next = { ...next, patience: Math.max(0, next.patience - total) }
      current = spendEnergy(current, INSIST_ENERGY_COST)
      events.push({ type: 'desenroloInsist', damage: total })
      break
    }

    case 'item': {
      const def_ = items(action.itemId)
      if (!def_?.battle) return { state, events: [] }
      if (itemCount(current, action.itemId) < 1) return { state, events: [] }
      if (def_.battle.oncePerBattle && next.usedItems.includes(action.itemId)) {
        return { state, events: [] }
      }

      transcript.push({ who: 'player', text: def_.battle.text })
      if (def_.battle.patienceDamage) {
        next = { ...next, patience: Math.max(0, next.patience - def_.battle.patienceDamage) }
      }
      if (def_.battle.energyRestore) {
        current = spendEnergy(current, -def_.battle.energyRestore)
      }
      if (def_.consumable !== false && !def_.key) {
        current = withItem(current, action.itemId, -1)
      }
      next = { ...next, usedItems: [...next.usedItems, action.itemId] }
      events.push({ type: 'desenroloItem', itemId: action.itemId })
      break
    }

    case 'beginFight':
    case 'acknowledge':
      return { state, events: [] }
  }

  // --- Did the situation give in? ---
  if (next.patience <= 0) {
    next = {
      ...next,
      phase: 'won',
      transcript: [
        ...transcript,
        ...def.winText.map((text) => ({ who: 'narrator' as const, text })),
      ],
    }
    return {
      state: { ...current, battle: next, rngState: rng.getState() },
      events: [...events, { type: 'desenroloWon', id: def.id, turns: next.turn }],
    }
  }

  // --- The situation pushes back ---
  const move = pickMove(def, next.turn, rng)
  if (move) {
    const raw = move.damage
    const damage = Math.max(1, Math.round(next.braced ? raw * BRACED_REDUCTION : raw))
    transcript.push({ who: 'situation', text: move.text })
    current = spendEnergy(current, damage)
    events.push({ type: 'desenroloPressure', moveId: move.id, damage })
  }

  const outOfTurns = def.turnLimit !== undefined && next.turn >= def.turnLimit
  const drained = current.player.energy <= 0

  if (drained || outOfTurns) {
    next = {
      ...next,
      phase: 'lost',
      transcript: [
        ...transcript,
        ...def.loseText.map((text) => ({ who: 'narrator' as const, text })),
      ],
    }
    return {
      state: { ...current, battle: next, rngState: rng.getState() },
      events: [
        ...events,
        { type: 'desenroloLost', id: def.id, reason: drained ? 'energy' : 'turnLimit' },
      ],
    }
  }

  next = { ...next, turn: next.turn + 1, transcript }
  return { state: { ...current, battle: next, rngState: rng.getState() }, events }
}

function pickMove(
  def: DesenroloDef,
  turn: number,
  rng: ReturnType<typeof createRng>
): SituationMove | undefined {
  const eligible = def.moves.filter((m) => turn >= (m.notBeforeTurn ?? 0))
  if (eligible.length === 0) return undefined

  const total = eligible.reduce((sum, m) => sum + (m.weight ?? 1), 0)
  let roll = rng.next() * total
  for (const move of eligible) {
    roll -= move.weight ?? 1
    if (roll <= 0) return move
  }
  return eligible[eligible.length - 1]
}

/** Applies the outcome effects and hands control back to the world. */
function finish(state: GameState, def: DesenroloDef, phase: 'won' | 'lost'): DesenroloResult {
  const outcome = phase === 'won' ? def.onWin : def.onLose
  const applied = applyEffects(state, outcome)

  let next: GameState = {
    ...applied.state,
    battle: null,
    // A lost Desenrolo leaves you standing, just worse off. Never zero.
    player: {
      ...applied.state.player,
      energy: clamp(applied.state.player.energy, 1, applied.state.player.energyMax),
    },
  }

  if (phase === 'won' && !next.clearedDesenrolos.includes(def.id)) {
    next = { ...next, clearedDesenrolos: [...next.clearedDesenrolos, def.id] }
  }

  // Only return to the world if an effect has not already moved us elsewhere.
  if (next.mode.kind === 'desenrolo') {
    next = { ...next, mode: { kind: 'world' } }
  }

  return { state: next, events: applied.events }
}
