import { describe, expect, it } from 'vitest'
import { advance, checkOdds, choose, getView, startDialogue, type Dialogue } from './dialogue.js'
import { createInitialState, withFlag } from '../state/state.js'

const base = () => createInitialState({ name: 'Ana', hometown: 'bauru', seed: 42 })

const dialogue: Dialogue = {
  id: 'test',
  start: 'start',
  nodes: {
    start: {
      id: 'start',
      lines: ['Primeiro.', 'Segundo.'],
      choices: [
        { id: 'locked', text: 'Trancada', conditions: [{ kind: 'flag', id: 'open' }], next: 'end' },
        {
          id: 'roll',
          text: 'Tentar',
          check: { affinity: 'gab', difficulty: 1, success: 'end', failure: 'fail' },
        },
      ],
    },
    end: { id: 'end', lines: ['Fim.'], end: true },
    fail: { id: 'fail', lines: ['Falhou.'] },
  },
}
const lookup = (id: string) => (id === dialogue.id ? dialogue : undefined)

describe('dialogue', () => {
  it('returns no view outside dialogue mode or for missing content', () => {
    expect(getView(base(), lookup)).toBeUndefined()
    const started = startDialogue(base(), dialogue).state
    expect(getView(started, () => undefined)).toBeUndefined()
  })

  it('advances balloon by balloon and exposes choices only at the end', () => {
    const started = startDialogue(base(), dialogue).state
    expect(getView(started, lookup)?.line).toBe('Primeiro.')
    const next = advance(started, lookup).state
    expect(getView(next, lookup)).toMatchObject({ line: 'Segundo.', canAdvance: false })
  })

  it('ignores a forced locked choice and ends after an enabled choice', () => {
    const lastLine = advance(startDialogue(base(), dialogue).state, lookup).state
    expect(choose(lastLine, lookup, 'locked').state).toBe(lastLine)

    const open = withFlag(lastLine, 'open', true)
    expect(choose(open, lookup, 'locked').state.mode).toEqual({ kind: 'world' })
  })

  it('hides hidden locked choices and refuses unknown choices', () => {
    const hidden: Dialogue = {
      id: 'hidden',
      start: 'start',
      nodes: {
        start: {
          id: 'start',
          lines: ['Escolha.'],
          choices: [
            {
              id: 'secret',
              text: 'Segredo',
              hideWhenLocked: true,
              conditions: [{ kind: 'flag', id: 'secret' }],
            },
          ],
        },
      },
    }
    const state = startDialogue(base(), hidden).state
    expect(getView(state, (id) => (id === 'hidden' ? hidden : undefined))?.choices).toEqual([])
    expect(choose(state, () => hidden, 'missing').state).toBe(state)
  })

  it('follows fallback nodes and rejects fallback cycles', () => {
    const routed: Dialogue = {
      id: 'routed',
      start: 'gate',
      nodes: {
        gate: { id: 'gate', lines: [], conditions: [{ kind: 'flag', id: 'nope' }], fallback: 'ok' },
        ok: { id: 'ok', lines: ['Alternativa.'] },
      },
    }
    expect(startDialogue(base(), routed).state.mode).toMatchObject({ nodeId: 'ok' })

    const cyclic: Dialogue = {
      id: 'cyclic',
      start: 'a',
      nodes: {
        a: { id: 'a', lines: [], conditions: [{ kind: 'flag', id: 'nope' }], fallback: 'b' },
        b: { id: 'b', lines: [], conditions: [{ kind: 'flag', id: 'nope' }], fallback: 'a' },
      },
    }
    expect(() => startDialogue(base(), cyclic)).toThrow(/fallback cycle/)
  })

  it('handles gated dead ends, pure routers, and missing nodes', () => {
    const gated: Dialogue = {
      id: 'gated',
      start: 'gate',
      nodes: {
        gate: { id: 'gate', lines: [], conditions: [{ kind: 'flag', id: 'nope' }] },
      },
    }
    expect(startDialogue(base(), gated).state.mode).toEqual({ kind: 'world' })

    const router: Dialogue = {
      id: 'router',
      start: 'route',
      nodes: {
        route: { id: 'route', lines: [], next: 'shown' },
        shown: { id: 'shown', lines: ['Aqui.'] },
      },
    }
    expect(startDialogue(base(), router).state.mode).toMatchObject({ nodeId: 'shown' })

    const broken: Dialogue = { id: 'broken', start: 'missing', nodes: {} }
    expect(() => startDialogue(base(), broken)).toThrow(/missing node/)
  })

  it('does not advance while choices wait and follows next nodes', () => {
    const lastLine = advance(startDialogue(base(), dialogue).state, lookup).state
    expect(advance(lastLine, lookup).state).toBe(lastLine)

    const linear: Dialogue = {
      id: 'linear',
      start: 'a',
      nodes: {
        a: { id: 'a', lines: ['A'], next: 'b' },
        b: { id: 'b', lines: ['B'] },
      },
    }
    const linearLookup = (id: string) => (id === 'linear' ? linear : undefined)
    const a = startDialogue(base(), linear).state
    expect(advance(a, linearLookup).state.mode).toMatchObject({ nodeId: 'b' })
    expect(advance(a, () => undefined).state.mode).toEqual({ kind: 'world' })
  })

  it('calculates guaranteed and impossible checks', () => {
    expect(checkOdds(10, 1)).toBe(1)
    expect(checkOdds(0, 11)).toBe(0)
    expect(checkOdds(2, 7)).toBe(0.6)
  })

  it('updates rng state when resolving a skill check', () => {
    const lastLine = advance(startDialogue(base(), dialogue).state, lookup).state
    const result = choose(lastLine, lookup, 'roll')
    expect(result.state.rngState).not.toBe(lastLine.rngState)
    expect(result.events).toEqual([expect.objectContaining({ type: 'skillCheck', success: true })])
  })

  it('restores the requested return mode', () => {
    const parent = { kind: 'desenrolo' as const, desenroloId: 'queue' }
    const terminal: Dialogue = {
      id: 'terminal',
      start: 'end',
      nodes: { end: { id: 'end', lines: [], end: true } },
    }
    expect(startDialogue(base(), terminal, parent).state.mode).toEqual(parent)
  })
})
