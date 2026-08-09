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
  d_reparticao: {
    id: 'd_reparticao',
    name: 'A fila da repartição',
    subtitle: 'A senha anda mais devagar que o relógio.',
    intro: [
      '“Sem comprovante de residência não dá.”',
      'Yumi aponta um carimbo esquecido no canto do formulário.',
    ],
    patience: 36,
    turnLimit: 11,
    arguments: [
      {
        id: 'protocolo',
        text: 'O protocolo aceita a declaração da pensão.',
        topic: 'regra',
        power: 10,
      },
      {
        id: 'carimbo',
        text: 'Este formulário já foi conferido e carimbado.',
        topic: 'documento',
        power: 9,
      },
      {
        id: 'supervisao',
        text: 'Podemos confirmar isso com a supervisão?',
        topic: 'rede',
        power: 8,
      },
      {
        id: 'endereco',
        text: 'A pensão confirma meu endereço por telefone.',
        topic: 'contato',
        power: 7,
      },
      {
        id: 'urgencia',
        text: 'Eu preciso disso hoje porque estou com pressa.',
        topic: 'pressa',
        power: 14,
        rebutted: true,
        reply: '“Todo mundo nesta fila está com pressa.”',
      },
    ],
    tells: [
      { id: 'cartaz', text: 'Um cartaz lista a declaração da pensão como alternativa.' },
      { id: 'carimbo', text: 'O atendente confere carimbos antes de conferir histórias.' },
      { id: 'supervisor', text: 'A supervisora corrige a mesma dúvida no guichê ao lado.' },
    ],
    weakness: {
      affinity: 'instinct',
      multiplier: 1.5,
      revealText: 'O atalho está escrito na própria regra.',
    },
    moves: [
      { id: 'senha', text: 'Outra senha é chamada antes da sua.', damage: 5 },
      { id: 'almoco', text: '“O sistema vai parar para o almoço.”', damage: 6, notBeforeTurn: 4 },
    ],
    winText: ['O carimbo desce com um estalo seco.', 'Documento na mão. Paulista, agora.'],
    loseText: [
      'O guichê fecha. Yumi guarda seu lugar para a manhã seguinte.',
      'Desta vez vocês chegam com cada papel marcado.',
    ],
    onWin: [
      { kind: 'questDone', id: 'q_documents' },
      { kind: 'savvyXp', amount: 16 },
      { kind: 'act', act: 3 },
      { kind: 'moveTo', district: 'paulista', place: 'paulista_horizonte' },
    ],
    onLose: [
      { kind: 'sleep', quality: 'couch' },
      { kind: 'questDone', id: 'q_documents' },
      { kind: 'act', act: 3 },
      { kind: 'moveTo', district: 'paulista', place: 'paulista_horizonte' },
    ],
  },
  d_entrevista: {
    id: 'd_entrevista',
    name: 'A entrevista',
    subtitle: 'Toda resposta parece ter sido ensaiada por outra pessoa.',
    intro: ['Luz branca. Água em copo plástico. Três pessoas sem anotar nada.'],
    patience: 42,
    turnLimit: 12,
    arguments: [
      {
        id: 'experiencia',
        text: 'Eu aprendi a resolver problema sem manual.',
        topic: 'experiencia',
        power: 10,
      },
      {
        id: 'cidade',
        text: 'Em poucos dias, aprendi a circular e pedir ajuda.',
        topic: 'manha',
        power: 10,
      },
      {
        id: 'limite',
        text: 'Posso entregar resultado sem vender mentira.',
        topic: 'limite',
        power: 9,
      },
      {
        id: 'equipe',
        text: 'Trabalho melhor quando todo mundo entende o combinado.',
        topic: 'rede',
        power: 9,
      },
    ],
    tells: [
      { id: 'roteiro', text: 'A pergunta seguinte já está impressa antes da sua resposta.' },
      {
        id: 'silencio',
        text: 'A única pessoa interessada olha quando você abandona o discurso pronto.',
      },
    ],
    weakness: {
      affinity: 'gab',
      multiplier: 1.4,
      revealText: 'Uma resposta concreta quebra o roteiro.',
    },
    moves: [
      { id: 'jargao', text: '“Qual seu diferencial de alta performance?”', damage: 6 },
      { id: 'salario', text: '“Pretensão salarial?”', damage: 5 },
    ],
    winText: [
      'A pessoa do canto finalmente anota seu nome.',
      'Há trabalho. Não é milagre, mas começa na segunda.',
    ],
    loseText: [
      'A resposta automática chega antes do elevador.',
      'Seu Jorge manda o contato de um freela. A história continua.',
    ],
    onWin: [
      { kind: 'money', delta: 6000 },
      { kind: 'act', act: 4 },
      { kind: 'moveTo', district: 'zona_leste', place: 'zona_leste_radial' },
    ],
    onLose: [
      { kind: 'money', delta: 2500 },
      { kind: 'act', act: 4 },
      { kind: 'moveTo', district: 'zona_leste', place: 'zona_leste_radial' },
    ],
  },
  d_agua: {
    id: 'd_agua',
    name: 'A água subindo',
    subtitle: 'Não é contra a chuva. É contra o tempo.',
    intro: ['Tico amarra uma corda no portão. A água chega ao joelho.'],
    patience: 44,
    turnLimit: 10,
    arguments: [
      { id: 'rota', text: 'Pelo muro a correnteza perde força.', topic: 'rota', power: 11 },
      { id: 'corda', text: 'A corda mantém todo mundo junto.', topic: 'rede', power: 10 },
      {
        id: 'pausa',
        text: 'Esperamos o ônibus passar e cortar a corrente.',
        topic: 'tempo',
        power: 10,
      },
      {
        id: 'peso',
        text: 'As mochilas vão primeiro, por cima do portão.',
        topic: 'carga',
        power: 10,
      },
    ],
    tells: [
      { id: 'folhas', text: 'As folhas giram onde existe um bueiro.' },
      { id: 'muro', text: 'Junto ao muro, a água corre mais devagar.' },
      { id: 'onibus', text: 'Cada ônibus cria uma onda previsível.' },
    ],
    weakness: {
      affinity: 'grit',
      multiplier: 1.5,
      revealText: 'Ritmo e companhia vencem força bruta.',
    },
    moves: [
      { id: 'onda', text: 'Uma onda bate de lado.', damage: 7 },
      { id: 'frio', text: 'A água fria pesa nas pernas.', damage: 6 },
    ],
    winText: [
      'A garagem aparece depois do último portão.',
      'Tico bate duas vezes na chapa: “Val? Trouxe visita.”',
    ],
    loseText: [
      'Vocês recuam antes que a corrente fique forte demais.',
      'A vizinhança abre outro caminho por dentro das casas.',
    ],
    onWin: [{ kind: 'startDialogue', id: 'dlg_val' }],
    onLose: [
      { kind: 'sleep', quality: 'rough' },
      { kind: 'startDialogue', id: 'dlg_val' },
    ],
  },
  d_renan: {
    id: 'd_renan',
    name: 'A conversa no Minhocão',
    subtitle: 'Nenhuma cidade cabe num discurso de sucesso.',
    intro: ['Renan encosta na mureta. A garoa começa fina.'],
    patience: 46,
    turnLimit: 12,
    arguments: [
      {
        id: 'gente',
        text: 'Você chama de fraqueza tudo que depende de gente.',
        topic: 'rede',
        power: 11,
      },
      {
        id: 'origem',
        text: 'Você também chegou aqui sem conhecer o caminho.',
        topic: 'origem',
        power: 10,
      },
      {
        id: 'custo',
        text: 'Seu sucesso sempre deixa a conta para outra pessoa.',
        topic: 'custo',
        power: 11,
      },
      {
        id: 'escolha',
        text: 'Sobreviver não obriga ninguém a virar você.',
        topic: 'escolha',
        power: 10,
      },
    ],
    tells: [
      { id: 'sotaque', text: 'Quando se irrita, o sotaque do interior volta.' },
      { id: 'domingo', text: 'Ele escolheu um lugar vazio porque não queria plateia.' },
      { id: 'silencio', text: 'Renan não rebate quando você fala de quem pagou a conta.' },
    ],
    weakness: {
      affinity: 'gab',
      multiplier: 1.5,
      revealText: 'A origem que ele esconde ainda importa.',
    },
    moves: [
      { id: 'cinismo', text: '“Rede é o nome bonito que dão para favor.”', damage: 6 },
      { id: 'espelho', text: '“Você só está bravo porque faria igual.”', damage: 7 },
    ],
    winText: [
      'Renan olha a cidade antes de responder.',
      'Desta vez, o silêncio não é uma técnica.',
    ],
    loseText: [
      'Você não convence Renan. Mas também não aceita o espelho.',
      'A conversa termina; sua escolha permanece.',
    ],
    onWin: [{ kind: 'startDialogue', id: 'dlg_epilogo' }],
    onLose: [{ kind: 'startDialogue', id: 'dlg_epilogo' }],
  },
} as const satisfies Readonly<Record<string, DesenroloDef>>
