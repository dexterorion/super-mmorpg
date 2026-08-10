import { describe, expect, it } from 'vitest'
import type { Condition } from '../core/rules/conditions.js'
import type { Effect } from '../core/rules/effects.js'
import { GameSession } from '../core/session.js'
import { createInitialState, type GameState } from '../core/state/state.js'
import { content } from './index.js'
import {
  dialogueSchema,
  desenroloSchema,
  districtSchema,
  itemSchema,
  npcSchema,
  placeSchema,
} from './schema/index.js'

const effects = (list?: readonly Effect[]) => list ?? []
const conditions = (list?: readonly Condition[]) => list ?? []

describe('Act 1 content', () => {
  it('offers an exclusive, sourced community-network choice without proselytism', () => {
    const dialogue = content.dialogues.dlg_rede_comunitaria
    expect(dialogue).toBeDefined()
    if (!dialogue) return
    const choices = dialogue.nodes.start?.choices ?? []
    expect(choices.map((choice) => choice.id)).toEqual([
      'mutirao_comunitario',
      'encaminhamento_cras',
    ])
    for (const choice of choices) {
      expect(choice.effects).toContainEqual(expect.objectContaining({ kind: 'flag', value: true }))
      expect(choice.effects).toContainEqual(
        expect.objectContaining({
          kind: 'journal',
          source: expect.objectContaining({ url: expect.stringMatching(/^https:\/\//) }),
        })
      )
    }
    expect(dialogue.nodes.start?.lines.join(' ')).toContain('sem exigir culto ou conversão')
  })

  it.each([
    ['mutirao_comunitario', 'network:community_mutual_aid'],
    ['encaminhamento_cras', 'network:public_assistance_referral'],
  ] as const)('persists the %s community-network route', (choiceId, flagId) => {
    const session = new GameSession(content)
    const initial = createInitialState({ name: 'Jaci', hometown: 'prudente', seed: 4 })
    let state: GameState = {
      ...initial,
      district: 'zona_leste',
      place: 'zona_leste_radial',
      mode: { kind: 'world' as const },
    }
    state = session.performById(state, 'talk:pastora_nadia').state
    state = session.performById(state, 'advance').state
    state = session.performById(state, 'advance').state
    state = session.performById(state, `choice:${choiceId}`).state
    expect(state.flags[flagId]).toBe(true)
    expect(state.journal.at(-1)?.source?.url).toMatch(/^https:\/\//)
    expect(
      session.availableActions(state).some((action) => action.id === 'talk:pastora_nadia')
    ).toBe(false)
  })

  it('matches every runtime schema', () => {
    Object.values(content.dialogues).forEach((value) =>
      expect(() => dialogueSchema.parse(value)).not.toThrow()
    )
    Object.values(content.desenrolos).forEach((value) =>
      expect(() => desenroloSchema.parse(value)).not.toThrow()
    )
    Object.values(content.districts).forEach((value) =>
      expect(() => districtSchema.parse(value)).not.toThrow()
    )
    Object.values(content.places).forEach((value) =>
      expect(() => placeSchema.parse(value)).not.toThrow()
    )
    Object.values(content.items).forEach((value) =>
      expect(() => itemSchema.parse(value)).not.toThrow()
    )
    Object.values(content.npcs).forEach((value) =>
      expect(() => npcSchema.parse(value)).not.toThrow()
    )
  })

  it('has no orphaned references', () => {
    const effectRefs = (effect: Effect) => {
      if (effect.kind === 'item') expect(content.items[effect.id]).toBeDefined()
      if (effect.kind === 'startDialogue') expect(content.dialogues[effect.id]).toBeDefined()
      if (effect.kind === 'startDesenrolo') expect(content.desenrolos[effect.id]).toBeDefined()
      if (effect.kind === 'moveTo') {
        expect(content.districts[effect.district]).toBeDefined()
        expect(content.places[effect.place]).toBeDefined()
      }
    }
    for (const dialogue of Object.values(content.dialogues))
      for (const node of Object.values(dialogue.nodes)) {
        for (const ref of [node.next, node.fallback])
          if (ref) expect(dialogue.nodes[ref]).toBeDefined()
        effects(node.onEnter).forEach(effectRefs)
        for (const choice of node.choices ?? []) {
          for (const ref of [choice.next, choice.check?.success, choice.check?.failure])
            if (ref) expect(dialogue.nodes[ref]).toBeDefined()
          effects(choice.effects).forEach(effectRefs)
        }
      }
    for (const place of Object.values(content.places)) {
      expect(content.districts[place.district]).toBeDefined()
      place.exits.forEach((exit) => expect(content.places[exit.to]).toBeDefined())
      place.onEnter?.forEach((trigger) =>
        expect(content.dialogues[trigger.dialogueId]).toBeDefined()
      )
      place.npcs?.forEach((presence) => {
        expect(content.npcs[presence.npcId]).toBeDefined()
        expect(content.dialogues[presence.dialogueId]).toBeDefined()
      })
      place.actions?.flatMap((action) => effects(action.effects)).forEach(effectRefs)
    }
    for (const district of Object.values(content.districts)) {
      district.places.forEach((place) => expect(content.places[place]).toBeDefined())
      district.connections.forEach((target) => expect(content.districts[target]).toBeDefined())
    }
    for (const battle of Object.values(content.desenrolos))
      [...effects(battle.onWin), ...effects(battle.onLose)].forEach(effectRefs)
  })

  it('has reachable dialogue nodes, live terminals, short text, and no fallback cycles', () => {
    for (const dialogue of Object.values(content.dialogues)) {
      const reached = new Set<string>()
      const queue = [dialogue.start]
      while (queue.length) {
        const nodeId = queue.shift()!
        if (reached.has(nodeId)) continue
        reached.add(nodeId)
        const node = dialogue.nodes[nodeId]!
        const refs = [node.next, node.fallback]
        node.choices?.forEach((choice) =>
          refs.push(choice.next, choice.check?.success, choice.check?.failure)
        )
        refs.filter((ref): ref is string => Boolean(ref)).forEach((ref) => queue.push(ref))
      }
      expect([...reached].sort()).toEqual(Object.keys(dialogue.nodes).sort())
      for (const node of Object.values(dialogue.nodes)) {
        expect(
          node.next !== undefined || (node.choices?.length ?? 0) > 0 || node.end === true
        ).toBe(true)
        expect(node.lines.length).toBeLessThanOrEqual(6)
        node.lines.forEach((line) => expect(line.length).toBeLessThanOrEqual(90))
        const seen = new Set<string>()
        let cursor = node.fallback
        while (cursor) {
          expect(seen.has(cursor)).toBe(false)
          seen.add(cursor)
          cursor = dialogue.nodes[cursor]?.fallback
        }
      }
    }
  })

  it('connects the complete world from the starting platform', () => {
    const reachedPlaces = new Set<string>()
    const reachedDistricts = new Set<string>()
    const queue = ['tiete_plataforma']
    while (queue.length) {
      const placeId = queue.shift()!
      if (reachedPlaces.has(placeId)) continue
      reachedPlaces.add(placeId)
      const place = content.places[placeId]!
      reachedDistricts.add(place.district)
      place.exits.forEach((exit) => queue.push(exit.to))
      if (place.station)
        content.districts[place.district]!.connections.forEach((district) =>
          content.districts[district]!.places.filter((id) => content.places[id]!.station).forEach(
            (id) => queue.push(id)
          )
        )
    }
    expect([...reachedPlaces].sort()).toEqual(Object.keys(content.places).sort())
    expect([...reachedDistricts].sort()).toEqual(Object.keys(content.districts).sort())
  })

  it('gives every featured cultural place a meaningful interaction', () => {
    const culturalPlaces = [
      'centro_copan',
      'centro_ccsp',
      'bixiga_vai_vai',
      'paulista_masp',
      'ibirapuera_marquise',
    ]
    culturalPlaces.forEach((placeId) => {
      const place = content.places[placeId]
      expect(place, placeId).toBeDefined()
      expect(
        place!.actions?.some((action) => action.effects?.length),
        placeId
      ).toBe(true)
    })
  })

  it('makes every Desenrolo winnable before its turn limit', () => {
    for (const battle of Object.values(content.desenrolos)) {
      const turns = battle.turnLimit ?? 99
      const damage = [...battle.arguments]
        .filter((arg) => !arg.rebutted)
        .sort((a, b) => b.power - a.power)
        .slice(0, turns)
        .reduce((sum, arg) => sum + arg.power + 1, 0)
      expect(damage, battle.id).toBeGreaterThanOrEqual(battle.patience)
    }
  })

  it('only references inspectable conditions', () => {
    for (const place of Object.values(content.places)) {
      place.exits
        .flatMap((exit) => conditions(exit.conditions))
        .forEach((condition) => expect(condition.kind).toBeTruthy())
    }
  })
})
