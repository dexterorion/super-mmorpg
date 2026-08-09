import { describe, expect, it } from 'vitest'
import type { Dialogue } from './dialogue/dialogue.js'
import type { DesenroloDef } from './desenrolo/desenrolo.js'
import { GameSession, type ContentBundle } from './session.js'
import { createInitialState } from './state/state.js'

const intro: Dialogue = {
  id: 'dlg_intro',
  start: 'start',
  nodes: { start: { id: 'start', lines: ['Chegou.'] } },
}

function content(
  dialogues: ContentBundle['dialogues'] = { dlg_intro: intro },
  onEnter: NonNullable<ContentBundle['places'][string]['onEnter']> = [{ dialogueId: 'dlg_intro' }]
): ContentBundle {
  return {
    districts: {
      tiete: { id: 'tiete', name: 'Tietê', places: ['tiete_plataforma'], connections: [] },
    },
    places: {
      tiete_plataforma: {
        id: 'tiete_plataforma',
        district: 'tiete',
        name: 'Plataforma',
        exits: [],
        onEnter,
      },
    },
    npcs: {},
    dialogues,
    desenrolos: {},
    items: {},
  }
}

describe('GameSession.begin', () => {
  it('starts the first eligible arrival scene and marks a once trigger', () => {
    const result = new GameSession(content()).begin(
      createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    )

    expect(result.state.mode).toMatchObject({ kind: 'dialogue', dialogueId: 'dlg_intro' })
    expect(result.state.flags['entered:tiete_plataforma:dlg_intro']).toBe(true)
    expect(result.state.elapsedMinutes).toBe(0)
  })

  it('does not repeat a once trigger after returning to the world', () => {
    const session = new GameSession(content())
    const initial = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const first = session.begin(initial).state
    const world = { ...first, mode: { kind: 'world' as const } }

    expect(session.begin(world).state.mode).toEqual({ kind: 'world' })
  })

  it('does not immediately retrigger a repeatable scene after it finishes', () => {
    const session = new GameSession(
      content({ dlg_intro: intro }, [{ dialogueId: 'dlg_intro', once: false }])
    )
    const initial = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const started = session.begin(initial).state
    const finished = session.performById(started, 'advance').state
    expect(finished.mode).toEqual({ kind: 'world' })
  })

  it('fails loudly when arrival scenes move in an infinite loop', () => {
    const toOther: Dialogue = {
      id: 'to_other',
      start: 'start',
      nodes: {
        start: {
          id: 'start',
          lines: [],
          onEnter: [{ kind: 'moveTo', district: 'tiete', place: 'other' }],
          end: true,
        },
      },
    }
    const toStart: Dialogue = {
      id: 'to_start',
      start: 'start',
      nodes: {
        start: {
          id: 'start',
          lines: [],
          onEnter: [{ kind: 'moveTo', district: 'tiete', place: 'tiete_plataforma' }],
          end: true,
        },
      },
    }
    const original = content({ to_other: toOther, to_start: toStart }, [
      { dialogueId: 'to_other', once: false },
    ])
    const bundle: ContentBundle = {
      ...original,
      districts: {
        tiete: {
          ...original.districts.tiete!,
          places: ['tiete_plataforma', 'other'],
        },
      },
      places: {
        ...original.places,
        other: {
          id: 'other',
          district: 'tiete',
          name: 'Outro',
          exits: [],
          onEnter: [{ dialogueId: 'to_start', once: false }],
        },
      },
    }

    expect(() =>
      new GameSession(bundle).begin(createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 }))
    ).toThrow(/arrival trigger loop/i)
  })
})

function playableContent(): ContentBundle {
  const hello: Dialogue = {
    id: 'hello',
    start: 'start',
    nodes: { start: { id: 'start', lines: ['Oi.'] } },
  }
  const queue: DesenroloDef = {
    id: 'queue',
    name: 'Fila',
    intro: ['Demora.'],
    patience: 2,
    arguments: [{ id: 'ask', text: 'Com licença.', topic: 'polite', power: 2 }],
    tells: [{ id: 'clock', text: 'O relógio.' }],
    weakness: { affinity: 'gab', multiplier: 2, revealText: 'Educação ajuda.' },
    moves: [{ id: 'wait', text: 'Espera.', damage: 1 }],
    winText: ['Passou.'],
    loseText: ['Fechou.'],
  }
  return {
    districts: {
      tiete: { id: 'tiete', name: 'Tietê', places: ['a'], connections: ['centro'] },
      centro: { id: 'centro', name: 'Centro', places: ['c'], connections: ['tiete'] },
    },
    places: {
      a: {
        id: 'a',
        district: 'tiete',
        name: 'A',
        station: true,
        exits: [
          { to: 'b', label: 'Ir', energyCost: 3 },
          { to: 'locked', label: 'Fechado', conditions: [{ kind: 'flag', id: 'door' }] },
        ],
        npcs: [{ npcId: 'bia', dialogueId: 'hello' }],
        actions: [
          {
            id: 'work',
            label: 'Trabalhar',
            energyCost: 2,
            once: true,
            effects: [{ kind: 'money', delta: 100 }],
          },
          { id: 'hard', label: 'Difícil', energyCost: 99 },
          {
            id: 'queue',
            label: 'Enfrentar fila',
            effects: [{ kind: 'startDesenrolo', id: 'queue' }],
          },
        ],
      },
      b: { id: 'b', district: 'tiete', name: 'B', exits: [] },
      locked: { id: 'locked', district: 'tiete', name: 'Locked', exits: [] },
      c: { id: 'c', district: 'centro', name: 'C', station: true, exits: [] },
    },
    npcs: { bia: { id: 'bia', name: 'Bia' } },
    dialogues: { hello },
    desenrolos: { queue },
    items: {
      coffee: {
        id: 'coffee',
        name: 'Café',
        description: 'Quente.',
        consumable: true,
        useEffects: [{ kind: 'energy', delta: 5 }],
        battle: { text: 'Um gole.', energyRestore: 5, oncePerBattle: true },
      },
    },
  }
}

describe('GameSession actions', () => {
  it('lists world actions and refuses disabled stable ids', () => {
    const session = new GameSession(playableContent())
    const state = { ...createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 }), place: 'a' }
    const actions = session.availableActions(state)
    expect(actions.map((action) => action.id)).toEqual(
      expect.arrayContaining([
        'talk:bia',
        'do:work',
        'do:hard',
        'walk:b',
        'walk:locked',
        'travel:centro',
      ])
    )
    expect(actions.find((action) => action.id === 'do:hard')).toMatchObject({
      enabled: false,
      lockedReason: 'sem disposição',
    })
    expect(session.performById(state, 'do:hard')).toEqual({ state, events: [] })
  })

  it('walks, charges energy, and rejects nonexistent exits', () => {
    const session = new GameSession(playableContent())
    const state = { ...createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 }), place: 'a' }
    const moved = session.performById(state, 'walk:b')
    expect(moved.state).toMatchObject({ place: 'b', player: { energy: 57 } })
    expect(session.perform(state, { kind: 'walk', to: 'missing' }).state.place).toBe('a')
  })

  it('travels only from a station with credit and advances exact time', () => {
    const session = new GameSession(playableContent())
    const base = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const state = { ...base, place: 'a', player: { ...base.player, transit: 1_000 } }
    const result = session.performById(state, 'travel:centro')
    expect(result.state).toMatchObject({
      district: 'centro',
      place: 'c',
      clock: { period: 'morning', minuteOfDay: 353 },
    })
    const revisiting = session.performById(
      { ...state, visitedDistricts: ['tiete', 'centro'] },
      'travel:centro'
    )
    expect(revisiting.state.visitedDistricts).toEqual(['tiete', 'centro'])
  })

  it('applies the preferred commute mode to time, credit and energy', () => {
    const session = new GameSession(playableContent())
    const base = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const walking = session.performById(
      { ...base, place: 'a', player: { ...base.player, preferredTravelMode: 'walk' } },
      'travel:centro'
    ).state
    expect(walking.clock.minuteOfDay).toBe(439)
    expect(walking.player).toMatchObject({ transit: 0, energy: 47 })

    const bus = session.performById(
      {
        ...base,
        place: 'a',
        player: { ...base.player, preferredTravelMode: 'bus', transit: 1_000 },
      },
      'travel:centro'
    ).state
    expect(bus.clock.minuteOfDay).toBe(368)
    expect(bus.player).toMatchObject({ transit: 500, energy: 57 })
  })

  it('allows free modes without Bilhete credit and explains exhausted routes', () => {
    const session = new GameSession(playableContent())
    const base = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const cycling = {
      ...base,
      place: 'a',
      player: { ...base.player, preferredTravelMode: 'bike' as const },
    }
    expect(
      session.availableActions(cycling).find((action) => action.id === 'travel:centro')
    ).toMatchObject({
      enabled: true,
      label: 'Bike · 47 min → Centro',
    })
    const exhausted = {
      ...cycling,
      player: { ...cycling.player, energy: 2 },
    }
    expect(
      session.availableActions(exhausted).find((action) => action.id === 'travel:centro')
    ).toMatchObject({
      enabled: false,
      lockedReason: 'sem disposição para o trajeto',
    })
  })

  it('runs once-only place actions and consumable items', () => {
    const session = new GameSession(playableContent())
    const base = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const state = {
      ...base,
      place: 'a',
      inventory: { coffee: 1 },
      player: { ...base.player, energy: 40 },
    }
    const worked = session.performById(state, 'do:work')
    expect(worked.state.player.money).toBe(base.player.money + 100)
    expect(session.availableActions(worked.state).some((action) => action.id === 'do:work')).toBe(
      false
    )
    const drank = session.performById(worked.state, 'use:coffee')
    expect(drank.state.inventory.coffee).toBeUndefined()
    expect(drank.state.player.energy).toBe(43)
  })

  it('decrements a consumable stack without removing the remaining items', () => {
    const session = new GameSession(playableContent())
    const base = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const state = { ...base, place: 'a', inventory: { coffee: 2 } }
    expect(session.performById(state, 'use:coffee').state.inventory.coffee).toBe(1)
  })

  it('starts NPC dialogue and presents dialogue actions', () => {
    const session = new GameSession(playableContent())
    const state = { ...createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 }), place: 'a' }
    const talking = session.performById(state, 'talk:bia').state
    expect(session.availableActions(talking)).toEqual([expect.objectContaining({ id: 'advance' })])
    expect(session.performById(talking, 'advance').state.mode).toEqual({ kind: 'world' })
  })

  it('reconciles an effect-started battle and exposes its phases', () => {
    const session = new GameSession(playableContent())
    const base = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const state = { ...base, place: 'a', inventory: { coffee: 1 } }
    const intro = session.performById(state, 'do:queue').state
    expect(session.availableActions(intro)).toEqual([
      expect.objectContaining({ id: 'battle:begin' }),
    ])

    const playing = session.performById(intro, 'battle:begin').state
    expect(session.availableActions(playing).map((action) => action.id)).toEqual(
      expect.arrayContaining([
        'battle:argue:ask',
        'battle:observe',
        'battle:insist',
        'battle:item:coffee',
      ])
    )

    const observed = session.performById(playing, 'battle:observe').state
    expect(
      session.availableActions(observed).find((action) => action.id === 'battle:observe')
    ).toMatchObject({
      enabled: false,
      lockedReason: 'já entendeu tudo',
    })

    const won = session.performById(playing, 'battle:argue:ask').state
    expect(session.availableActions(won)).toEqual([expect.objectContaining({ id: 'battle:ack' })])
    expect(session.performById(won, 'battle:ack').state.mode).toEqual({ kind: 'world' })
  })

  it('recovers an exhausted player in world mode', () => {
    const session = new GameSession(playableContent())
    const base = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const state = { ...base, place: 'a', player: { ...base.player, energy: 0 } }
    expect(session.begin(state).state).toMatchObject({
      clock: { day: 2, period: 'morning' },
      player: { energy: 36 },
    })
  })

  it('safely rejects actions that are invalid for the current world state', () => {
    const session = new GameSession(playableContent())
    const base = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const state = { ...base, place: 'a' }

    expect(session.perform(state, { kind: 'talk', npcId: 'missing' })).toEqual({
      state,
      events: [],
    })
    expect(session.perform(state, { kind: 'placeAction', actionId: 'missing' }).events).toEqual([])
    expect(session.perform(state, { kind: 'useItem', itemId: 'missing' }).events).toEqual([])
    expect(session.perform(state, { kind: 'travel', to: 'centro' }).state.district).toBe('tiete')
    expect(session.availableActions({ ...state, place: 'missing' })).toEqual([])
    expect(
      session.availableActions({ ...state, mode: { kind: 'ended', endingId: 'done' } })
    ).toEqual([])
  })

  it('rejects travel outside the current district connection graph', () => {
    const bundle = playableContent()
    const session = new GameSession({
      ...bundle,
      districts: {
        ...bundle.districts,
        bixiga: { id: 'bixiga', name: 'Bixiga', places: ['d'], connections: [] },
      },
      places: {
        ...bundle.places,
        d: { id: 'd', district: 'bixiga', name: 'D', station: true, exits: [] },
      },
    })
    const base = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const state = { ...base, place: 'a', player: { ...base.player, transit: 1_000 } }
    expect(session.perform(state, { kind: 'travel', to: 'bixiga' })).toEqual({ state, events: [] })
  })

  it('fails loudly for missing content referenced by derived modes', () => {
    const session = new GameSession(playableContent())
    const base = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    expect(() =>
      session.begin({ ...base, mode: { kind: 'desenrolo', desenroloId: 'missing' } })
    ).toThrow(/Missing Desenrolo/)

    const bundle = content({}, [{ dialogueId: 'missing' }])
    expect(() => new GameSession(bundle).begin(base)).toThrow(/Missing dialogue/)
  })

  it('labels non-gab skill checks in the shared action vocabulary', () => {
    const checked: Dialogue = {
      id: 'checked',
      start: 'start',
      nodes: {
        start: {
          id: 'start',
          lines: ['Escolha.'],
          choices: [
            {
              id: 'look',
              text: 'Olhar',
              check: { affinity: 'instinct', difficulty: 5, success: 'end', failure: 'end' },
            },
            {
              id: 'hold',
              text: 'Aguentar',
              check: { affinity: 'grit', difficulty: 5, success: 'end', failure: 'end' },
            },
          ],
        },
        end: { id: 'end', lines: [], end: true },
      },
    }
    const bundle = playableContent()
    const session = new GameSession({ ...bundle, dialogues: { ...bundle.dialogues, checked } })
    const state = createInitialState({ name: 'Zé', hometown: 'bauru', seed: 7 })
    const started = session.begin({
      ...state,
      mode: { kind: 'dialogue', dialogueId: 'checked', nodeId: 'start', lineIndex: 0 },
    }).state
    expect(session.availableActions(started).map((action) => action.label)).toEqual([
      expect.stringContaining('Faro'),
      expect.stringContaining('Fôlego'),
    ])
  })
})
