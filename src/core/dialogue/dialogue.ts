import type { Affinity, DialogueId, GameEvent, NodeId, NpcId } from '../types.js'
import type { Condition } from '../rules/conditions.js'
import type { Effect } from '../rules/effects.js'
import { describeUnmet, evaluateAll } from '../rules/conditions.js'
import { applyEffects } from '../rules/effects.js'
import { withSeenNode, type GameState } from '../state/state.js'
import { createRng } from '../rng/rng.js'

/**
 * Dialogue is a graph of nodes; a node is a few balloons and then either a
 * jump or a set of choices.
 *
 * The writing rules from the design (max 2 visual lines per balloon, max 6
 * balloons before handing control back) are enforced by the content linter,
 * not by this engine — the engine stays dumb so the rules can change without
 * touching it.
 */

export type Speaker = NpcId

/** A dice-visible skill check. The player always sees the numbers. */
export interface SkillCheck {
  readonly affinity: Affinity
  /** Roll is d10 + affinity; meeting or beating this succeeds. */
  readonly difficulty: number
  readonly success: NodeId
  readonly failure: NodeId
}

export interface Choice {
  readonly id: string
  readonly text: string
  readonly conditions?: readonly Condition[]
  /** When locked: hide it entirely, or show it greyed with the reason (default). */
  readonly hideWhenLocked?: boolean
  readonly effects?: readonly Effect[]
  readonly next?: NodeId
  readonly check?: SkillCheck
  /** Marks the option that closes the conversation, for content linting. */
  readonly exit?: boolean
}

export interface DialogueNode {
  readonly id: NodeId
  readonly speaker?: Speaker
  readonly lines: readonly string[]
  /** If unmet on entry, jump to `fallback` instead of showing this node. */
  readonly conditions?: readonly Condition[]
  readonly fallback?: NodeId
  readonly onEnter?: readonly Effect[]
  readonly choices?: readonly Choice[]
  readonly next?: NodeId
  /** Terminal node: returns control to the world. */
  readonly end?: boolean
}

export interface Dialogue {
  readonly id: DialogueId
  readonly start: NodeId
  readonly nodes: Readonly<Record<NodeId, DialogueNode>>
}

export type DialogueLookup = (id: DialogueId) => Dialogue | undefined

// --- View (what the UI and the bot both read) ---------------------------

export interface ChoiceView {
  readonly id: string
  readonly text: string
  readonly enabled: boolean
  /** e.g. "Lábia 4" — why it is greyed out. */
  readonly lockedReason?: string
  readonly check?: {
    readonly affinity: Affinity
    readonly difficulty: number
    readonly odds: number
  }
}

export interface DialogueView {
  readonly dialogueId: DialogueId
  readonly nodeId: NodeId
  readonly speaker: Speaker
  readonly line: string
  readonly lineIndex: number
  readonly lineCount: number
  /** Choices are only offered on the last balloon of a node. */
  readonly choices: readonly ChoiceView[]
  readonly canAdvance: boolean
}

const DIE = 10

/** Probability that d10 + affinity >= difficulty, as a 0..1 value. */
export function checkOdds(affinityValue: number, difficulty: number): number {
  const needed = difficulty - affinityValue
  if (needed <= 1) return 1
  if (needed > DIE) return 0
  return (DIE - needed + 1) / DIE
}

export function getView(state: GameState, lookup: DialogueLookup): DialogueView | undefined {
  if (state.mode.kind !== 'dialogue') return undefined
  const dialogue = lookup(state.mode.dialogueId)
  const node = dialogue?.nodes[state.mode.nodeId]
  if (!dialogue || !node) return undefined

  const lineIndex = Math.min(state.mode.lineIndex, Math.max(0, node.lines.length - 1))
  const isLastLine = lineIndex >= node.lines.length - 1

  const choices: ChoiceView[] =
    isLastLine && node.choices
      ? node.choices
          .filter((choice) => {
            const ok = evaluateAll(state, choice.conditions)
            return ok || !choice.hideWhenLocked
          })
          .map((choice) => {
            const enabled = evaluateAll(state, choice.conditions)
            const unmet = choice.conditions?.find((c) => !evaluateAll(state, [c]))
            return {
              id: choice.id,
              text: choice.text,
              enabled,
              ...(enabled ? {} : { lockedReason: unmet ? describeUnmet(unmet) : 'ainda não' }),
              ...(choice.check
                ? {
                    check: {
                      affinity: choice.check.affinity,
                      difficulty: choice.check.difficulty,
                      odds: checkOdds(
                        state.player.stats[choice.check.affinity],
                        choice.check.difficulty
                      ),
                    },
                  }
                : {}),
            }
          })
      : []

  return {
    dialogueId: dialogue.id,
    nodeId: node.id,
    speaker: node.speaker ?? 'narrator',
    line: node.lines[lineIndex] ?? '',
    lineIndex,
    lineCount: node.lines.length,
    choices,
    canAdvance: choices.length === 0,
  }
}

// --- Transitions --------------------------------------------------------

export interface DialogueResult {
  readonly state: GameState
  readonly events: readonly GameEvent[]
}

export function startDialogue(
  state: GameState,
  dialogue: Dialogue,
  returnTo?: GameState['mode']
): DialogueResult {
  const staged: GameState = {
    ...state,
    mode: {
      kind: 'dialogue',
      dialogueId: dialogue.id,
      nodeId: dialogue.start,
      lineIndex: 0,
      ...(returnTo ? { returnTo } : {}),
    },
  }
  return enterNode(staged, dialogue, dialogue.start)
}

/**
 * Moves into a node: resolves its entry conditions (following `fallback`
 * chains), applies `onEnter` effects, and marks it seen.
 */
function enterNode(state: GameState, dialogue: Dialogue, nodeId: NodeId): DialogueResult {
  const events: GameEvent[] = []
  let current = state
  let targetId: NodeId | undefined = nodeId
  const guard = new Set<NodeId>()

  while (targetId) {
    if (guard.has(targetId)) {
      // A fallback cycle is a content bug; fail loudly rather than hang.
      throw new Error(`Dialogue "${dialogue.id}": fallback cycle at node "${targetId}"`)
    }
    guard.add(targetId)

    const node: DialogueNode | undefined = dialogue.nodes[targetId]
    if (!node) throw new Error(`Dialogue "${dialogue.id}": missing node "${targetId}"`)

    if (!evaluateAll(current, node.conditions)) {
      if (!node.fallback) {
        // No fallback and gated shut: treat as the end of the conversation.
        return { state: exitDialogue(current), events }
      }
      targetId = node.fallback
      continue
    }

    current = withSeenNode(current, node.id)
    const applied = applyEffects(current, node.onEnter)
    current = applied.state
    events.push(...applied.events)

    // An onEnter effect may have moved us elsewhere (a Desenrolo, an ending).
    if (current.mode.kind !== 'dialogue') return { state: current, events }

    current = {
      ...current,
      mode: { ...current.mode, dialogueId: dialogue.id, nodeId: node.id, lineIndex: 0 },
    }

    if (node.end) return { state: exitDialogue(current), events }

    // A node with no lines and no choices is a pure router.
    if (node.lines.length === 0 && !node.choices) {
      if (!node.next) return { state: exitDialogue(current), events }
      targetId = node.next
      continue
    }

    return { state: current, events }
  }

  return { state: current, events }
}

function exitDialogue(state: GameState): GameState {
  const returnTo = state.mode.kind === 'dialogue' ? state.mode.returnTo : undefined
  return { ...state, mode: returnTo ?? { kind: 'world' } }
}

/** Advances one balloon; at the end of a node follows `next` or exits. */
export function advance(state: GameState, lookup: DialogueLookup): DialogueResult {
  if (state.mode.kind !== 'dialogue') return { state, events: [] }
  const dialogue = lookup(state.mode.dialogueId)
  if (!dialogue) return { state: exitDialogue(state), events: [] }
  const node = dialogue.nodes[state.mode.nodeId]
  if (!node) return { state: exitDialogue(state), events: [] }

  const isLastLine = state.mode.lineIndex >= node.lines.length - 1

  if (!isLastLine) {
    return {
      state: { ...state, mode: { ...state.mode, lineIndex: state.mode.lineIndex + 1 } },
      events: [],
    }
  }

  // Choices are waiting; advancing is not the player's move here.
  if (node.choices && node.choices.length > 0) return { state, events: [] }

  if (node.next) return enterNode(state, dialogue, node.next)
  return { state: exitDialogue(state), events: [] }
}

export function choose(state: GameState, lookup: DialogueLookup, choiceId: string): DialogueResult {
  if (state.mode.kind !== 'dialogue') return { state, events: [] }
  const dialogue = lookup(state.mode.dialogueId)
  const node = dialogue?.nodes[state.mode.nodeId]
  if (!dialogue || !node?.choices) return { state, events: [] }

  const choice = node.choices.find((c) => c.id === choiceId)
  if (!choice) return { state, events: [] }
  if (!evaluateAll(state, choice.conditions)) return { state, events: [] }

  const events: GameEvent[] = []
  let current = state

  const applied = applyEffects(current, choice.effects)
  current = applied.state
  events.push(...applied.events)

  if (current.mode.kind !== 'dialogue') return { state: current, events }

  if (choice.check) {
    const rng = createRng(current.rngState)
    const roll = rng.int(1, DIE)
    const total = roll + current.player.stats[choice.check.affinity]
    const success = total >= choice.check.difficulty
    current = { ...current, rngState: rng.getState() }
    events.push({
      type: 'skillCheck',
      affinity: choice.check.affinity,
      roll,
      total,
      difficulty: choice.check.difficulty,
      success,
    })
    const target = success ? choice.check.success : choice.check.failure
    return mergeEvents(enterNode(current, dialogue, target), events)
  }

  if (choice.exit || !choice.next) return { state: exitDialogue(current), events }
  return mergeEvents(enterNode(current, dialogue, choice.next), events)
}

function mergeEvents(result: DialogueResult, before: readonly GameEvent[]): DialogueResult {
  return { state: result.state, events: [...before, ...result.events] }
}
