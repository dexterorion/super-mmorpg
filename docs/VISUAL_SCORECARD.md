# Scorecard visual do GAROA

Este documento define como avaliar a qualidade visual do GAROA sem confundir
fidelidade a uma imagem anterior com qualidade artística. Comparações de pixels,
SSIM e LPIPS respondem **quanto mudou**; a rubrica humana responde **se ficou
melhor e se parece São Paulo**.

## Resultado de referência

Baseline: commit `e8ad704`, capturas publicadas em `docs/screenshots/`, Chromium,
viewport 1280×720, DPR 1, em 9 de agosto de 2026.

| Eixo humano                                |     Peso | Nota (0–5) | Evidência observada                                                                                                |
| ------------------------------------------ | -------: | ---------: | ------------------------------------------------------------------------------------------------------------------ |
| Identidade paulistana                      |      20% |       1,00 | Lugares são reconhecidos principalmente pelos textos; faltam silhuetas, materiais e mobiliário urbano específicos. |
| Coerência entre personagens e ambiente     |      15% |       1,25 | Sprites têm a mesma origem técnica, mas escala, detalhe e presença não acompanham o cenário e o HUD.               |
| Composição e hierarquia visual             |      15% |       2,25 | Títulos e caixas conduzem a leitura, porém encobrem grande parte do espaço jogável.                                |
| Densidade e variedade ambiental            |      15% |       1,25 | Pisos, bancos, árvores, carros e fachadas se repetem em padrões evidentes; amplas áreas ficam vazias.              |
| Movimento e vida urbana                    |      10% |       1,00 | Chuva dá movimento, mas as cenas não comunicam fluxo de pedestres, trânsito ou atividade local.                    |
| Legibilidade e acessibilidade da interface |      15% |       2,50 | Contraste geral é bom; há texto pequeno, cortes nas bordas e disputa entre HUD, radar, diálogo e ações.            |
| Acabamento e consistência                  |      10% |       2,25 | Paleta e molduras são consistentes; repetição, clipping e escala reduzem a sensação de acabamento.                 |
| **Média ponderada**                        | **100%** |   **1,61** | Baseline que deve ser superado, não uma imagem dourada a preservar.                                                |

Cada nota deve trazer ao menos uma evidência observável. Não se aceita nota
calculada por modelo generativo como substituta da revisão humana.

## Cenas canônicas

`npm run playtest:visual` deve produzir as cenas abaixo pelo roteiro real da UI.
A captura aprovada é copiada de `playtest-report/screenshots/` para
`docs/screenshots/`. Todas são obrigatórias no gate de release.

| Cena             | Arquivo publicado | O que ela testa                                 |
| ---------------- | ----------------- | ----------------------------------------------- |
| Tela inicial     | `title.png`       | marca, foco, tipografia e primeiro impacto      |
| Chegada ao Tietê | `arrival.png`     | hierarquia de narrativa, HUD e atmosfera        |
| Exploração       | `exploration.png` | escala, colisão legível, câmera e personagem    |
| Encontro com NPC | `npc.png`         | distinção, direção e integração dos personagens |
| Caderninho       | `caderninho.png`  | densidade, clipping, estados e leitura          |
| Desenrolo        | `desenrolo.png`   | feedback e escolhas no confronto                |
| Repartição       | `reparticao.png`  | multidão, repetição e radar econômico           |
| Entrevista       | `entrevista.png`  | identidade do lugar e composição narrativa      |
| Enchente         | `enchente.png`    | leitura do perigo, água e atmosfera             |
| Minhocão         | `minhocao.png`    | marco arquitetônico e profundidade urbana       |
| Encerramento     | `ending.png`      | conclusão, estado do personagem e legibilidade  |

Novas cenas só entram quando cobrem um estado visual que as existentes não
cobrem. Trocar o nome ou a rota de uma cena exige atualizar o teste, esta tabela
e a baseline no mesmo commit.

## Protocolo de captura reproduzível

1. Partir de uma árvore limpa e registrar o SHA avaliado.
2. Usar as versões de Node e navegador fixadas pelo projeto; instalar com
   `npm ci` e Playwright, sem reutilizar um servidor externo.
3. Executar `npm run playtest:visual -- --project=chromium` em viewport 1280×720,
   DPR 1, zoom 100%, locale `pt-BR`, fuso `America/Sao_Paulo` e sem extensões.
4. Fixar seed do jogo, relógio, dados econômicos e aleatoriedade antes de ativar
   comparação automática. Enquanto algum deles não estiver fixo, mascarar sua
   região ou não usar pixel diff nessa cena.
5. Esperar fontes, assets e a condição explícita de estabilidade da cena; não
   usar somente um atraso arbitrário. Desativar animações que não são o objeto
   do teste. Para chuva, trânsito e NPCs, capturar também uma janela temporal.
6. Confirmar 11 PNGs de 1280×720, sem erro de console, asset ausente ou fallback
   de fonte. Guardar resultado, SHA, navegador e sistema operacional no relatório.
7. Comparar com a última baseline **aprovada**, inspecionar diferenças e só então
   promover os PNGs para `docs/screenshots/`.

O conjunto atual já fixa navegador e viewport no Playwright, mas ainda precisa
fixar DPR, locale, fuso, seed e o instante de captura antes de ser usado como
golden test estrito.

## Métricas objetivas

As métricas formam gates de engenharia. Elas não entram na média estética.

| Métrica               | Como coletar                                             | Gate de release                                                                                            |
| --------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Integridade das cenas | manifesto de arquivos e dimensões                        | 11/11 presentes; 1280×720; nenhum PNG vazio                                                                |
| Erros de renderização | console, `pageerror`, respostas de assets                | zero erro e zero asset 4xx/5xx                                                                             |
| Overflow e clipping   | DOM: caixas fora do viewport; revisão do canvas          | zero texto/controle interativo cortado; zero severidade crítica                                            |
| Contraste da UI       | WCAG 2.2 sobre texto e controles HTML                    | AA: 4,5:1 normal, 3:1 grande e componentes                                                                 |
| Alvos interativos     | bounding boxes no viewport de jogo                       | mínimo 44×44 CSS px, salvo controles por teclado equivalentes documentados                                 |
| Nitidez pixel art     | coordenadas e escala inteiras; image-rendering           | 100% dos sprites pixel art alinhados à grade, sem escala fracionária                                       |
| Repetição ambiental   | distribuição de tiles/props por cena                     | nenhum tile/prop não estrutural ocupa >20% dos objetos visíveis; ao menos 8 famílias de props por exterior |
| Presença urbana       | contagem por cena exterior                               | ao menos 3 camadas (arquitetura, circulação, mobiliário) e 5 elementos urbanos distintos                   |
| Diferença visual      | pixel diff para UI estática; SSIM/LPIPS como diagnóstico | mudança inesperada falha; mudança aprovada substitui a baseline                                            |
| Fluidez               | frame time durante 60 s na máquina de referência         | p95 ≤16,7 ms; p99 ≤33 ms; nenhuma pausa >100 ms                                                            |
| Estabilidade animada  | amostra de 10 s de chuva, NPCs e tráfego                 | sem teleportes, tearing, travamentos ou colisão visual                                                     |

Os limiares de variedade e presença urbana são proxies contra vazio e repetição,
não receitas de composição. Uma cena pode cumprir ambos e ainda reprovar na
rubrica humana.

## Rubrica humana de 0 a 5

Todos os sete eixos usam a mesma âncora:

- **0 — quebrado:** impede compreender ou jogar a cena.
- **1 — rascunho:** função reconhecível, arte genérica, vazia ou incoerente.
- **2 — funcional:** leitura possível, mas repetição e inconsistências dominam.
- **3 — bom:** intenção clara, coerência suficiente e nenhum problema dominante.
- **4 — forte:** identidade própria, variedade deliberada e acabamento consistente.
- **5 — excepcional:** referência de qualidade para o projeto, sem fragilidade perceptível.

Para identidade paulistana, nota 3 exige que o lugar seja distinguível sem o
título; nota 4 exige ao menos dois sinais arquitetônicos ou urbanísticos
específicos e integrados à jogabilidade; nota 5 exige leitura imediata sem virar
uma cópia literal. Referências devem vir de fontes institucionais registradas em
`docs/RESEARCH.md`.

## Revisão humana e decisão

1. Três revisores avaliam individualmente as 11 cenas, na ordem embaralhada,
   primeiro sem nomes de bairro e depois com a UI completa.
2. Cada revisor dá 0–5 por eixo e escreve uma evidência curta para toda nota
   abaixo de 3 ou acima de 4. Um deles faz também a rota jogável, não só imagens.
3. O resultado por eixo é a mediana dos revisores. A nota final é a média
   ponderada das sete medianas, arredondada para duas casas apenas na exibição.
4. Divergência maior que 1 ponto em um eixo gera conversa de calibração; os
   revisores não são obrigados a convergir, e a mediana original fica registrada.
5. Problemas críticos (texto ilegível, ação inacessível, distorção, asset ausente,
   colisão enganosa ou representação factual indevida) reprovam independentemente
   da média.

Uma candidata a GAROA 1.0 passa quando:

- todas as métricas objetivas passam;
- nenhum eixo humano fica abaixo de 3,00;
- média ponderada é pelo menos 3,80;
- identidade paulistana é pelo menos 4,00;
- não há problema crítico aberto;
- duas rodadas consecutivas melhoram menos de 0,10 ponto sem regressão por eixo,
  indicando estabilização, e a segunda é aprovada pelos revisores.

O “ponto ótimo” não é maximizar eternamente uma nota. É cumprir qualidade,
identidade, acessibilidade e desempenho, estabilizar por duas rodadas e então
direcionar esforço para gameplay ou conteúdo com maior impacto.

## Fundamentos do método

- [Playwright — visual comparisons](https://playwright.dev/docs/test-snapshots):
  comparação determinística exige o mesmo ambiente de renderização.
- [SSIM — Wang et al.](https://ece.uwaterloo.ca/~z70wang/publications/ssim.pdf):
  aproxima mudança estrutural percebida, não preferência estética.
- [LPIPS — Zhang et al.](https://arxiv.org/abs/1801.03924): distância perceptual
  útil para triagem de alterações, não como árbitro de beleza.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/): contraste, foco e tamanho de alvo
  são requisitos verificáveis de interface.
