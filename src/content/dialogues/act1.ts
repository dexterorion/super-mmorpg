import type { Dialogue } from '../../core/dialogue/dialogue.js'

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
        onEnter: [
          { kind: 'savvyXp', amount: 4 },
          {
            kind: 'journal',
            id: 'lugar_copan',
            text: 'Copan: uma cidade vertical com vida também no térreo.',
            entryKind: 'lesson',
          },
        ],
        end: true,
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
        onEnter: [
          { kind: 'affinity', affinity: 'gab', delta: 1 },
          {
            kind: 'journal',
            id: 'lugar_ccsp',
            text: 'No CCSP, participei de uma oficina e deixei meu traço no mapa.',
            entryKind: 'lesson',
          },
        ],
        end: true,
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
        onEnter: [
          { kind: 'energy', delta: 8 },
          {
            kind: 'journal',
            id: 'lugar_vai_vai',
            text: 'Na quadra da Vai-Vai, aprendi o compasso seguindo a bateria.',
            entryKind: 'lesson',
          },
        ],
        end: true,
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
        onEnter: [
          { kind: 'savvyXp', amount: 6 },
          {
            kind: 'journal',
            id: 'lugar_masp',
            text: 'No MASP, percorri a exposição sem uma rota obrigatória.',
            entryKind: 'lesson',
          },
        ],
        end: true,
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
        onEnter: [
          { kind: 'energy', delta: 10 },
          {
            kind: 'journal',
            id: 'lugar_ibirapuera',
            text: 'A Marquise do Ibirapuera é abrigo e passagem compartilhada.',
            entryKind: 'lesson',
          },
        ],
        end: true,
      },
    },
  },
} as const satisfies Readonly<Record<string, Dialogue>>
