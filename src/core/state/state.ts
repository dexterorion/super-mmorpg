import type {
  ActId,
  ArchetypeId,
  Affinity,
  Centavos,
  DesenroloId,
  DialogueId,
  DistrictId,
  FlagId,
  FlagValue,
  Hometown,
  HousingId,
  ItemId,
  NodeId,
  NpcId,
  Period,
  PlaceId,
  QuestId,
} from '../types.js'
import type { DesenroloBattle } from '../desenrolo/battle.js'

/**
 * The whole game, as one plain serialisable object.
 *
 * Everything is readonly and every mutation returns a new state. That is what
 * lets the playtest harness fork a state, explore a branch, and throw it away
 * — which is how we search for softlocks without replaying from the start.
 */

export const SCHEMA_VERSION = 3

export interface PlayerStats {
  /** Manha — the level. Rises by learning about the city, never by fighting. */
  readonly savvy: number
  readonly savvyXp: number
  /** Lábia */
  readonly gab: number
  /** Faro */
  readonly instinct: number
  /** Fôlego */
  readonly grit: number
}

export const AFFINITY_MAX = 10
export const SAVVY_MAX = 10

export interface PlayerState {
  readonly name: string
  readonly hometown: Hometown
  readonly archetype: ArchetypeId
  readonly occupation: string
  readonly monthlyIncome: Centavos
  readonly housing: HousingId
  readonly monthlyRent: Centavos
  readonly stats: PlayerStats
  /** Grana, in centavos. */
  readonly money: Centavos
  /** Disposição. Hits 0 → the day ends badly, never a game over. */
  readonly energy: number
  readonly energyMax: number
  /** Bilhete Único balance, in centavos. */
  readonly transit: Centavos
}

export interface Clock {
  readonly day: number
  readonly period: Period
}

export interface QuestProgress {
  readonly status: 'active' | 'done' | 'failed'
  readonly step: number
  /** Day the quest was picked up — used for pacing checks. */
  readonly startedOnDay: number
}

export interface JournalEntry {
  /** Stable id so the same lesson is never written twice. */
  readonly id: string
  readonly day: number
  readonly text: string
  readonly kind: 'objective' | 'lesson' | 'contact'
}

export type Mode =
  | { readonly kind: 'world' }
  | {
      readonly kind: 'dialogue'
      readonly dialogueId: DialogueId
      readonly nodeId: NodeId
      /** Which balloon of the node is on screen. */
      readonly lineIndex: number
      /** Where to return once the dialogue ends (a nested dialogue can stack). */
      readonly returnTo?: Mode
    }
  | { readonly kind: 'desenrolo'; readonly desenroloId: DesenroloId }
  | { readonly kind: 'ended'; readonly endingId: string }

export interface GameState {
  readonly schemaVersion: number
  readonly seed: number
  readonly rngState: number

  readonly player: PlayerState
  readonly clock: Clock
  readonly act: ActId
  readonly mode: Mode

  /** In-progress Desenrolo, or null while walking around. */
  readonly battle: DesenroloBattle | null

  readonly district: DistrictId
  readonly place: PlaceId
  readonly visitedDistricts: readonly DistrictId[]

  readonly flags: Readonly<Record<FlagId, FlagValue>>
  readonly quests: Readonly<Record<QuestId, QuestProgress>>
  readonly journal: readonly JournalEntry[]
  readonly inventory: Readonly<Record<ItemId, number>>
  /** -3 (burned a bridge) .. +5 (would show up in the rain for you). */
  readonly relationships: Readonly<Record<NpcId, number>>

  /** Dialogue nodes already seen, so NPCs stop repeating themselves. */
  readonly seenNodes: readonly NodeId[]
  /** Desenrolos already won, so bosses do not respawn. */
  readonly clearedDesenrolos: readonly DesenroloId[]

  /** Real-play minutes, estimated by the harness for pacing checks. */
  readonly elapsedMinutes: number
}

export interface NewGameOptions {
  readonly name: string
  readonly hometown: Hometown
  readonly seed: number
  readonly archetype?: ArchetypeId
  readonly profile?: {
    readonly startingMoney: Centavos
    readonly energy: number
    readonly stats: PlayerStats
    readonly occupation: string
    readonly monthlyIncome: Centavos
    readonly housing: HousingId
    readonly monthlyRent: Centavos
  }
}

export const STARTING_MONEY: Centavos = 34_000 // R$ 340,00
export const STARTING_ENERGY = 60

export function createInitialState(options: NewGameOptions): GameState {
  const archetype = options.archetype ?? 'artista'
  const profile = options.profile
  return {
    schemaVersion: SCHEMA_VERSION,
    seed: options.seed,
    rngState: options.seed >>> 0,

    player: {
      name: options.name,
      hometown: options.hometown,
      archetype,
      occupation: profile?.occupation ?? 'Produção cultural',
      monthlyIncome: profile?.monthlyIncome ?? 190_000,
      housing: profile?.housing ?? 'pensao_bixiga',
      monthlyRent: profile?.monthlyRent ?? 95_000,
      stats: profile?.stats ?? { savvy: 1, savvyXp: 0, gab: 1, instinct: 1, grit: 2 },
      money: profile?.startingMoney ?? STARTING_MONEY,
      energy: profile?.energy ?? STARTING_ENERGY,
      energyMax: profile?.energy ?? STARTING_ENERGY,
      transit: 0,
    },
    clock: { day: 1, period: 'morning' },
    act: 1,
    mode: { kind: 'world' },
    battle: null,

    district: 'tiete',
    place: 'tiete_plataforma',
    visitedDistricts: ['tiete'],

    flags: {},
    quests: {},
    journal: [],
    inventory: {},
    relationships: {},

    seenNodes: [],
    clearedDesenrolos: [],

    elapsedMinutes: 0,
  }
}

// --- Selectors ---------------------------------------------------------

export function getFlag(state: GameState, id: FlagId): FlagValue | undefined {
  return state.flags[id]
}

export function isFlagTrue(state: GameState, id: FlagId): boolean {
  return state.flags[id] === true
}

export function getAffinity(state: GameState, affinity: Affinity): number {
  return state.player.stats[affinity]
}

export function hasItem(state: GameState, id: ItemId, count = 1): boolean {
  return (state.inventory[id] ?? 0) >= count
}

export function itemCount(state: GameState, id: ItemId): number {
  return state.inventory[id] ?? 0
}

export function questStatus(state: GameState, id: QuestId): QuestProgress | undefined {
  return state.quests[id]
}

export function isQuestActive(state: GameState, id: QuestId): boolean {
  return state.quests[id]?.status === 'active'
}

export function isQuestDone(state: GameState, id: QuestId): boolean {
  return state.quests[id]?.status === 'done'
}

export function relationship(state: GameState, npc: NpcId): number {
  return state.relationships[npc] ?? 0
}

export function hasSeenNode(state: GameState, node: NodeId): boolean {
  return state.seenNodes.includes(node)
}

export function isDesenroloCleared(state: GameState, id: DesenroloId): boolean {
  return state.clearedDesenrolos.includes(id)
}

// --- Small immutable helpers -------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

export function withFlag(state: GameState, id: FlagId, value: FlagValue): GameState {
  return { ...state, flags: { ...state.flags, [id]: value } }
}

export function withRelationship(state: GameState, npc: NpcId, delta: number): GameState {
  const next = clamp(relationship(state, npc) + delta, -3, 5)
  return { ...state, relationships: { ...state.relationships, [npc]: next } }
}

export function withItem(state: GameState, id: ItemId, delta: number): GameState {
  const next = Math.max(0, itemCount(state, id) + delta)
  const inventory = { ...state.inventory }
  if (next === 0) delete inventory[id]
  else inventory[id] = next
  return { ...state, inventory }
}

export function withSeenNode(state: GameState, node: NodeId): GameState {
  if (state.seenNodes.includes(node)) return state
  return { ...state, seenNodes: [...state.seenNodes, node] }
}

export function withJournalEntry(state: GameState, entry: Omit<JournalEntry, 'day'>): GameState {
  if (state.journal.some((e) => e.id === entry.id)) return state
  return {
    ...state,
    journal: [...state.journal, { ...entry, day: state.clock.day }],
  }
}
