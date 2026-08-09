import type { NpcDef } from '../core/world/world.js'

export const npcs = {
  ajudante: { id: 'ajudante', name: 'Ajudante', color: '#d87945' },
  seu_jorge: { id: 'seu_jorge', name: 'Seu Jorge', color: '#4f8fba' },
  dona_cida: { id: 'dona_cida', name: 'Dona Cida', color: '#9b5f8f' },
} as const satisfies Readonly<Record<string, NpcDef>>
