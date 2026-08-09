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
          { kind: 'endGame', endingId: 'act1_end' },
        ],
        end: true,
      },
    },
  },
} as const satisfies Readonly<Record<string, Dialogue>>
