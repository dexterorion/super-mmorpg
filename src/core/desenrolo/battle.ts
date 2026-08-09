import type { DesenroloId, ItemId } from '../types.js'

/**
 * The runtime state of an in-progress Desenrolo.
 *
 * It lives in its own module (with no dependency on GameState) so that
 * GameState can embed it without a circular import.
 */

export interface BattleLine {
  readonly who: 'player' | 'situation' | 'narrator'
  readonly text: string
}

export interface DesenroloBattle {
  readonly id: DesenroloId
  readonly patience: number
  readonly patienceMax: number
  readonly turn: number
  /** How many times each argument topic has been used — drives diminishing returns. */
  readonly topicUses: Readonly<Record<string, number>>
  readonly revealedTells: number
  readonly weaknessRevealed: boolean
  readonly usedItems: readonly ItemId[]
  /** Lines to display since the last player action. */
  readonly transcript: readonly BattleLine[]
  readonly phase: 'intro' | 'playing' | 'won' | 'lost'
  /** Observar last turn means the next hit lands softer. */
  readonly braced: boolean
}
