import type { ItemDef } from '../core/items/item.js'

export const items = {
  cafe: {
    id: 'cafe',
    name: 'Café',
    description: 'Pequeno, forte e necessário.',
    price: 500,
    useEffects: [{ kind: 'energy', delta: 12 }],
    battle: { text: 'O café põe as ideias no lugar.', energyRestore: 12 },
    consumable: true,
  },
  salgado: {
    id: 'salgado',
    name: 'Salgado',
    description: 'Mata a fome e segura a caminhada.',
    price: 800,
    useEffects: [{ kind: 'energy', delta: 18 }],
    battle: { text: 'Duas mordidas e você volta para a conversa.', energyRestore: 18 },
    consumable: true,
  },
  bilhete_val: {
    id: 'bilhete_val',
    name: 'Meio bilhete do Val',
    description: 'A outra metade foi arrancada.',
    key: true,
  },
  celular: {
    id: 'celular',
    name: 'Celular',
    description: 'Pouca bateria, alguns contatos.',
    key: true,
    battle: {
      text: 'Uma ligação muda o rumo da conversa.',
      patienceDamage: 8,
      oncePerBattle: true,
    },
  },
} as const satisfies Readonly<Record<string, ItemDef>>
