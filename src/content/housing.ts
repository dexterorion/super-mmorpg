import type { Centavos, HousingId } from '../core/types.js'
import type { HousingOption } from '../core/life/housing.js'

export interface HousingDef extends HousingOption {
  readonly name: string
  readonly district: string
  readonly monthlyRent: Centavos
  readonly comfort: number
  readonly commuteMinutes: number
  readonly description: string
}

export const housing: Readonly<Record<HousingId, HousingDef>> = {
  pensao_bixiga: {
    id: 'pensao_bixiga',
    name: 'Quarto em pensão no Bixiga',
    district: 'bixiga',
    monthlyRent: 95_000,
    comfort: 2,
    commuteMinutes: 42,
    description: 'Central e apertado; cozinha e banheiro compartilhados.',
  },
  kitnet_centro: {
    id: 'kitnet_centro',
    name: 'Kitnet na República',
    district: 'centro',
    monthlyRent: 155_000,
    comfort: 3,
    commuteMinutes: 31,
    description: 'Perto do metrô, com barulho e pouca luz natural.',
  },
  apartamento_zona_leste: {
    id: 'apartamento_zona_leste',
    name: 'Apartamento na Zona Leste',
    district: 'zona_leste',
    monthlyRent: 110_000,
    comfort: 4,
    commuteMinutes: 74,
    description: 'Mais espaço, duas conduções e risco de atraso na chuva.',
  },
  quarto_guarulhos: {
    id: 'quarto_guarulhos',
    name: 'Quarto em Guarulhos',
    district: 'guarulhos',
    monthlyRent: 72_000,
    comfort: 2,
    commuteMinutes: 108,
    description: 'Aluguel menor; ônibus intermunicipal domina a rotina.',
  },
  studio_copan: {
    id: 'studio_copan',
    name: 'Studio no Copan',
    district: 'centro',
    monthlyRent: 245_000,
    comfort: 4,
    commuteMinutes: 26,
    description: 'Arquitetura e serviços no térreo, mas renda alta comprometida.',
  },
}
