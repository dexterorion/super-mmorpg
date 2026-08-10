# Critérios de release — GAROA 1.0

Este documento responde a uma pergunta operacional: **quando GAROA 1.0 está
pronto?** Ele congela um produto finito, distingue a campanha já existente do
“jogo da vida” ainda incompleto e transforma qualidade em gates reproduzíveis.

Baseline auditada: commit `e8ad704` (`2026-08-09`). As fontes são primárias: a
[visão de jogo](GAME_VISION.md), o [estado público do produto](../README.md), o
código, os testes e os workflows do próprio repositório. A issue
[#17](https://github.com/dexterorion/super-mmorpg/issues/17) define o mapa do
release; a [#18](https://github.com/dexterorion/super-mmorpg/issues/18) pede este
recorte verificável.

## Definição executável de GAROA 1.0

GAROA 1.0 é um **RPG solo top-down para navegador**, em pt-BR, no qual uma
pessoa escolhe um entre seis pontos de partida sociais e uma entre cinco
moradias, atravessa fisicamente uma São Paulo reconhecível, conclui a campanha
de cinco atos e pode continuar uma trajetória de **365 dias simulados**. Nesse
ano, trabalho, estudo, deslocamento, moradia, vínculos, cuidado e conjuntura
disputam dinheiro e tempo; as decisões têm consequências diferentes conforme o
ponto de partida, mas nenhum arquétipo torna educação ou mudança de trajetória
impossível.

O release só existe quando uma pessoa consegue, pela interface real:

1. criar personagem, escolher moradia e concluir qualquer uma das quatro rotas
   finais da campanha;
2. jogar dias completos, escolhendo ao menos trabalho, estudo, cuidado,
   socialização e descanso, com deslocamento físico ou transporte;
3. receber e pagar renda, aluguel, transporte, educação e cuidado em ciclos
   mensais, sem números fracionários ou saldo silenciosamente incoerente;
4. matricular-se e progredir em uma formação, mudar de ocupação e mudar de
   moradia;
5. construir ou recusar parceria, casamento e filhos, com custo de cuidado e
   impacto de tempo visíveis;
6. alcançar o dia 365 e receber um balanço da trajetória que reflita escolhas,
   não uma pontuação moral única;
7. salvar, fechar, recarregar e continuar sem perder o estado de qualquer
   sistema anterior.

### Conteúdo mínimo congelado

O 1.0 exige exatamente o seguinte piso, não uma expansão ilimitada:

| Conteúdo           | Piso do 1.0                                                                       |
| ------------------ | --------------------------------------------------------------------------------- |
| Pontos de partida  | os 6 arquétipos existentes                                                        |
| Moradias           | as 5 opções existentes, selecionáveis também durante a trajetória                 |
| Cidade             | os 8 distritos e 19 lugares existentes, todos navegáveis                          |
| Cultura paulistana | as 5 interações existentes: Copan, CCSP, Vai-Vai, MASP e Ibirapuera               |
| Campanha           | 5 atos, 6 Desenrolos e 4 finais                                                   |
| Educação           | os 5 percursos existentes, com matrícula, cobrança, progresso e conclusão         |
| Trabalho           | 1 atividade própria por arquétipo e pelo menos 2 mudanças de ocupação alcançáveis |
| Vida familiar      | parceria, casamento, decisão sobre filhos e ao menos 1 evento de cuidado          |
| Conjuntura         | os 4 eventos existentes, datados, atribuídos e com efeito legível                 |
| Horizonte          | 365 dias, com fechamento diário e mensal e balanço anual                          |

Números maiores podem entrar depois do 1.0. Eles não bloqueiam este release.

## Matriz de lacunas

Legenda: **concluído** = jogável e coberto por gate; **parcial** = domínio ou UI
existe, mas não fecha o loop; **ausente** = não há caminho jogável equivalente.

| Capacidade                                 | Estado                       | Evidência atual                                                                                                                                                                                          | Para ficar concluída                                                                                    |
| ------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Campanha de cinco atos e quatro finais     | **Concluído**                | O teste de browser percorre a interface até `Fim`, e o headless cobre as quatro combinações ([Playwright](../tools/playtest/visual/act1.spec.ts), [teste headless](../tools/playtest/run.test.ts)).      | Manter os gates verdes.                                                                                 |
| Exploração física, colisão, NPCs e portais | **Concluído**                | Phaser cria corpos, colisores, NPCs sólidos, proximidade e portais ([backdrop](../src/engine/backdrop.ts)); há oito mapas distritais testados ([mapas](../src/engine/cityMaps.test.ts)).                 | Manter a rota E2E em Chromium e Firefox.                                                                |
| Arquétipos e escolha inicial de moradia    | **Concluído**                | Seis perfis e cinco moradias alimentam a criação real ([arquétipos](../src/content/archetypes.ts), [moradias](../src/content/housing.ts), [UI](../src/main.ts)).                                         | Manter testes de criação/save.                                                                          |
| Modal, custo e tempo de deslocamento       | **Concluído**                | A pé, bike, busão e metrô calculam chuva, pico, custo e energia; `GameSession` aplica o modal selecionado ([commute](../src/core/life/commute.ts), [session](../src/core/session.ts)).                   | Cobrir ao menos um trajeto por modal no E2E do ano.                                                     |
| Educação desigual                          | **Parcial**                  | Cinco percursos, avaliação por renda/tempo/arquétipo, matrícula, cobrança e conclusão existem e aparecem no Caderninho ([education](../src/core/life/education.ts), [UI](../src/main.ts)).               | Integrar horas de estudo ao calendário jogável e provar conclusão e efeitos pela interface.             |
| Parceria, casamento, filhos e cuidado      | **Parcial**                  | Estado, regras de transição, custos e pressão de cuidado são persistíveis e testados ([family](../src/core/life/family.ts), [estado](../src/core/state/state.ts)).                                       | Oferecer escolhas e consequências na interface e no calendário; cobrir “sim” e “não”.                   |
| Conjuntura econômica e social              | **Parcial**                  | Quatro eventos alteram renda, aluguel, dinheiro e disposição durante a campanha ([conjuncture](../src/core/life/conjuncture.ts), [session](../src/core/session.ts)).                                     | Distribuir eventos pelo horizonte anual e exibir causa, efeito e fonte dentro do jogo.                  |
| Trabalho e carreira                        | **Parcial**                  | Cada arquétipo tem jornada própria, trabalho diário, salário mensal proporcional e uma transição jogável ([career](../src/core/life/career.ts), [calendar](../src/core/life/calendar.ts)).               | Acrescentar a segunda transição congelada e conteúdo narrativo para as mudanças.                        |
| Mudança de moradia                         | **Parcial**                  | As cinco moradias podem ser escolhidas durante o ano; mudança cobra entrada e altera aluguel e deslocamento ([housing](../src/core/life/housing.ts), [UI](../src/main.ts)).                              | Acrescentar visita/contrato narrativos e cobrir escolhas distintas no E2E.                              |
| Calendário diário/mensal/anual             | **Parcial**                  | Agenda, fechamento diário e acerto mensal idempotentes atravessam 365 dias para os seis arquétipos ([calendar](../src/core/life/calendar.ts), [runner anual](../tools/playtest/life-year.ts)).           | Integrar todos os verbos, recorrências e decisões; acrescentar balanço e epílogo anual pela interface.  |
| Economia doméstica integrada               | **Parcial**                  | Centavos, renda, aluguel e custos existem em módulos separados; conjuntura altera valores ([estado](../src/core/state/state.ts), [family](../src/core/life/family.ts)).                                  | Cobrar/pagar todos os recorrentes uma vez por ciclo e expor extrato compreensível.                      |
| Lugares reais como decisões                | **Concluído no piso**        | Os cinco lugares culturais congelados têm ação com efeito e teste estrutural ([mundo](../src/content/world/act1.ts), [teste de conteúdo](../src/content/content.test.ts)).                               | Revisão factual e visual; lugares adicionais são pós-1.0.                                               |
| Save e migrações                           | **Parcial**                  | Estado serializável, slots, checksum e migrações existem; a campanha testa save/reload ([save](../src/core/save/save.ts), [Playwright](../tools/playtest/visual/act1.spec.ts)).                          | Testar round-trip de um estado avançado contendo educação, família, carreira, moradia e recorrências.   |
| Música, ambiência e efeitos                | **Concluído funcionalmente** | Música procedural, tráfego, chuva, passos, viagem, diálogo e Desenrolo usam Web Audio ([audio](../src/engine/audio.ts)).                                                                                 | Aprovação auditiva manual e teste de mute/autoplay nos dois browsers.                                   |
| Identidade e acabamento visual             | **Parcial**                  | Há assets coerentes, screenshots reais e captura automatizada, mas não há baseline visual aprovado nem scorecard versionado ([assets](ART_ASSETS.md), [captura](../tools/playtest/visual/act1.spec.ts)). | Satisfazer o gate visual abaixo e congelar as imagens aprovadas.                                        |
| Acessibilidade e controles                 | **Parcial**                  | Teclado, mouse e gamepad são declarados; o fluxo E2E cobre teclado ([README](../README.md), [Playwright](../tools/playtest/visual/act1.spec.ts)).                                                        | Completar jornada sem mouse; foco visível; texto sem corte a 1280×720; teste manual de gamepad e áudio. |

O inventário mostra por que “campanha terminável” não significa “jogo da vida
terminado”: trabalho, mudança de moradia e calendário anual ainda estão
ausentes; educação, família, conjuntura e economia ainda não fecham um mesmo
loop diário e mensal.

## Gates obrigatórios

Todos os gates são cumulativos. Exceção ou teste ignorado precisa de uma issue
com prazo; não torna um release aprovável.

### G1 — Integridade automática

Em checkout limpo, Node 22 e 24:

```bash
npm ci
npm run verify
npm run build
npm run playtest -- --runs 1000
npm run playtest:visual
node tools/ci/check-bundle-size.mjs
```

Aceite: comandos com código `0`; cobertura global ≥ 70%, core com linhas,
funções e statements ≥ 90% e branches ≥ 85%; 1.000 execuções sem softlock;
quatro finais alcançáveis; bundle dentro dos limites codificados. Os workflows
CI, E2E e Security devem estar verdes no mesmo commit ([CI](../.github/workflows/ci.yml),
[E2E](../.github/workflows/e2e.yml), [Security](../.github/workflows/security.yml)).

### G2 — Trajetória anual

Um teste headless determinístico e um E2E devem provar, em no máximo 365
fechamentos diários, que:

- ao menos uma trajetória completa trabalho + estudo + mudança + família;
- uma trajetória sem casamento/filhos e outra com responsabilidades de cuidado;
- cada arquétipo sobrevive 1.000 seeds sem softlock, saldo inválido ou estado
  impossível;
- cobranças e pagamentos mensais acontecem uma única vez, inclusive após
  save/reload no limite do mês;
- o balanço do dia 365 é alcançável sem exigir uma escolha aleatória específica.

Artefato obrigatório: `playtest-report/life-year.json`, contendo seed,
arquétipo, decisões, ciclos processados, saldo final e invariantes. O primeiro
tracer bullet produz o artefato para os seis arquétipos, com carreira e mudança
de moradia; o gate permanece **vermelho** até incluir família e o balanço anual
nas trajetórias.

### G3 — Conteúdo e representação

Os schemas e testes devem garantir referências válidas, diálogos alcançáveis,
no máximo seis balões por nó e 90 caracteres por balão, como já faz o
[teste de conteúdo](../src/content/content.test.ts). Além disso:

- fatos contemporâneos exibem data e fonte primária;
- os seis arquétipos têm caminhos viáveis e consequências distintas;
- educação nunca é bloqueada por arquétipo;
- derrota em Desenrolo e dificuldade econômica mudam a rota, sem game over;
- revisão humana registra ausência de caricatura, glamourização da pobreza ou
  miserabilismo, conforme a [visão narrativa](../IMPLEMENTATION_PLAN.md).

### G4 — Visual reproduzível

Capturas fixas em Chromium, viewport 1280×720, seed e rota versionadas. Antes de
publicar, uma pessoa avalia cada cena-chave de 1 a 5 em oito eixos:

1. legibilidade de personagem e NPC;
2. coerência de escala e pixel grid;
3. composição e hierarquia visual;
4. densidade e variedade ambiental;
5. contraste e legibilidade do HUD;
6. animação e feedback de interação;
7. identidade arquitetônica/urbanística paulistana;
8. consistência entre distritos e interiores.

Aceite: nenhum eixo abaixo de `3,0`; média ≥ `3,8`; identidade paulistana ≥
`4,0`; zero clipping, distorção, texto cortado ou interação invisível de
severidade crítica. Pixel diff/SSIM/LPIPS, quando automatizados, detectam
regressão contra o baseline aprovado; **não substituem** a rubrica humana.

Duas iterações consecutivas com ganho menor que `0,1` indicam platô e encerram
polimento adicional **somente se os limiares já foram atingidos**. Caso
contrário, o release continua bloqueado. O scorecard assinado e as imagens
aprovadas ficam em `playtest-report/` e `docs/screenshots/`.

### G5 — Desempenho e experiência

Na rota visual de referência, depois de 10 segundos de aquecimento:

- tempo de frame p95 ≤ `16,7 ms` e p99 ≤ `33 ms`;
- nenhuma exceção ou erro de console;
- jornada principal completa em Chromium e Firefox;
- foco de teclado sempre visível e nenhuma ação obrigatória dependente de mouse;
- áudio só inicia após interação, mute interrompe música, ambiência e efeitos.

Artefato obrigatório: `playtest-report/performance.json`, com navegador,
hardware/runner, amostras, p95 e p99. O gate de frame time é **vermelho hoje**:
há evento de observabilidade para performance, mas nenhum teste publica essas
estatísticas ([eventos](../src/observability/events.ts)).

### G6 — Persistência e compatibilidade

Um save criado na versão imediatamente anterior abre no 1.0. O teste de
round-trip deve incluir dia ≥ 31, formação ativa, família, nova ocupação, nova
moradia, conjuntura aplicada e marcadores de recorrência. Carregar duas vezes
não pode duplicar salário, aluguel, mensalidade ou evento.

### G7 — Release auditável

- `README.md` descreve apenas o que está realmente jogável;
- screenshots foram regeneradas e inspecionadas no commit candidato;
- `PLAYTEST_LOG.md` registra a rodada final e cada correção tem regressão;
- licenças/créditos acompanham todos os assets;
- não há vulnerabilidade alta conhecida nos gates de Security;
- `git status` está limpo e CI, E2E e Security estão verdes no SHA candidato.

## Controle de escopo

Depois que este documento entrar em `main`, uma mudança só bloqueia o 1.0 se:

1. satisfaz um item ainda parcial/ausente da definição executável; ou
2. corrige falha em um gate G1–G7; ou
3. corrige perda de progresso, softlock, falha de acessibilidade ou conteúdo
   factual/representacional incorreto.

Todo o resto — novos bairros, mais NPCs, interiores adicionais, multiplayer/MMO,
economia online, criação procedural, voz, localização, mobile nativo, conteúdo
após o dia 365 e aumento dos pisos da tabela — é **pós-1.0**. Uma proposta para
adicionar outro requisito obrigatório precisa remover outro de custo equivalente
ou demonstrar que fecha um gate já aprovado que regrediu.

## Condição de encerramento

GAROA 1.0 pode ser marcado concluído quando:

- todos os itens da matriz estiverem **Concluídos** no piso congelado;
- G1–G7 estiverem verdes no mesmo SHA candidato;
- a matriz e os artefatos não contiverem waiver aberto;
- duas rodadas de playtest completas consecutivas não encontrarem defeito
  bloqueador novo.

Cumprida essa condição, novas ideias deixam de prolongar o 1.0 e passam para o
backlog pós-release. Esse é o ponto ótimo operacional: todos os limiares estão
atingidos e iterações adicionais não corrigem um gate nem elevam o score visual
em pelo menos `0,1`.
