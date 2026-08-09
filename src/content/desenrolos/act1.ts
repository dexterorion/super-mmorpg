import type { DesenroloDef } from '../../core/desenrolo/desenrolo.js'

const arrivalLesson = [
  { kind: 'affinity', affinity: 'instinct', delta: 1 },
  { kind: 'savvyXp', amount: 12 },
  {
    kind: 'journal',
    id: 'lesson_rodoviaria',
    text: 'Na rodoviária, ninguém ajuda de graça.',
    entryKind: 'lesson',
  },
] as const

export const desenrolosAct1 = {
  d_ajudante: {
    id: 'd_ajudante',
    name: 'A conta da ajuda',
    subtitle: 'Sua mala já está na mão dele.',
    intro: [
      'O homem bloqueia a saída com um sorriso treinado.',
      '“São cinquenta. A gorjeta é por sua conta.”',
    ],
    patience: 18,
    turnLimit: 8,
    arguments: [
      { id: 'preco', text: 'Você não falou preço nenhum.', topic: 'acordo', power: 7 },
      {
        id: 'devolve',
        text: 'Me devolve a mala e a gente encerra aqui.',
        topic: 'limite',
        power: 6,
      },
      {
        id: 'seguranca',
        text: 'Vamos perguntar o preço para o segurança.',
        topic: 'testemunha',
        power: 8,
      },
    ],
    tells: [
      { id: 'olhar', text: 'Ele olha mais para os lados do que para você.' },
      { id: 'cracha', text: 'O crachá está virado. Ele não trabalha na rodoviária.' },
    ],
    weakness: {
      affinity: 'instinct',
      multiplier: 1.5,
      revealText: 'Ele depende da pressa e do constrangimento.',
    },
    moves: [
      { id: 'pressa', text: '“Vai travar a saída por causa de cinquenta?”', damage: 5 },
      { id: 'culpa', text: '“Eu carreguei esse peso todo e você reclama?”', damage: 4 },
    ],
    winText: ['O sorriso desmonta. Ele larga a mala.', '“Cinco pelo esforço e fica tudo certo.”'],
    loseText: [
      'Sem energia para discutir, você entrega os cinquenta.',
      'A mala volta. A lição fica.',
    ],
    onWin: [{ kind: 'money', delta: -500 }, ...arrivalLesson],
    onLose: [{ kind: 'money', delta: -5000 }, ...arrivalLesson],
  },
  d_portaria: {
    id: 'd_portaria',
    name: 'A portaria',
    subtitle: 'Dona Cida já ouviu promessas demais.',
    intro: ['“Não tem vaga.”', 'Quando você fala do Val, ela cruza os braços.'],
    patience: 40,
    turnLimit: 12,
    arguments: [
      {
        id: 'familia',
        text: 'Eu vim atrás do meu primo. Só preciso de uma semana.',
        topic: 'familia',
        power: 9,
      },
      {
        id: 'trabalho',
        text: 'Amanhã cedo eu já começo a procurar trabalho.',
        topic: 'trabalho',
        power: 8,
      },
      {
        id: 'entrada',
        text: 'Posso pagar uma parte agora, na sua frente.',
        topic: 'dinheiro',
        power: 10,
        conditions: [{ kind: 'money', min: 12000 }],
      },
      {
        id: 'verdade',
        text: 'Não sei onde ele está. Também estou preocupado.',
        topic: 'honestidade',
        power: 9,
      },
      {
        id: 'depois',
        text: 'Quando eu me acertar, pago tudo que ele deve.',
        topic: 'promessa',
        power: 20,
        rebutted: true,
        reply: '“Essa promessa já dormiu aqui e saiu devendo.”',
      },
    ],
    tells: [
      { id: 'chave', text: 'Ela aperta uma chave no bolso, mas não manda você embora.' },
      { id: 'val', text: 'Quando fala do Val, a raiva vem misturada com preocupação.' },
      { id: 'contas', text: 'Há contas na mesa. Ela precisa de certeza, não de promessa.' },
    ],
    weakness: {
      affinity: 'gab',
      multiplier: 1.5,
      revealText: 'Falar claro funciona melhor que fazer promessa.',
    },
    moves: [
      { id: 'divida', text: '“Seu primo sumiu devendo duas semanas.”', damage: 6 },
      { id: 'historico', text: '“Todo mundo chega dizendo que é só por uns dias.”', damage: 5 },
      { id: 'fechar', text: 'Ela põe a mão na porta.', damage: 7, notBeforeTurn: 5 },
    ],
    winText: [
      'Dona Cida solta o ar e abre a porta.',
      '“Uma semana. E eu vou anotar cada centavo.”',
    ],
    loseText: [
      'A porta fecha. A ladeira oferece uma noite ruim.',
      'De manhã, Dona Cida volta com termos mais duros.',
    ],
    onWin: [
      { kind: 'money', delta: -12000 },
      { kind: 'flag', id: 'has_room', value: true },
      { kind: 'questStep', id: 'q_find_val', step: 1 },
    ],
    onLose: [
      { kind: 'sleep', quality: 'rough' },
      { kind: 'money', delta: -15000 },
      { kind: 'flag', id: 'has_room', value: true },
      { kind: 'questStep', id: 'q_find_val', step: 1 },
    ],
  },
} as const satisfies Readonly<Record<string, DesenroloDef>>
