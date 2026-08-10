import type { Choice, Dialogue } from '../../core/dialogue/dialogue.js'

interface CulturalSource {
  readonly label: string
  readonly url: string
}

const COPAN_SOURCE: CulturalSource = {
  label: 'Prefeitura de São Paulo · Edifício Copan',
  url: 'https://capital.sp.gov.br/w/noticia/prefeitura-concede-incentivo-inedito-da-lei-cidade-limpa-para-restauro-da-fachada-do-edificio-copan-1',
}
const CCSP_SOURCE: CulturalSource = {
  label: 'Centro Cultural São Paulo · site institucional',
  url: 'https://centrocultural.sp.gov.br/',
}
const VAI_VAI_SOURCE: CulturalSource = {
  label: 'Vai-Vai · site institucional',
  url: 'https://www.vaivai.com.br/',
}
const MASP_SOURCE: CulturalSource = {
  label: 'MASP · instituição e edifício',
  url: 'https://www.masp.org.br/sobre/',
}
const IBIRAPUERA_SOURCE: CulturalSource = {
  label: 'Parque Ibirapuera · Marquise',
  url: 'https://parqueibirapuera.org/areas-externas-do-parque-ibirapuera/marquise-do-parque-ibirapuera/',
}

function sourcedChoice(
  id: string,
  text: string,
  flagId: string,
  journalText: string,
  source: CulturalSource,
  entryKind: 'lesson' | 'contact'
): Choice {
  return {
    id,
    text,
    effects: [
      { kind: 'flag', id: flagId, value: true },
      { kind: 'savvyXp', amount: 6 },
      {
        kind: 'journal',
        id: `culture:${id}`,
        text: `${journalText} Fonte: ${source.label}.`,
        entryKind,
        source,
      },
    ],
    exit: true,
  }
}

export const dialoguesAct1 = {
  dlg_intro: {
    id: 'dlg_intro',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          '5h10. O ônibus para com um chiado longo.',
          'Depois de 32 horas, São Paulo abre a porta.',
        ],
        next: 'origem',
      },
      origem: {
        id: 'origem',
        lines: ['O ar tem um cheiro que não existia lá em casa.'],
        choices: [
          { id: 'prudente', text: 'Nada parecido com Presidente Prudente.', next: 'missao' },
          { id: 'bauru', text: 'Nada parecido com Bauru.', next: 'missao' },
          { id: 'barretos', text: 'Nada parecido com Barretos.', next: 'missao' },
        ],
      },
      missao: {
        id: 'missao',
        lines: ['Val disse que estaria aqui. Só tem gente indo embora.'],
        onEnter: [
          { kind: 'questStart', id: 'q_find_val' },
          {
            kind: 'journal',
            id: 'obj_find_val',
            text: 'Achar o Val. Ele disse que estaria aqui.',
            entryKind: 'objective',
          },
          { kind: 'item', id: 'celular', delta: 1 },
        ],
        end: true,
      },
    },
  },
  dlg_ajudante: {
    id: 'dlg_ajudante',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        speaker: 'ajudante',
        lines: [
          '“Deixa que eu ajudo.” Ele pega sua mala antes da resposta.',
          'Três passos adiante, para na saída e sorri. “São cinquenta.”',
        ],
        choices: [
          {
            id: 'reclamar',
            text: 'Cinquenta reais?!',
            effects: [{ kind: 'startDesenrolo', id: 'd_ajudante' }],
            exit: true,
          },
          {
            id: 'pagar',
            text: 'Tá bom.',
            effects: [{ kind: 'money', delta: -5000 }],
            next: 'gorjeta',
          },
          {
            id: 'faro',
            text: 'Quanto custa essa ajuda?',
            conditions: [{ kind: 'affinity', affinity: 'instinct', min: 2 }],
            effects: [{ kind: 'startDesenrolo', id: 'd_ajudante' }],
            exit: true,
          },
        ],
      },
      gorjeta: {
        id: 'gorjeta',
        speaker: 'ajudante',
        lines: ['“Boa. E mais dez de gorjeta.”'],
        onEnter: [{ kind: 'startDesenrolo', id: 'd_ajudante' }],
        end: true,
      },
    },
  },
  dlg_ligacao: {
    id: 'dlg_ligacao',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'Chama quatro vezes. Caixa postal.',
          '“Se eu não atender... espera. Não procura ninguém ainda.”',
        ],
        next: 'end',
      },
      end: { id: 'end', lines: ['A gravação termina no meio de uma respiração.'], end: true },
    },
  },
  dlg_jorge_1: {
    id: 'dlg_jorge_1',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        speaker: 'seu_jorge',
        lines: ['“Carregador, cabo, fone que funciona dos dois lados.”'],
        choices: [
          { id: 'direto', text: 'Sabe como chego ao Bixiga?', next: 'rota' },
          {
            id: 'comprar',
            text: 'Compro um carregador. E preciso de uma informação.',
            conditions: [{ kind: 'money', min: 1500 }],
            effects: [
              { kind: 'money', delta: -1500 },
              { kind: 'relationship', npc: 'seu_jorge', delta: 1 },
            ],
            next: 'rota',
          },
          {
            id: 'labia',
            text: 'O cabo é bom mesmo ou só conversa?',
            conditions: [{ kind: 'affinity', affinity: 'gab', min: 2 }],
            next: 'simpatia',
          },
        ],
      },
      simpatia: {
        id: 'simpatia',
        speaker: 'seu_jorge',
        lines: [
          '“Conversa também é produto, mas o cabo é bom.”',
          'Você arranca a primeira risada do dia.',
        ],
        next: 'rota',
      },
      rota: {
        id: 'rota',
        speaker: 'seu_jorge',
        lines: [
          '“República, depois desce no Bixiga. Não inventa atalho.”',
          'Ele desenha a rota no verso de uma nota e oferece um café.',
        ],
        onEnter: [
          { kind: 'flag', id: 'knows_bixiga_route', value: true },
          { kind: 'relationship', npc: 'seu_jorge', delta: 1 },
          {
            kind: 'journal',
            id: 'contact_jorge',
            text: 'Seu Jorge, no Anhangabaú, conhece os caminhos do Centro.',
            entryKind: 'contact',
          },
          { kind: 'item', id: 'cafe', delta: 1 },
        ],
        end: true,
      },
    },
  },
  dlg_jorge_cafe: {
    id: 'dlg_jorge_cafe',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        speaker: 'seu_jorge',
        lines: [
          'Seu Jorge fecha a caixa de cabos por alguns minutos e divide um café no balcão.',
          '“Gostar é fácil. Difícil é caber aluguel, trabalho e duas rotinas no mesmo mapa.”',
          'Vocês comparam o tempo no transporte e quem cuidaria da casa nos dias ruins.',
        ],
        choices: [
          {
            id: 'construir_juntos',
            text: 'Quero descobrir se a gente consegue construir isso junto.',
            effects: [
              { kind: 'relationship', npc: 'seu_jorge', delta: 1 },
              {
                kind: 'journal',
                id: 'family_jorge_cafe',
                text: 'Com Seu Jorge, conversei sobre afeto, aluguel, deslocamento e divisão do cuidado.',
                entryKind: 'contact',
              },
            ],
            exit: true,
          },
          {
            id: 'amizade_jorge',
            text: 'Prefiro que nossa proximidade continue amizade.',
            effects: [
              {
                kind: 'journal',
                id: 'family_jorge_friendship',
                text: 'Conversei com Seu Jorge e escolhemos preservar nossa amizade.',
                entryKind: 'contact',
              },
            ],
            exit: true,
          },
        ],
      },
    },
  },
  dlg_cida_1: {
    id: 'dlg_cida_1',
    start: 'start',
    nodes: {
      start: { id: 'start', speaker: 'dona_cida', lines: ['“Não tem vaga.”'], next: 'val' },
      val: {
        id: 'val',
        speaker: 'dona_cida',
        lines: [
          'Ao ouvir “primo do Val”, ela endurece.',
          '“Sumiu há duas semanas. E deixou duas sem pagar.”',
        ],
        choices: [
          {
            id: 'pedir',
            text: 'Me deixa explicar.',
            effects: [{ kind: 'startDesenrolo', id: 'd_portaria' }],
            exit: true,
          },
        ],
      },
    },
  },
  dlg_se_golpe: {
    id: 'dlg_se_golpe',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: ['Um homem oferece uma pulseira “de presente”.'],
        choices: [
          {
            id: 'perceber',
            text: 'Presente que já vem com cobrança?',
            conditions: [{ kind: 'affinity', affinity: 'instinct', min: 2 }],
            next: 'lesson',
          },
          {
            id: 'aceitar',
            text: 'Obrigado.',
            effects: [{ kind: 'money', delta: -1000 }],
            next: 'lesson',
          },
        ],
      },
      lesson: {
        id: 'lesson',
        lines: ['O presente tinha preço. A pergunta certa veio cedo — ou tarde.'],
        onEnter: [
          { kind: 'savvyXp', amount: 8 },
          {
            kind: 'journal',
            id: 'lesson_presente',
            text: 'No Centro, até presente pode vir com cobrança.',
            entryKind: 'lesson',
          },
        ],
        end: true,
      },
    },
  },
  dlg_bilhete_val: {
    id: 'dlg_bilhete_val',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'No quarto, uma gaveta emperra. Dentro, meio bilhete.',
          '“Paulista. A empresa sabe. Não confia...” O resto foi arrancado.',
        ],
        next: 'fim',
      },
      fim: {
        id: 'fim',
        lines: ['Val não estava esperando na rodoviária. Mas deixou um caminho.'],
        onEnter: [
          { kind: 'item', id: 'bilhete_val', delta: 1 },
          { kind: 'questDone', id: 'q_find_val' },
          { kind: 'act', act: 2 },
          {
            kind: 'journal',
            id: 'lesson_val',
            text: 'Val deixou uma pista sobre uma empresa na Paulista.',
            entryKind: 'lesson',
          },
          { kind: 'moveTo', district: 'liberdade', place: 'liberdade_estacao' },
        ],
        end: true,
      },
    },
  },
  dlg_act2: {
    id: 'dlg_act2',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'A pista da Paulista exige documentos que você ainda não tem.',
          'Na Liberdade, uma fila já dobra a esquina.',
        ],
        onEnter: [
          { kind: 'questStart', id: 'q_documents' },
          {
            kind: 'journal',
            id: 'obj_documents',
            text: 'Conseguir os documentos para procurar a empresa da Paulista.',
            entryKind: 'objective',
          },
        ],
        next: 'yumi',
      },
      yumi: {
        id: 'yumi',
        speaker: 'yumi',
        lines: [
          '“Se entrar sem saber o que pedem, você perde o dia.”',
          'Yumi mostra os carimbos certos e aponta a menor fila.',
        ],
        onEnter: [
          { kind: 'relationship', npc: 'yumi', delta: 1 },
          { kind: 'affinity', affinity: 'instinct', delta: 1 },
          {
            kind: 'journal',
            id: 'contact_yumi',
            text: 'Yumi conhece os atalhos que continuam dentro da regra.',
            entryKind: 'contact',
          },
        ],
        choices: [
          {
            id: 'fila',
            text: 'Encarar a repartição.',
            effects: [{ kind: 'startDesenrolo', id: 'd_reparticao' }],
            exit: true,
          },
        ],
      },
    },
  },
  dlg_act3: {
    id: 'dlg_act3',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        speaker: 'renan',
        lines: [
          'A Horizonte Urbano ocupa um andar brilhante demais.',
          'Renan sorri como quem reconhece outra pessoa do interior.',
        ],
        next: 'oferta',
      },
      oferta: {
        id: 'oferta',
        speaker: 'renan',
        lines: ['“Aqui ninguém espera oportunidade. A gente vende uma.”'],
        choices: [
          {
            id: 'entrar',
            text: 'Entrar no esquema para ganhar rápido.',
            effects: [
              { kind: 'flag', id: 'joined_horizonte', value: true },
              { kind: 'money', delta: 8000 },
              { kind: 'startDesenrolo', id: 'd_entrevista' },
            ],
            exit: true,
          },
          {
            id: 'recusar',
            text: 'Recusar e procurar trabalho honesto.',
            effects: [
              { kind: 'flag', id: 'joined_horizonte', value: false },
              { kind: 'relationship', npc: 'seu_jorge', delta: 1 },
              { kind: 'startDesenrolo', id: 'd_entrevista' },
            ],
            exit: true,
          },
        ],
      },
    },
  },
  dlg_act4: {
    id: 'dlg_act4',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        speaker: 'tico',
        lines: [
          'A chuva fecha a Radial. A água já cobre o primeiro degrau.',
          '“Val está do outro lado. Se for, vai com gente.”',
        ],
        onEnter: [
          { kind: 'relationship', npc: 'tico', delta: 1 },
          { kind: 'affinity', affinity: 'grit', delta: 1 },
          {
            kind: 'journal',
            id: 'contact_tico',
            text: 'Tico aparece quando a cidade para.',
            entryKind: 'contact',
          },
        ],
        choices: [
          {
            id: 'agua',
            text: 'Atravessar com Tico.',
            effects: [{ kind: 'startDesenrolo', id: 'd_agua' }],
            exit: true,
          },
        ],
      },
    },
  },
  dlg_val: {
    id: 'dlg_val',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        speaker: 'val',
        lines: [
          'Val espera numa garagem, com uma passagem de volta no bolso.',
          '“Eu achei que sumir dava menos trabalho que admitir que deu errado.”',
        ],
        choices: [
          {
            id: 'fica',
            text: 'Fica. A gente resolve sem fingir que está tudo bem.',
            effects: [{ kind: 'flag', id: 'val_stays', value: true }],
            next: 'seguir',
          },
          {
            id: 'vai',
            text: 'Voltar também pode ser uma escolha.',
            effects: [{ kind: 'flag', id: 'val_stays', value: false }],
            next: 'seguir',
          },
        ],
      },
      seguir: {
        id: 'seguir',
        lines: [
          'Antes da despedida, chega uma mensagem de Renan.',
          '“Minhocão. Domingo cedo. Vamos terminar essa conversa.”',
        ],
        onEnter: [
          { kind: 'act', act: 5 },
          { kind: 'moveTo', district: 'minhocao', place: 'minhocao_domingo' },
        ],
        end: true,
      },
    },
  },
  dlg_final: {
    id: 'dlg_final',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        speaker: 'renan',
        lines: [
          'Sem carros, o Minhocão parece outra cidade.',
          '“Você ainda acha que São Paulo premia quem joga limpo?”',
        ],
        choices: [
          {
            id: 'responder',
            text: 'A cidade não é prêmio. É gente.',
            effects: [{ kind: 'startDesenrolo', id: 'd_renan' }],
            exit: true,
          },
        ],
      },
    },
  },
  dlg_epilogo: {
    id: 'dlg_epilogo',
    start: 'start',
    nodes: {
      start: { id: 'start', lines: [], next: 'route_clean' },
      route_clean: {
        id: 'route_clean',
        lines: [],
        conditions: [{ kind: 'flag', id: 'joined_horizonte', equals: false }],
        fallback: 'route_scheme',
        next: 'clean_val',
      },
      route_scheme: { id: 'route_scheme', lines: [], next: 'scheme_val' },
      clean_val: {
        id: 'clean_val',
        lines: [],
        conditions: [{ kind: 'flag', id: 'val_stays' }],
        fallback: 'clean_home',
        next: 'clean_stays',
      },
      clean_stays: {
        id: 'clean_stays',
        lines: [
          'Val fica. Você segue devagar, cercado pela rede que construiu.',
          'A garoa cai sem pedir licença. Pela primeira vez, você conhece o caminho.',
        ],
        next: 'end_rede_fica',
      },
      end_rede_fica: {
        id: 'end_rede_fica',
        lines: [],
        onEnter: [{ kind: 'endGame', endingId: 'rede_fica' }],
        end: true,
      },
      clean_home: {
        id: 'clean_home',
        lines: [
          'Val volta para casa sem fugir. Você fica, com amigos e trabalho honesto.',
          'A garoa apaga as últimas marcas da chuva.',
        ],
        next: 'end_rede_vai',
      },
      end_rede_vai: {
        id: 'end_rede_vai',
        lines: [],
        onEnter: [{ kind: 'endGame', endingId: 'rede_vai' }],
        end: true,
      },
      scheme_val: {
        id: 'scheme_val',
        lines: [],
        conditions: [{ kind: 'flag', id: 'val_stays' }],
        fallback: 'scheme_home',
        next: 'scheme_stays',
      },
      scheme_stays: {
        id: 'scheme_stays',
        lines: [
          'Val fica, mas a confiança leva tempo. Você começa devolvendo o que tomou.',
          'No domingo seguinte, há menos gente ao seu lado — mas ainda há caminho.',
        ],
        next: 'end_horizonte_fica',
      },
      end_horizonte_fica: {
        id: 'end_horizonte_fica',
        lines: [],
        onEnter: [{ kind: 'endGame', endingId: 'horizonte_fica' }],
        end: true,
      },
      scheme_home: {
        id: 'scheme_home',
        lines: [
          'Val parte. Você abandona a Horizonte e encara as pontes que queimou.',
          'A garoa não absolve ninguém. Só oferece outra manhã.',
        ],
        next: 'end_horizonte_vai',
      },
      end_horizonte_vai: {
        id: 'end_horizonte_vai',
        lines: [],
        onEnter: [{ kind: 'endGame', endingId: 'horizonte_vai' }],
        end: true,
      },
    },
  },
  dlg_copan: {
    id: 'dlg_copan',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'A fachada curva parece dobrar o quarteirão sem separar quem passa.',
          'No térreo, comércio e moradia dividem o mesmo endereço.',
        ],
        choices: [
          sourcedChoice(
            'ler_terreo_copan',
            'Mapear como moradia, comércio e passagem dividem o térreo.',
            'education:copan_mixed_use',
            'Registrei o uso misto do Copan e ganhei repertório urbano.',
            COPAN_SOURCE,
            'lesson'
          ),
          sourcedChoice(
            'comparar_moradia_copan',
            'Comparar a arquitetura desejada com o custo real de morar aqui.',
            'housing:copan_tradeoff',
            'Comparei valor arquitetônico, centralidade e custo de moradia no Copan.',
            COPAN_SOURCE,
            'lesson'
          ),
        ],
      },
    },
  },
  dlg_ccsp: {
    id: 'dlg_ccsp',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'A oficina começa com papel, fita e uma pergunta: “Que cidade cabe aqui?”',
          'Sua resposta vira parte de um mapa coletivo na parede.',
        ],
        choices: [
          sourcedChoice(
            'mapa_coletivo_ccsp',
            'Contribuir para o mapa coletivo da oficina.',
            'network:ccsp_collective_map',
            'Contribuí para um mapa coletivo no CCSP e conheci outros participantes.',
            CCSP_SOURCE,
            'contact'
          ),
          sourcedChoice(
            'procurar_formacao_ccsp',
            'Procurar a agenda de oficinas e continuar a formação.',
            'education:ccsp_workshops',
            'Passei a acompanhar oficinas e projetos formativos do CCSP.',
            CCSP_SOURCE,
            'lesson'
          ),
        ],
      },
    },
  },
  dlg_vai_vai: {
    id: 'dlg_vai_vai',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'Uma ritmista percebe seu pé atrasado e mostra onde o compasso vira.',
          'Na segunda passagem, você já consegue caminhar junto da bateria.',
        ],
        choices: [
          sourcedChoice(
            'aprender_compasso_vai_vai',
            'Aprender o compasso respeitando quem sustenta a bateria.',
            'education:vaivai_rhythm',
            'Aprendi o compasso na Vai-Vai sem reduzir a escola de samba ao desfile.',
            VAI_VAI_SOURCE,
            'lesson'
          ),
          sourcedChoice(
            'ajudar_producao_vai_vai',
            'Ajudar na organização e conhecer o trabalho coletivo da quadra.',
            'work:vaivai_collective',
            'Ajudei na produção da quadra e entrei numa rede de trabalho cultural.',
            VAI_VAI_SOURCE,
            'contact'
          ),
        ],
      },
    },
  },
  dlg_masp: {
    id: 'dlg_masp',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'Os quadros parecem suspensos, como se a sala recusasse uma ordem única.',
          'Você escolhe o próprio caminho entre histórias distantes.',
        ],
        choices: [
          sourcedChoice(
            'percurso_masp',
            'Montar um percurso próprio entre as obras expostas.',
            'education:masp_open_display',
            'No MASP, observei como a montagem permite percursos não lineares.',
            MASP_SOURCE,
            'lesson'
          ),
          sourcedChoice(
            'conversa_mediacao_masp',
            'Participar de uma conversa de mediação sobre a exposição.',
            'network:masp_mediation',
            'Participei de uma mediação no MASP e ampliei minha rede cultural.',
            MASP_SOURCE,
            'contact'
          ),
        ],
      },
    },
  },
  dlg_ibirapuera: {
    id: 'dlg_ibirapuera',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'Skatistas, famílias e dançarinos inventam faixas invisíveis no concreto.',
          'Você desacelera e atravessa sem cortar o caminho de ninguém.',
        ],
        choices: [
          sourcedChoice(
            'compartilhar_marquise',
            'Entrar numa atividade sem bloquear a passagem das outras pessoas.',
            'network:ibirapuera_shared_space',
            'Participei da Marquise como espaço compartilhado de encontro e passagem.',
            IBIRAPUERA_SOURCE,
            'contact'
          ),
          sourcedChoice(
            'observar_usos_marquise',
            'Registrar como grupos diferentes negociam o mesmo espaço.',
            'education:ibirapuera_public_space',
            'Observei como usos culturais e cotidianos convivem na Marquise.',
            IBIRAPUERA_SOURCE,
            'lesson'
          ),
        ],
      },
    },
  },
  dlg_rede_comunitaria: {
    id: 'dlg_rede_comunitaria',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        speaker: 'pastora_nadia',
        lines: [
          'A igreja da esquina abriu o salão para separar água, comida e material de limpeza.',
          'Pastora Nádia explica que a ajuda é para qualquer pessoa, sem exigir culto ou conversão.',
          '“A rede comunitária ajuda hoje. Para direitos contínuos, o CRAS também precisa entrar.”',
        ],
        choices: [
          {
            id: 'mutirao_comunitario',
            text: 'Entrar no mutirão e assumir um turno de distribuição.',
            effects: [
              { kind: 'flag', id: 'network:community_mutual_aid', value: true },
              { kind: 'energy', delta: -4 },
              {
                kind: 'journal',
                id: 'network_community_mutual_aid',
                text: 'Participei de uma rede religiosa aberta, sem substituir o SUAS. Fonte: legislacao.prefeitura.sp.gov.br, Portaria SMADS 105/2025.',
                entryKind: 'contact',
                source: {
                  label: 'Prefeitura de São Paulo · Portaria SMADS 105/2025',
                  url: 'https://legislacao.prefeitura.sp.gov.br/portaria-secretaria-municipal-de-assistencia-e-desenvolvimento-social-smads-105-de-22-de-setembro-de-2025',
                },
              },
            ],
            exit: true,
          },
          {
            id: 'encaminhamento_cras',
            text: 'Ajudar na triagem e pedir o contato da rede pública do território.',
            effects: [
              { kind: 'flag', id: 'network:public_assistance_referral', value: true },
              { kind: 'savvyXp', amount: 4 },
              {
                kind: 'journal',
                id: 'network_public_assistance',
                text: 'Levei demandas à rede pública; voluntariado não substitui direitos. Fonte: prefeitura.sp.gov.br, Rede Socioassistencial.',
                entryKind: 'contact',
                source: {
                  label: 'Prefeitura de São Paulo · Rede Socioassistencial',
                  url: 'https://www.prefeitura.sp.gov.br/web/assistencia_social/w/rede_socioassistencial/3200',
                },
              },
            ],
            exit: true,
          },
        ],
      },
    },
  },
  dlg_ceu_aricanduva: {
    id: 'dlg_ceu_aricanduva',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'A oficina junta estudantes e moradores em torno de um mapa do bairro.',
          'A educadora lembra que o CEU articula escola, cultura, esporte e participação.',
        ],
        choices: [
          {
            id: 'mapear_saberes',
            text: 'Registrar saberes e oportunidades de formação do território.',
            effects: [
              { kind: 'flag', id: 'education:ceu_territory_map', value: true },
              { kind: 'savvyXp', amount: 8 },
              {
                kind: 'journal',
                id: 'place_ceu_aricanduva',
                text: 'Mapeei formação e cultura no CEU Aricanduva. Fonte: educacao.sme.prefeitura.sp.gov.br/coceu.',
                entryKind: 'lesson',
                source: {
                  label: 'Secretaria Municipal de Educação · COCEU',
                  url: 'https://educacao.sme.prefeitura.sp.gov.br/coceu/',
                },
              },
            ],
            exit: true,
          },
          {
            id: 'rede_protecao_ceu',
            text: 'Conectar a oficina à rede de proteção social do bairro.',
            effects: [
              { kind: 'flag', id: 'network:ceu_social_protection', value: true },
              { kind: 'affinity', affinity: 'gab', delta: 1 },
              {
                kind: 'journal',
                id: 'network_ceu_aricanduva',
                text: 'Conectei educação e proteção social no CEU. Fonte: educacao.sme.prefeitura.sp.gov.br/coceu.',
                entryKind: 'contact',
                source: {
                  label: 'Secretaria Municipal de Educação · COCEU',
                  url: 'https://educacao.sme.prefeitura.sp.gov.br/coceu/',
                },
              },
            ],
            exit: true,
          },
        ],
      },
    },
  },
  dlg_sesc_formacao: {
    id: 'dlg_sesc_formacao',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'Uma produtora explica como transformar uma ideia em atividade cultural acessível.',
          'A formação é educação não formal; participar não garante contrato ou credencial.',
        ],
        choices: [
          {
            id: 'propor_atividade_sesc',
            text: 'Preparar uma proposta e entrar na rede de produção cultural.',
            effects: [
              { kind: 'flag', id: 'work:cultural_proposal', value: true },
              { kind: 'money', delta: 2_500 },
              { kind: 'affinity', affinity: 'gab', delta: 1 },
              {
                kind: 'journal',
                id: 'work_sesc_formation',
                text: 'Preparei uma proposta cultural; a ajuda de custo não garante emprego. Fonte: sescsp.org.br.',
                entryKind: 'contact',
                source: {
                  label: 'Sesc São Paulo · Quem somos',
                  url: 'https://portal.sescsp.org.br/pt/sobre-o-sesc/quem-somos/apresentacao/',
                },
              },
            ],
            exit: true,
          },
          {
            id: 'estudar_gestao_cultural',
            text: 'Usar a formação para aprofundar gestão e mediação cultural.',
            effects: [
              { kind: 'flag', id: 'education:cultural_management', value: true },
              { kind: 'savvyXp', amount: 10 },
              {
                kind: 'journal',
                id: 'education_sesc_formation',
                text: 'Estudei gestão cultural no Sesc. Fonte: Centro de Pesquisa e Formação Sesc SP.',
                entryKind: 'lesson',
                source: {
                  label: 'Centro de Pesquisa e Formação · Sesc SP',
                  url: 'https://centrodepesquisaeformacao.sescsp.org.br/?o=homeportal',
                },
              },
            ],
            exit: true,
          },
        ],
      },
    },
  },
  dlg_ocupacao_ouvidor: {
    id: 'dlg_ocupacao_ouvidor',
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        lines: [
          'A assembleia apresenta ateliês, eventos e as regras coletivas de uso do edifício.',
          'A proposta de permanência está em debate público; visita não resolve a disputa urbana.',
        ],
        choices: [
          {
            id: 'rede_artistas_ouvidor',
            text: 'Oferecer trabalho numa mostra e conhecer a rede de artistas.',
            effects: [
              { kind: 'flag', id: 'network:ouvidor_artists', value: true },
              { kind: 'affinity', affinity: 'gab', delta: 1 },
              {
                kind: 'journal',
                id: 'network_ouvidor_63',
                text: 'Entrei numa rede de artistas da Ouvidor 63 sem presumir o desfecho da disputa.',
                entryKind: 'contact',
                source: {
                  label: 'Participe+ São Paulo · proposta CDRU Ouvidor 63',
                  url: 'https://participemais.prefeitura.sp.gov.br/system/documents/attachments/000/003/878/original/d4f84779cd52fbe5c1bcdb0581cd9a036ea14e80.pdf',
                },
              },
            ],
            exit: true,
          },
          {
            id: 'documentar_debate_ouvidor',
            text: 'Documentar argumentos e levar o debate ao Caderninho.',
            effects: [
              { kind: 'flag', id: 'education:ouvidor_urban_debate', value: true },
              { kind: 'savvyXp', amount: 8 },
              {
                kind: 'journal',
                id: 'lesson_ouvidor_63',
                text: 'Registrei a proposta cultural e a disputa urbana da Ouvidor 63 sem tomar posse como fato.',
                entryKind: 'lesson',
                source: {
                  label: 'Participe+ São Paulo · proposta CDRU Ouvidor 63',
                  url: 'https://participemais.prefeitura.sp.gov.br/system/documents/attachments/000/003/878/original/d4f84779cd52fbe5c1bcdb0581cd9a036ea14e80.pdf',
                },
              },
            ],
            exit: true,
          },
        ],
      },
    },
  },
} as const satisfies Readonly<Record<string, Dialogue>>
