import { describe, expect, it } from 'vitest'
import {
  createInitialState,
  getAffinity,
  getFlag,
  hasItem,
  isDesenroloCleared,
  isFlagTrue,
  isQuestActive,
  isQuestDone,
  questStatus,
  withFlag,
  withItem,
  withJournalEntry,
  withRelationship,
  withSeenNode,
} from './state.js'

describe('state selectors and immutable helpers', () => {
  it('reads and updates domain collections without mutating the source', () => {
    const initial = createInitialState({ name: 'Ana', hometown: 'bauru', seed: 1 })
    const flagged = withFlag(initial, 'ready', true)
    const stocked = withItem(flagged, 'coffee', 2)
    const removed = withItem(stocked, 'coffee', -2)
    const related = withRelationship(initial, 'bia', 99)
    const estranged = withRelationship(initial, 'bia', -99)
    const seen = withSeenNode(initial, 'hello')
    const seenAgain = withSeenNode(seen, 'hello')
    const journal = withJournalEntry(initial, { id: 'lesson', text: 'Aprendi.', kind: 'lesson' })
    const journalAgain = withJournalEntry(journal, { id: 'lesson', text: 'Outra.', kind: 'lesson' })

    expect(getFlag(flagged, 'ready')).toBe(true)
    expect(isFlagTrue(flagged, 'ready')).toBe(true)
    expect(hasItem(stocked, 'coffee', 2)).toBe(true)
    expect(removed.inventory.coffee).toBeUndefined()
    expect(related.relationships.bia).toBe(5)
    expect(estranged.relationships.bia).toBe(-3)
    expect(seenAgain).toBe(seen)
    expect(journalAgain).toBe(journal)
    expect(initial.flags).toEqual({})
    expect(getAffinity(initial, 'grit')).toBe(2)
  })

  it('reports quest and cleared-state selectors', () => {
    const initial = createInitialState({ name: 'Ana', hometown: 'bauru', seed: 1 })
    const state = {
      ...initial,
      quests: {
        active: { status: 'active' as const, step: 0, startedOnDay: 1 },
        done: { status: 'done' as const, step: 1, startedOnDay: 1 },
      },
      clearedDesenrolos: ['queue'],
    }
    expect(questStatus(state, 'active')?.step).toBe(0)
    expect(isQuestActive(state, 'active')).toBe(true)
    expect(isQuestDone(state, 'done')).toBe(true)
    expect(isDesenroloCleared(state, 'queue')).toBe(true)
  })
})
