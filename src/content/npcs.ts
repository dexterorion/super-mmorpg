import type { NpcDef } from '../core/world/world.js'

export const npcs = {
  ajudante: { id: 'ajudante', name: 'Ajudante', color: '#d87945' },
  seu_jorge: { id: 'seu_jorge', name: 'Seu Jorge', color: '#4f8fba' },
  dona_cida: { id: 'dona_cida', name: 'Dona Cida', color: '#9b5f8f' },
  yumi: { id: 'yumi', name: 'Yumi', color: '#57a17f' },
  tico: { id: 'tico', name: 'Tico', color: '#f3c969' },
  renan: { id: 'renan', name: 'Renan', color: '#d97963' },
  val: { id: 'val', name: 'Val', color: '#6883a0' },
  pastora_nadia: { id: 'pastora_nadia', name: 'Pastora Nádia', color: '#80689d' },
} as const satisfies Readonly<Record<string, NpcDef>>
