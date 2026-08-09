import type { Centavos, ItemId } from '../types.js'
import type { Effect } from '../rules/effects.js'

export interface ItemDef {
  readonly id: ItemId
  readonly name: string
  readonly description: string
  readonly price?: Centavos
  /** Key items cannot be sold, dropped or eaten by mistake. */
  readonly key?: boolean
  /** Using it outside a Desenrolo. */
  readonly useEffects?: readonly Effect[]
  /** Using it inside a Desenrolo. */
  readonly battle?: {
    readonly text: string
    readonly patienceDamage?: number
    readonly energyRestore?: number
    /** Some items only work once per Desenrolo (a phone call, a document). */
    readonly oncePerBattle?: boolean
  }
  /** Consumed on use. Key items never are. */
  readonly consumable?: boolean
}

export type ItemLookup = (id: ItemId) => ItemDef | undefined
