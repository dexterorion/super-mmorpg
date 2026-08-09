import type { DistrictDef, PlaceDef } from '../../core/world/world.js'

export const districtsAct1 = {
  tiete: {
    id: 'tiete',
    name: 'Tietê',
    places: ['tiete_plataforma', 'tiete_saguao', 'tiete_metro'],
    connections: ['centro'],
  },
  centro: {
    id: 'centro',
    name: 'Centro',
    places: ['centro_republica', 'centro_anhangabau', 'centro_se'],
    connections: ['tiete', 'bixiga'],
  },
  bixiga: {
    id: 'bixiga',
    name: 'Bixiga',
    places: ['bixiga_ladeira', 'bixiga_pensao_porta', 'bixiga_quarto'],
    connections: ['centro'],
    unlockedBy: [{ kind: 'flag', id: 'knows_bixiga_route' }],
  },
} as const satisfies Readonly<Record<string, DistrictDef>>

export const placesAct1 = {
  tiete_plataforma: {
    id: 'tiete_plataforma',
    district: 'tiete',
    name: 'Plataforma de desembarque',
    blurb: 'Luzes brancas, malas no chão e uma cidade acordando.',
    onEnter: [{ dialogueId: 'dlg_intro' }],
    exits: [{ to: 'tiete_saguao', label: 'Entrar na rodoviária' }],
  },
  tiete_saguao: {
    id: 'tiete_saguao',
    district: 'tiete',
    name: 'Saguão do Tietê',
    onEnter: [
      {
        dialogueId: 'dlg_ajudante',
        conditions: [{ kind: 'not', of: { kind: 'cleared', desenrolo: 'd_ajudante' } }],
      },
    ],
    exits: [
      { to: 'tiete_plataforma', label: 'Voltar à plataforma' },
      { to: 'tiete_metro', label: 'Seguir as placas do metrô' },
    ],
    actions: [
      {
        id: 'ligar_val',
        label: 'Ligar para o Val',
        once: true,
        effects: [{ kind: 'startDialogue', id: 'dlg_ligacao' }],
      },
    ],
  },
  tiete_metro: {
    id: 'tiete_metro',
    district: 'tiete',
    name: 'Metrô Tietê',
    station: true,
    exits: [{ to: 'tiete_saguao', label: 'Voltar ao saguão' }],
    actions: [
      {
        id: 'comprar_bilhete',
        label: 'Comprar Bilhete Único — R$ 20',
        conditions: [{ kind: 'money', min: 2000 }],
        effects: [
          { kind: 'money', delta: -2000 },
          { kind: 'transit', delta: 2000 },
        ],
      },
    ],
  },
  centro_republica: {
    id: 'centro_republica',
    district: 'centro',
    name: 'República',
    station: true,
    exits: [
      { to: 'centro_anhangabau', label: 'Descer para o Anhangabaú' },
      { to: 'centro_se', label: 'Caminhar até a Sé' },
    ],
  },
  centro_anhangabau: {
    id: 'centro_anhangabau',
    district: 'centro',
    name: 'Anhangabaú',
    exits: [
      { to: 'centro_republica', label: 'Subir para a República' },
      { to: 'centro_se', label: 'Seguir para a Sé' },
    ],
    npcs: [{ npcId: 'seu_jorge', dialogueId: 'dlg_jorge_1', label: 'Falar com Seu Jorge' }],
  },
  centro_se: {
    id: 'centro_se',
    district: 'centro',
    name: 'Praça da Sé',
    onEnter: [{ dialogueId: 'dlg_se_golpe' }],
    exits: [
      { to: 'centro_republica', label: 'Voltar à República' },
      { to: 'centro_anhangabau', label: 'Voltar ao Anhangabaú' },
    ],
  },
  bixiga_ladeira: {
    id: 'bixiga_ladeira',
    district: 'bixiga',
    name: 'Ladeira do Bixiga',
    station: true,
    exits: [{ to: 'bixiga_pensao_porta', label: 'Procurar a pensão do endereço' }],
  },
  bixiga_pensao_porta: {
    id: 'bixiga_pensao_porta',
    district: 'bixiga',
    name: 'Porta da pensão',
    onEnter: [
      {
        dialogueId: 'dlg_cida_1',
        conditions: [{ kind: 'not', of: { kind: 'flag', id: 'has_room' } }],
      },
    ],
    exits: [
      { to: 'bixiga_ladeira', label: 'Voltar à ladeira' },
      {
        to: 'bixiga_quarto',
        label: 'Subir para o quarto',
        conditions: [{ kind: 'flag', id: 'has_room' }],
      },
    ],
  },
  bixiga_quarto: {
    id: 'bixiga_quarto',
    district: 'bixiga',
    name: 'Quarto do Val',
    onEnter: [{ dialogueId: 'dlg_bilhete_val' }],
    exits: [{ to: 'bixiga_pensao_porta', label: 'Descer para a portaria' }],
    actions: [{ id: 'dormir', label: 'Dormir', effects: [{ kind: 'sleep', quality: 'bed' }] }],
  },
} as const satisfies Readonly<Record<string, PlaceDef>>
