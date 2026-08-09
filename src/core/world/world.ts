import type { DialogueId, DistrictId, NpcId, PlaceId } from '../types.js'
import type { Condition } from '../rules/conditions.js'
import type { Effect } from '../rules/effects.js'

/**
 * The city as a graph.
 *
 * Places connect on foot inside a district; districts connect by metro/bus
 * from a station place. Fast travel only reaches stations you have already
 * stood in — the map opens up as the player learns it, which is the whole
 * theme of the game expressed as a mechanic.
 */

export interface Exit {
  readonly to: PlaceId
  readonly label: string
  readonly conditions?: readonly Condition[]
  /** Defaults to a small walk cost. */
  readonly energyCost?: number
  /** Some walks eat a whole period (crossing the Centro on foot). */
  readonly advancesPeriod?: boolean
}

export interface NpcPresence {
  readonly npcId: NpcId
  readonly dialogueId: DialogueId
  readonly conditions?: readonly Condition[]
  /** Shown on the interact prompt. */
  readonly label?: string
}

export interface PlaceAction {
  readonly id: string
  readonly label: string
  readonly conditions?: readonly Condition[]
  readonly effects?: readonly Effect[]
  readonly energyCost?: number
  /** Only offer it once. */
  readonly once?: boolean
  /** Costs real time in the world. */
  readonly advancesPeriod?: boolean
}

/** A scene that fires on arrival — the game's cutscene mechanism. */
export interface PlaceTrigger {
  readonly dialogueId: DialogueId
  readonly conditions?: readonly Condition[]
  /** Default true: fires once ever. Set false for a scene that can repeat. */
  readonly once?: boolean
}

export interface PlaceDef {
  readonly id: PlaceId
  readonly district: DistrictId
  readonly name: string
  /** One line, shown when entering. Not a lore dump. */
  readonly blurb?: string
  /** Checked in order on arrival; the first eligible one plays. */
  readonly onEnter?: readonly PlaceTrigger[]
  readonly exits: readonly Exit[]
  readonly npcs?: readonly NpcPresence[]
  readonly actions?: readonly PlaceAction[]
  /** Marks this place as the district's transit station. */
  readonly station?: boolean
  /** Tilemap key for the render layer; core never reads it. */
  readonly map?: string
  /** Where the player sprite spawns, in tiles. */
  readonly spawn?: { readonly x: number; readonly y: number }
}

export interface DistrictDef {
  readonly id: DistrictId
  readonly name: string
  readonly places: readonly PlaceId[]
  /** Districts reachable by transit from this one, once discovered. */
  readonly connections: readonly DistrictId[]
  /** Gate on story progress so the map opens at the right pace. */
  readonly unlockedBy?: readonly Condition[]
}

export interface NpcDef {
  readonly id: NpcId
  readonly name: string
  /** Portrait/sprite key for the render layer. */
  readonly sprite?: string
  readonly color?: string
}

export type PlaceLookup = (id: PlaceId) => PlaceDef | undefined
export type DistrictLookup = (id: DistrictId) => DistrictDef | undefined
export type NpcLookup = (id: NpcId) => NpcDef | undefined

export const DEFAULT_WALK_COST = 3
