import type { ArchetypeId, Centavos } from '../core/types.js'
import type { PlayerStats } from '../core/state/state.js'

export interface ArchetypeDef {
  readonly id: ArchetypeId
  readonly name: string
  readonly description: string
  readonly occupation: string
  readonly monthlyIncome: Centavos
  readonly startingMoney: Centavos
  readonly energy: number
  readonly stats: PlayerStats
}

export const archetypes: Readonly<Record<ArchetypeId, ArchetypeDef>> = {
  pedreiro: {
    id: 'pedreiro',
    name: 'Pedreiro',
    description: 'Obra cedo, endereço variável e Fôlego alto.',
    occupation: 'Construção civil',
    monthlyIncome: 280_000,
    startingMoney: 42_000,
    energy: 70,
    stats: { savvy: 1, savvyXp: 0, gab: 1, instinct: 1, grit: 3 },
  },
  faria_limer: {
    id: 'faria_limer',
    name: 'Faria-limer',
    description: 'Salário maior, horas longas e pressão constante.',
    occupation: 'Mercado financeiro',
    monthlyIncome: 850_000,
    startingMoney: 120_000,
    energy: 52,
    stats: { savvy: 1, savvyXp: 0, gab: 3, instinct: 1, grit: 1 },
  },
  artista: {
    id: 'artista',
    name: 'Artista',
    description: 'Renda irregular, repertório cultural e rede criativa.',
    occupation: 'Produção cultural',
    monthlyIncome: 190_000,
    startingMoney: 34_000,
    energy: 60,
    stats: { savvy: 1, savvyXp: 0, gab: 1, instinct: 1, grit: 2 },
  },
  entregador: {
    id: 'entregador',
    name: 'Entregador',
    description: 'Conhece atalhos; chuva e demanda mudam a renda.',
    occupation: 'Entrega por aplicativo',
    monthlyIncome: 240_000,
    startingMoney: 28_000,
    energy: 68,
    stats: { savvy: 2, savvyXp: 0, gab: 1, instinct: 2, grit: 2 },
  },
  estudante: {
    id: 'estudante',
    name: 'Estudante',
    description: 'Pouca renda, meia tarifa e possibilidade de formação.',
    occupation: 'Estudo e estágio',
    monthlyIncome: 120_000,
    startingMoney: 22_000,
    energy: 58,
    stats: { savvy: 1, savvyXp: 0, gab: 1, instinct: 2, grit: 1 },
  },
  saude: {
    id: 'saude',
    name: 'Profissional da saúde',
    description: 'Plantões imprevisíveis, estabilidade e desgaste alto.',
    occupation: 'Saúde',
    monthlyIncome: 480_000,
    startingMoney: 65_000,
    energy: 55,
    stats: { savvy: 1, savvyXp: 0, gab: 2, instinct: 2, grit: 2 },
  },
}
