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
    places: ['centro_republica', 'centro_anhangabau', 'centro_se', 'centro_copan', 'centro_ccsp'],
    connections: ['tiete', 'bixiga'],
  },
  bixiga: {
    id: 'bixiga',
    name: 'Bixiga',
    places: ['bixiga_ladeira', 'bixiga_pensao_porta', 'bixiga_quarto', 'bixiga_vai_vai'],
    connections: ['centro', 'liberdade'],
    unlockedBy: [{ kind: 'flag', id: 'knows_bixiga_route' }],
  },
  liberdade: {
    id: 'liberdade',
    name: 'Liberdade',
    places: ['liberdade_estacao', 'liberdade_reparticao'],
    connections: ['bixiga', 'paulista'],
  },
  paulista: {
    id: 'paulista',
    name: 'Paulista',
    places: ['paulista_horizonte', 'paulista_masp'],
    connections: ['liberdade', 'zona_leste', 'ibirapuera'],
  },
  zona_leste: {
    id: 'zona_leste',
    name: 'Zona Leste',
    places: ['zona_leste_radial'],
    connections: ['paulista', 'minhocao'],
  },
  minhocao: {
    id: 'minhocao',
    name: 'Minhocão',
    places: ['minhocao_domingo'],
    connections: ['zona_leste'],
  },
  ibirapuera: {
    id: 'ibirapuera',
    name: 'Ibirapuera',
    places: ['ibirapuera_marquise'],
    connections: ['paulista'],
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
      { to: 'centro_copan', label: 'Caminhar até o Copan' },
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
    actions: [
      {
        id: 'cafe_com_jorge',
        label: 'Tomar um café com Seu Jorge',
        conditions: [{ kind: 'relationship', npc: 'seu_jorge', min: 2 }],
        once: true,
        effects: [{ kind: 'startDialogue', id: 'dlg_jorge_cafe' }],
      },
    ],
  },
  centro_se: {
    id: 'centro_se',
    district: 'centro',
    name: 'Praça da Sé',
    onEnter: [{ dialogueId: 'dlg_se_golpe' }],
    exits: [
      { to: 'centro_republica', label: 'Voltar à República' },
      { to: 'centro_anhangabau', label: 'Voltar ao Anhangabaú' },
      { to: 'centro_ccsp', label: 'Seguir até o Centro Cultural' },
    ],
  },
  centro_copan: {
    id: 'centro_copan',
    district: 'centro',
    name: 'Edifício Copan',
    blurb: 'A curva de concreto ocupa a quadra; embaixo, a cidade entra e sai.',
    exits: [{ to: 'centro_republica', label: 'Voltar à República' }],
    actions: [
      {
        id: 'observar_copan',
        label: 'Observar a fachada e o térreo',
        once: true,
        effects: [{ kind: 'startDialogue', id: 'dlg_copan' }],
      },
    ],
  },
  centro_ccsp: {
    id: 'centro_ccsp',
    district: 'centro',
    name: 'Centro Cultural São Paulo',
    blurb: 'Rampas abertas ligam biblioteca, jardins e salas de apresentação.',
    exits: [{ to: 'centro_se', label: 'Voltar em direção à Sé' }],
    actions: [
      {
        id: 'participar_oficina',
        label: 'Entrar numa oficina aberta',
        once: true,
        effects: [{ kind: 'startDialogue', id: 'dlg_ccsp' }],
      },
    ],
  },
  bixiga_ladeira: {
    id: 'bixiga_ladeira',
    district: 'bixiga',
    name: 'Ladeira do Bixiga',
    station: true,
    exits: [
      { to: 'bixiga_pensao_porta', label: 'Procurar a pensão do endereço' },
      { to: 'bixiga_vai_vai', label: 'Seguir o som da bateria' },
    ],
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
  bixiga_vai_vai: {
    id: 'bixiga_vai_vai',
    district: 'bixiga',
    name: 'Quadra da Vai-Vai',
    blurb: 'O surdo marca o passo; o ensaio atravessa a rua e chama o bairro.',
    exits: [{ to: 'bixiga_ladeira', label: 'Voltar à ladeira' }],
    actions: [
      {
        id: 'acompanhar_ensaio',
        label: 'Acompanhar o ensaio',
        once: true,
        effects: [{ kind: 'startDialogue', id: 'dlg_vai_vai' }],
      },
    ],
  },
  liberdade_estacao: {
    id: 'liberdade_estacao',
    district: 'liberdade',
    name: 'Estação Liberdade',
    station: true,
    onEnter: [{ dialogueId: 'dlg_act2' }],
    exits: [{ to: 'liberdade_reparticao', label: 'Entrar na fila da repartição' }],
  },
  liberdade_reparticao: {
    id: 'liberdade_reparticao',
    district: 'liberdade',
    name: 'Repartição',
    exits: [{ to: 'liberdade_estacao', label: 'Voltar à estação' }],
    actions: [
      {
        id: 'enfrentar_fila',
        label: 'Enfrentar a fila com Yumi',
        effects: [{ kind: 'startDesenrolo', id: 'd_reparticao' }],
      },
    ],
  },
  paulista_horizonte: {
    id: 'paulista_horizonte',
    district: 'paulista',
    name: 'Horizonte Urbano',
    station: true,
    onEnter: [{ dialogueId: 'dlg_act3' }],
    exits: [],
  },
  paulista_masp: {
    id: 'paulista_masp',
    district: 'paulista',
    name: 'MASP',
    blurb: 'O vão livre enquadra a avenida e guarda uma pausa sob o museu.',
    station: true,
    exits: [{ to: 'paulista_horizonte', label: 'Seguir pela Paulista' }],
    actions: [
      {
        id: 'visitar_masp',
        label: 'Visitar a exposição',
        once: true,
        effects: [{ kind: 'startDialogue', id: 'dlg_masp' }],
      },
    ],
  },
  zona_leste_radial: {
    id: 'zona_leste_radial',
    district: 'zona_leste',
    name: 'Radial Leste alagada',
    station: true,
    onEnter: [{ dialogueId: 'dlg_act4' }],
    npcs: [
      {
        npcId: 'pastora_nadia',
        dialogueId: 'dlg_rede_comunitaria',
        label: 'Conversar com Pastora Nádia',
        conditions: [
          {
            kind: 'not',
            of: {
              kind: 'any',
              of: [
                { kind: 'flag', id: 'network:community_mutual_aid' },
                { kind: 'flag', id: 'network:public_assistance_referral' },
              ],
            },
          },
        ],
      },
    ],
    exits: [],
  },
  minhocao_domingo: {
    id: 'minhocao_domingo',
    district: 'minhocao',
    name: 'Minhocão, domingo',
    station: true,
    onEnter: [{ dialogueId: 'dlg_final' }],
    exits: [],
  },
  ibirapuera_marquise: {
    id: 'ibirapuera_marquise',
    district: 'ibirapuera',
    name: 'Marquise do Ibirapuera',
    blurb: 'Sob a marquise, rodas, passos e conversas dividem o mesmo abrigo.',
    station: true,
    exits: [],
    actions: [
      {
        id: 'cruzar_marquise',
        label: 'Cruzar a marquise com calma',
        once: true,
        effects: [{ kind: 'startDialogue', id: 'dlg_ibirapuera' }],
      },
    ],
  },
} as const satisfies Readonly<Record<string, PlaceDef>>
