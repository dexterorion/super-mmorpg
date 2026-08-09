/**
 * Shared vocabulary for the GAROA domain.
 *
 * Identifiers are English (see CONTRIBUTING); the game's own words are
 * Portuguese and live in content/. The mapping matters when reading design
 * notes next to code:
 *
 *   money    → Grana        instinct → Faro
 *   energy   → Disposição   grit     → Fôlego
 *   transit  → Bilhete Único
 *   savvy    → Manha        gab      → Lábia
 *   patience → Paciência (the "HP" of a Desenrolo)
 */

export type DistrictId = string
export type PlaceId = string
export type NpcId = string
export type ItemId = string
export type QuestId = string
export type DialogueId = string
export type NodeId = string
export type DesenroloId = string
export type FlagId = string

/** Money is stored in centavos. Never use floats for Grana. */
export type Centavos = number

export type Hometown = 'prudente' | 'bauru' | 'barretos'
export type ArchetypeId =
  'pedreiro' | 'faria_limer' | 'artista' | 'entregador' | 'estudante' | 'saude'
export type HousingId =
  'pensao_bixiga' | 'kitnet_centro' | 'apartamento_zona_leste' | 'quarto_guarulhos' | 'studio_copan'

export type Period = 'morning' | 'afternoon' | 'night'

export const PERIODS: readonly Period[] = ['morning', 'afternoon', 'night'] as const

export type ActId = 1 | 2 | 3 | 4 | 5

/** The three trainable affinities. Each caps at 10. */
export type Affinity = 'gab' | 'instinct' | 'grit'

export const AFFINITIES: readonly Affinity[] = ['gab', 'instinct', 'grit'] as const

export type FlagValue = boolean | number | string

/** A serialisable, engine-agnostic description of something that happened. */
export interface GameEvent {
  readonly type: string
  readonly [key: string]: unknown
}
