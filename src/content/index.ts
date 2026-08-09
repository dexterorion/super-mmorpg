import type { ContentBundle } from '../core/session.js'
import { dialoguesAct1 } from './dialogues/act1.js'
import { desenrolosAct1 } from './desenrolos/act1.js'
import { items } from './items.js'
import { npcs } from './npcs.js'
import { districtsAct1, placesAct1 } from './world/act1.js'

export const content: ContentBundle = {
  districts: districtsAct1,
  places: placesAct1,
  npcs,
  dialogues: dialoguesAct1,
  desenrolos: desenrolosAct1,
  items,
}

export default content
