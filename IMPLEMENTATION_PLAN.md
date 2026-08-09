# GAROA — Plano de Implementação (handoff)

Documento de execução para o agente que vai continuar este projeto. Assume **zero contexto prévio**: tudo o que é preciso saber está aqui ou nos arquivos citados.

Leia as seções 1–3 antes de escrever qualquer linha. Depois execute as fases da seção 5 na ordem.

---

## 1. O que é este projeto

**GAROA** — um RPG 2D estilo 16-bit, jogável no browser, sobre alguém que acabou de chegar do interior em São Paulo e precisa desbravar a cidade.

- **Logline:** você desce do ônibus às 5h da manhã na Rodoviária do Tietê com R$ 340 e o endereço de um primo que sumiu. A cidade não te espera.
- **Duração alvo:** ~5 horas para zerar (5 atos de ~1h).
- **Plataforma:** browser, com save state em localStorage.
- **Idioma:** conteúdo do jogo em **pt-BR**; código, identificadores, commits e comentários em **inglês**.

### Decisões já tomadas — não reabrir

Estas foram escolhidas pelo dono do projeto. Não proponha alternativas, apenas execute.

| Decisão                | Escolha                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| Renderização           | **Phaser 3** + TypeScript + Vite                                                      |
| Arte                   | **Gerada por código** (matrizes de pixel + paleta), não asset pack                    |
| Sistema de conflito    | **Desenrolo**: turn-based JRPG em tela cheia                                          |
| Escopo desta entrega   | **Ato 1 completo** + toda a infraestrutura (fatia vertical)                           |
| Gerenciador de pacotes | npm                                                                                   |
| Deployment             | **Fora de escopo por enquanto.** O build gera artifact; o dono monta o deploy depois. |

### Modo de trabalho exigido pelo dono

> "A idéia é que você fique iterando e testando o jogo. Navegando por ele, vendo se existem problemas de uso, e etc. Fique fazendo isso em loop."

Isto **não é opcional e não é uma fase final**. A partir do momento em que o Ato 1 estiver jogável, o trabalho é: rodar o playtest → ler os resultados e screenshots → achar problemas de usabilidade → corrigir → adicionar teste de regressão → repetir. Cada rodada registrada em `PLAYTEST_LOG.md`.

Por isso a Fase E (harness de playtest) existe e por isso o `core/` é headless: sem essas duas coisas, "iterar em loop" vira palpite.

---

## 2. Design do jogo (o que você precisa para escrever conteúdo)

### Recursos

| Domínio (código) | Jogo (pt-BR)      | Papel                                       | Recupera                   |
| ---------------- | ----------------- | ------------------------------------------- | -------------------------- |
| `money`          | **Grana**         | Moeda, em **centavos** (nunca float)        | Trabalho, quests           |
| `energy`         | **Disposição**    | O "HP". Gasta ao andar, trabalhar, discutir | Dormir, comer, acolhimento |
| `transit`        | **Bilhete Único** | Créditos de transporte, em centavos         | Recarrega com Grana        |

### Progressão

- `savvy` = **Manha** (nível 1–10). Sobe ao **aprender coisas sobre a cidade**, nunca por "matar". Cada nível libera opções de diálogo e aumenta o teto de Disposição.
- Afinidades (0–10 cada): `gab` = **Lábia** (convencer), `instinct` = **Faro** (perceber golpe/atalho), `grit` = **Fôlego** (aguentar, insistir).

### Tempo

Dia dividido em **Manhã / Tarde / Noite** (`morning` / `afternoon` / `night`). Ações relevantes consomem um período. ~18 dias in-game ≈ 5h reais. Dá urgência estrutural (aluguel vence, entrevista tem data) sem relógio de tempo real pressionando.

### Desenrolo — o sistema de conflito

Tela de batalha JRPG 16-bit, mas **o inimigo é sempre uma situação, nunca uma pessoa a ser ferida**: a fila da repartição, o cambista, a entrevista, a água subindo.

```
┌──────────────────────────────┐
│      FILA DA REPARTIÇÃO      │
│      Paciência ▓▓▓▓▓░░░ 62%  │
├──────────────────────────────┤
│ "Sem comprovante de          │
│  residência não dá, moço."   │
├──────────────┬───────────────┤
│ ▸ Argumentar │ Disposição 40 │
│   Observar   │ Grana  R$ 87  │
│   Insistir   │ Manha  Nv. 3  │
│   Item       │               │
└──────────────┴───────────────┘
```

- **HP do inimigo** = Paciência. **HP do jogador** = Disposição.
- **Argumentar** (Lábia) — dano alto. Cada argumento tem um `topic`; repetir o mesmo tópico **corta a força pela metade a cada vez**, então spammar a linha mais forte para de funcionar no turno 3. Alguns argumentos a situação _rebate_ (dano zero).
- **Observar** (Faro) — não causa dano; revela um `tell` por vez e, no último, a fraqueza. Também deixa você "braced": o próximo golpe da situação dói metade. É a ação que ensina o jogador a **ler** São Paulo.
- **Insistir** (Fôlego) — dano baixo garantido, custa Disposição. Sempre funciona, sempre cansa.
- **Item** — café, salgado, telefone, documento, o contato de alguém.
- **Derrota nunca é game over.** Você perde o dia, a grana ou a oportunidade — e a história continua por outro caminho. Nunca existe tela de "you died". Isto está implementado: `finish()` em `desenrolo.ts` garante Disposição ≥ 1 ao sair.

### Regras de escrita — o "sem ser massivo"

O dono pediu explicitamente história iterativa, com conversas interessantes, **fácil de entender e sem ser massiva**. Traduzido em regras verificáveis pelo content linter:

1. Máximo **2 linhas visuais por balão** (~90 caracteres).
2. Máximo **6 balões por cena** antes de uma escolha ou de devolver o controle.
3. Toda escolha tem consequência visível em até ~10 minutos de jogo.
4. Nenhuma parede de lore. O que o jogador precisa saber está no HUD, no Caderninho ou na boca de um NPC.
5. Caderninho (diário automático): objetivo atual **em uma frase** + o que já se aprendeu sobre a cidade.

### Tom

Afetuoso e engraçado sem ser piadista. A cidade é dura e generosa ao mesmo tempo. **Nada de caricatura, nada de glamourizar pobreza, nada de miserabilismo.** Os personagens não são tipos, são gente. O antagonista do Ato 3 (Renan) também veio do interior — ele é o espelho do protagonista, não um vilão de bigode.

---

## 3. Arquitetura e regras invioláveis

```
src/
  core/            # TypeScript PURO. Zero Phaser, zero DOM. 100% testável.
    types.ts       # vocabulário compartilhado
    state/         # GameState + helpers imutáveis
    rules/         # conditions.ts + effects.ts (interpretadores de dado)
    dialogue/      # motor de grafo de diálogo
    desenrolo/     # motor de batalha turn-based
    economy/       # grana, disposição, bilhete, relógio, XP
    rng/           # RNG semeado determinístico
    save/          # serialização, migrations, checksum, base64
    items/         # tipo ItemDef
    world/         # tipos PlaceDef / DistrictDef / NpcDef
    session.ts     # ⭐ a fachada: availableActions() / perform()
  content/         # DADOS, não código: distritos, NPCs, diálogos, quests, Desenrolos
    schema/        # zod — valida todo conteúdo em build e em teste
  engine/          # adapters Phaser: Scenes, renderers, input, câmera, áudio
  platform/        # localStorage, clock, telemetria (implementações das portas)
  observability/   # event bus tipado + exporters plugáveis
tools/
  art/             # pixel art como código → gera atlas PNG
  playtest/        # harness de playtest headless
  ci/              # check-bundle-size.mjs
```

### Regra de camada (já enforced — não quebre)

```
core     ← não depende de ninguém
content  ← depende só de core
engine   ← depende de core, content, platform, observability
```

Enforced em `eslint.config.js` via `no-restricted-imports` e `no-restricted-globals`. **Se `core/` importar Phaser ou tocar o DOM, o harness de playtest headless para de funcionar** — é por isso que a regra existe, não é purismo. Adicione também um teste de arquitetura (Fase B) que falha o CI.

### A regra mais importante do projeto

> **Phaser e o bot de playtest dirigem o jogo pela MESMA API: `GameSession`.**

`availableActions(state)` retorna as ações possíveis; `perform(state, action)` executa. O Phaser renderiza o que `availableActions()` devolve; o bot headless chama exatamente o mesmo método sem browser nenhum.

Consequência: um bug que o bot acha é um bug que o jogador teria. Não são duas implementações que podem divergir. **Nunca** coloque regra de jogo dentro de uma Scene do Phaser.

### Outras invariantes

- **Estado é imutável.** Toda mutação retorna um novo `GameState`. Isso permite ao harness bifurcar um estado, explorar um ramo e descartá-lo — é assim que se procura softlock sem replay desde o início.
- **Nunca `Math.random()`.** Todo acaso passa por `createRng(state.rngState)` e devolve `rngState` atualizado. É o que torna uma falha reproduzível por seed.
- **Dinheiro em centavos**, sempre inteiro.
- **Conditions e Effects são dados, não closures.** Isso é deliberado: porque um gate é um objeto simples, o harness consegue ler todos os gates do jogo e provar que nenhuma opção é inalcançável. Uma closure seria opaca a essa análise. Se precisar de uma regra nova, **adicione uma variante ao union type**, não uma função.

---

## 4. Estado atual do repositório (verificado)

`main` sem commits ainda (repo novo, remote `git@github.com:dexterorion/super-mmorpg.git`).

Verificado agora: **`npx tsc --noEmit` limpo** e **52 testes passando**.

### Pronto e funcionando

| Arquivo                                                               | Conteúdo                                                                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` | scaffold; TS strict com `noUncheckedIndexedAccess`; aliases `@core`, `@content`, `@engine`, `@platform`, `@obs` |
| `eslint.config.js`                                                    | flat config v9, type-checked, + regras de camada                                                                |
| `.prettierrc.json`, `.editorconfig`, `.nvmrc`, `.gitignore`           | higiene                                                                                                         |
| `.github/workflows/ci.yml`                                            | matrix Node 22/24: typecheck → lint → format → coverage → art:build → playtest → build → bundle budget          |
| `.github/workflows/e2e.yml`                                           | Playwright chromium+firefox, publica `playtest-report/` como artifact                                           |
| `.github/workflows/security.yml`                                      | CodeQL, npm audit, OSV-Scanner, Gitleaks, Dependency Review, SBOM CycloneDX                                     |
| `.github/dependabot.yml`                                              | npm + github-actions, semanal                                                                                   |
| `tools/ci/check-bundle-size.mjs`                                      | orçamento gzipped: 250KB jogo / 400KB phaser / 700KB total                                                      |
| `src/core/types.ts`                                                   | ids, `Period`, `Affinity`, tabela de tradução domínio↔pt-BR                                                     |
| `src/core/state/state.ts`                                             | `GameState`, `createInitialState`, seletores, helpers imutáveis                                                 |
| `src/core/rng/rng.ts`                                                 | mulberry32 semeado + `seedFromString` — **10 testes**                                                           |
| `src/core/economy/economy.ts`                                         | grana, disposição, bilhete, relógio, sono, Manha/afinidades — **25 testes**                                     |
| `src/core/save/save.ts` + `codec.ts`                                  | slots, migrations versionadas, checksum FNV, export/import base64 UTF-8 — **17 testes**                         |
| `src/core/rules/conditions.ts`                                        | `Condition` union + `evaluate` + `describeUnmet` + `referencedIds`                                              |
| `src/core/rules/effects.ts`                                           | `Effect` union + `applyEffects` + `grantedIds`                                                                  |
| `src/core/dialogue/dialogue.ts`                                       | grafo de nós, escolhas, skill checks visíveis (d10 + afinidade), fallback com detecção de ciclo                 |
| `src/core/desenrolo/desenrolo.ts` + `battle.ts`                       | motor de batalha completo                                                                                       |
| `src/core/items/item.ts`, `src/core/world/world.ts`                   | tipos                                                                                                           |
| `src/core/session.ts`                                                 | `GameSession` — a fachada                                                                                       |

### ⚠️ Pendência imediata — uma edição foi deixada pela metade

`src/core/world/world.ts` **já tem** o tipo `PlaceTrigger` e o campo `PlaceDef.onEnter?: readonly PlaceTrigger[]`, mas **`session.ts` ainda não os usa**. Sem isso o jogo não tem cutscene de chegada e a abertura não roda.

A primeira coisa a fazer está na Fase A abaixo.

### Ainda não existe

`index.html`, `src/main.ts`, `src/content/**`, `src/engine/**`, `src/platform/**`, `src/observability/**`, `tools/art/**`, `tools/playtest/**`, `playwright.config.ts`, `README.md`, `CONTRIBUTING.md`, `PLAYTEST_LOG.md`, testes de `dialogue`/`desenrolo`/`session`/arquitetura.

> Os scripts npm `art:build`, `playtest` e `playtest:visual` já apontam para arquivos que ainda não existem. **O CI vai falhar até a Fase E terminar** — isso é esperado. Não "conserte" removendo os passos do CI.

---

## 5. Fases de execução

Faça **uma fase por PR**, na ordem. Cada fase tem critério de aceite objetivo.

---

### Fase A — Fechar o core (pequena, faça primeiro)

**A1. Implementar `PlaceDef.onEnter` e `GameSession.begin()`** — desbloqueia todo o resto.

Em `src/core/session.ts`:

- No método privado `reconcile(state)`, após a lógica de Desenrolo e antes do tratamento de exaustão: se `mode.kind === 'world'`, procurar o `PlaceDef` atual, percorrer `onEnter` em ordem e disparar o **primeiro** trigger elegível — condições satisfeitas **e** (se `once !== false`) o flag `entered:${placeId}:${dialogueId}` ainda não setado. Ao disparar: setar o flag e chamar `dialogue.startDialogue`.
- Cuidado com recursão: `startDialogue` pode aplicar efeitos que movem o jogador. Rode a checagem em loop com guarda (máx. ~8 iterações) e lance erro se estourar — cutscene em loop infinito é bug de conteúdo e deve falhar alto.
- Adicionar método público `begin(state: GameState): PerformResult` que roda `reconcile` uma vez. O jogo começa em `mode: 'world'` e nenhuma ação foi executada ainda, então sem `begin()` a cutscene de abertura nunca dispara. Phaser e bot **ambos** chamam `begin()` ao iniciar/carregar.

**A2. Testes que faltam no core** (o gate de coverage é 90% em `src/core/**`):

- `dialogue.test.ts` — avanço balão a balão; `next`; `end`; escolha bloqueada é ignorada mesmo se forçada por id; `fallback` quando condição falha; **ciclo de fallback lança erro**; `checkOdds` nos extremos (precisa ≤1 → 100%, precisa >10 → 0%); skill check consome e devolve `rngState`; `returnTo` restaura o modo anterior.
- `desenrolo.test.ts` — repetir tópico corta dano pela metade; argumento `rebutted` causa 0; `observe` revela tells em ordem e o último expõe a fraqueza; `braced` reduz o dano seguinte; vitória em Paciência ≤ 0; derrota por Disposição e por `turnLimit`; **derrota deixa Disposição ≥ 1**; item `oncePerBattle` não repete.
- `session.test.ts` — `availableActions` por modo; ação desabilitada não muda estado; `walk` cobra energia e move; `travel` exige estação + crédito e avança período; `placeAction` com `once` some depois; `reconcile` inicia batalha quando um efeito troca o modo; exaustão no mundo vira novo dia com energia parcial (nunca trava).
- `tests/architecture.test.ts` — lê os arquivos de `src/core/**` e falha se aparecer `from 'phaser'`, `document.`, `window.` ou `localStorage`. Redundante com o ESLint de propósito: é a rede que pega quando alguém desabilita a regra com um comentário.

**Aceite:** `npm run typecheck && npm run lint && npm run test:coverage` verde, com `src/core/**` ≥ 90%.

---

### Fase B — Conteúdo do Ato 1

Tudo em `src/content/`, como **dados puros** tipados pelos tipos de `core`. Nenhuma lógica.

Estrutura sugerida:

```
src/content/
  npcs.ts            # Record<NpcId, NpcDef>
  items.ts           # Record<ItemId, ItemDef>
  dialogues/act1.ts  # Record<DialogueId, Dialogue>
  desenrolos/act1.ts # Record<DesenroloId, DesenroloDef>
  world/act1.ts      # districts + places
  index.ts           # exporta o ContentBundle montado
```

#### Mapa do Ato 1

Três distritos. `station: true` marca o ponto de embarque; viagem entre distritos custa uma passagem + um período.

| Distrito | Places                                                                           |
| -------- | -------------------------------------------------------------------------------- |
| `tiete`  | `tiete_plataforma` (início) → `tiete_saguao` → `tiete_metro` _(station)_         |
| `centro` | `centro_republica` _(station)_ → `centro_anhangabau` → `centro_se` _(opcional)_  |
| `bixiga` | `bixiga_ladeira` _(station)_ → `bixiga_pensao_porta` → `bixiga_quarto` _(gated)_ |

Conexões: `tiete ↔ centro`, `centro ↔ bixiga`. **Bixiga fica travado** até o flag `knows_bixiga_route` (o jogador sabe o endereço, mas não sabe chegar — quem ensina é o Seu Jorge). Motivo de design: o mapa abrir conforme o jogador aprende a cidade **é** o tema do jogo virado mecânica.

#### Beats — escreva nesta ordem

**Beat 1 · Chegada** — `tiete_plataforma`, `onEnter: dlg_intro`

5h10 da manhã, o ônibus para com um chiado longo. 32 horas de estrada. A porta abre e entra um cheiro que o protagonista não conhece.

- Uma escolha leve de sabor pela cidade natal (Presidente Prudente / Bauru / Barretos) — muda flavor, não mecânica.
- Efeitos: `questStart q_find_val`, entrada de Caderninho (objetivo: _"Achar o Val. Ele disse que estaria aqui."_).
- Termina com o jogador no controle. **Não** explique controles em texto — a primeira tela tem uma saída só.

**Beat 2 · O golpe da mala** — `tiete_saguao`, `onEnter: dlg_ajudante` → **Desenrolo tutorial `d_ajudante`**

O beat que ensina Faro e o sistema de Desenrolo ao mesmo tempo.

- O Ajudante pega a mala _antes_ de você responder. Anda três passos à frente, para na saída, sorri: **"São cinquenta."**
- Escolhas:
  - _"Cinquenta reais?!"_ → entra no Desenrolo.
  - _"Tá bom."_ (paga R$ 50) → ele emenda: _"Boa. E mais dez de gorjeta."_ → **entra no Desenrolo mesmo assim.**
  - _[Faro 2] "Quanto custa essa ajuda?"_ → **fica visível e travado** (o jogador começa com Faro 1). Isto é intencional e importante: ensina, na primeira cena, que afinidade abre porta. Não esconda a opção — mostre cinza com o motivo.

  O escalonamento na opção "pagar" é justificado narrativamente — ceder convida mais — e garante que o tutorial de combate **sempre** dispara. Não remova essa garantia.

- Desenrolo `d_ajudante`: Paciência ~18, 2 tells, `turnLimit` 8. Vitória → paga R$ 5 ou nada. Derrota → paga R$ 50 e segue.
- **Ambos os desfechos** dão `affinity instinct +1`, `savvyXp`, e a mesma lição no Caderninho: _"Na rodoviária, ninguém ajuda de graça."_

**Beat 3 · Aprender a cidade** — `tiete_saguao` + `tiete_metro`

- `placeAction` "Ligar para o Val" (`once`) → `dlg_ligacao`: cai na caixa postal. A mensagem gravada do Val soa nervosa, não dramática. Isto planta o gancho do Ato 2 sem explicar nada.
- `tiete_metro`: `placeAction` "Comprar Bilhete Único" → gasta Grana, credita `transit`. **Necessário para viajar** — é assim que o sistema de transporte se ensina sozinho, sem tutorial escrito.

**Beat 4 · Centro** — `centro_republica` → `centro_anhangabau`

- `centro_anhangabau`: **Seu Jorge**, camelô veterano, vendendo carregador. `dlg_jorge_1`.
  - Caminhos: perguntar direto / comprar algo antes (custa Grana, +relação) / _[Lábia 2]_ puxar assunto.
  - Dá a rota → flag `knows_bixiga_route`, `relationship +1`, contato no Caderninho, e um **item `cafe`** (usável em Desenrolo: restaura Disposição).
- `centro_se`: opcional. Um pequeno golpe que **só o Faro percebe** — recompensa exploração com `savvyXp` e uma lição. Quem não perceber perde um trocado e ganha a mesma lição mais caro.

**Beat 5 · Bixiga: A Portaria** — `bixiga_pensao_porta`, `onEnter: dlg_cida_1` → **Desenrolo chefe `d_portaria`**

- **Dona Cida**, dona da pensão: dura, coração mole, e já cansada de gente do Val. Abre com _"Não tem vaga."_
- Ao dizer que é primo do Val, ela endurece: Val sumiu há duas semanas devendo duas.
- Desenrolo `d_portaria`: Paciência ~40, 3 tells, fraqueza em `gab`, `turnLimit` 12.
  - Argumentos com tópicos distintos (`familia`, `trabalho`, `dinheiro`, `honestidade`) — a mecânica de tópico repetido obriga a variar.
  - Um argumento é `rebutted`: prometer pagar tudo depois. Ela já ouviu essa.
- **Vitória:** quarto por uma semana pagando parte da dívida (R$ 120) → flags `has_room`, `q_find_val` step, desbloqueia `bixiga_quarto`.
- **Derrota:** dorme na ladeira (`sleep 'rough'`), perde um dia, e no dia seguinte ela cede em termos piores. **Nunca um beco sem saída.**

**Beat 6 · O bilhete do Val** — `bixiga_quarto` (gated por `has_room`), `onEnter: dlg_bilhete_val`

- No quarto, meio bilhete do Val — a outra metade sumiu. Menciona uma empresa na Paulista. Sem nome ainda.
- Efeitos: `questDone q_find_val`, `act 2`, lição no Caderninho, `endGame` com `endingId: 'act1_end'`.
- A tela final diz **"Fim do Ato 1"**, não "Fim de jogo". O estado terminal existe para o bot ter o que asseverar.
- `placeAction` "Dormir" com `sleep` fica disponível aqui.

#### Itens do Ato 1

`cafe` (restaura Disposição, uso em batalha), `salgado` (idem, mais barato), `bilhete_val` (key item), `celular` (key, `oncePerBattle` — ligar para alguém no meio de um Desenrolo).

**Aceite da Fase B:** `npm run typecheck` verde; o bundle de conteúdo monta; nenhum id órfão.

---

### Fase C — Validação de conteúdo (faça junto com a B)

`src/content/schema/` com zod + `src/content/content.test.ts`. Isto é o que impede o jogo de quebrar silenciosamente enquanto a história cresce.

Verificações obrigatórias:

1. **Schema** — todo `Dialogue`, `PlaceDef`, `DesenroloDef`, `ItemDef`, `NpcDef` casa com o zod schema.
2. **Integridade referencial** — todo `next`, `fallback`, `success`, `failure`, `exit.to`, `dialogueId`, `npcId`, `itemId`, `desenroloId` aponta para algo que existe.
3. **Alcançabilidade** — a partir de `dialogue.start`, todo nó é alcançável. Nó órfão = texto escrito que ninguém vai ler: falhe.
4. **Sem terminal morto** — todo nó ou tem `next`, ou `choices`, ou `end: true`.
5. **Orçamento de texto** — nenhum balão passa de ~90 caracteres; nenhum nó passa de 6 balões. (As regras da seção 2.)
6. **Sem ciclo de fallback.**
7. **Grafo do mundo conectado** — todo place alcançável a pé ou de transporte a partir de `tiete_plataforma`.
8. **Balanço de Desenrolo** — a soma do dano dos argumentos disponíveis, com os multiplicadores de tópico repetido aplicados, **precisa vencer a Paciência dentro do `turnLimit`**. Isto pega o boss impossível antes do jogador.

**Aceite:** todos os testes de conteúdo passam e falham de verdade quando você quebra um id de propósito (verifique isso).

---

### Fase D — Pipeline de arte

`tools/art/` gera `public/atlas.png` + `public/atlas.json` de forma determinística. `pngjs` já está instalado.

- Paletas de 16 cores estilo SNES, uma por período: `sampa-dawn`, `sampa-day`, `sampa-dusk`, `sampa-night`, `sampa-rain`. A mesma tile muda de humor com o relógio do jogo.
- Tiles como matrizes de caracteres → índice de paleta:

```ts
export const CALCADA_PORTUGUESA = {
  palette: 'sampa-day',
  pixels: `
    ..##..##..##..##
    .####.####.####.
    ..##..##..##..##
  `,
}
```

- Tiles de São Paulo: calçada portuguesa, asfalto molhado, grafite, poste, banca de jornal, mureta de viaduto, azulejo de pensão, fachada de cantina.
- Sprites: protagonista (4 direções, 2 frames de caminhada), Ajudante, Seu Jorge, Dona Cida, Yumi, Tico. Retratos 32×32 para diálogo.
- Determinismo é requisito: rodar duas vezes produz bytes idênticos (o CI reconstrói a arte a cada run). Escreva um teste para isso.
- `public/atlas.png` está no `.gitignore` de propósito — é gerado, não versionado.

**Aceite:** `npm run art:build` gera o atlas; rodar de novo produz arquivo idêntico.

---

### Fase E — Camada Phaser + o jogo rodando

`index.html`, `src/main.ts`, `src/engine/**`, `src/platform/**`.

Scenes: `BootScene` (carrega atlas), `TitleScene` (novo jogo / continuar / importar save), `WorldScene`, `DialogueScene`, `DesenroloScene`, `MenuScene` (Caderninho, status, saves).

Regras:

- **Nenhuma regra de jogo nas Scenes.** Toda Scene lê `session.availableActions(state)` e chama `session.perform(...)`. Se você sentir vontade de escrever `if (state.player.money >= ...)` numa Scene, a regra pertence ao `core`.
- Escala de pixel **inteira** (nearest-neighbour, sem blur) em 720p/1080p/ultrawide.
- Input por teclado **e** gamepad; navegação 100% por teclado é requisito de aceite.
- HUD sempre visível com os três recursos (Grana / Disposição / Bilhete) + dia e período.
- Texto: velocidade ajustável e opção de "mostrar tudo de uma vez".
- Overlay de debug em F3 alimentado pelo event bus da Fase G.
- `platform/`: adapter de `SaveStorage` sobre `localStorage` (com try/catch — modo privado do Safari lança), e um `Clock` para `Date.now()` (o `core` não chama data direto).
- Autosave a cada mudança de período + 3 slots manuais.

**Aceite:** `npm run dev` e jogar o Ato 1 do início ao fim com teclado só. Salvar, fechar a aba, reabrir, continuar do mesmo ponto.

---

### Fase F — Harness de playtest ⭐

**O coração do modo de trabalho pedido.** Três camadas, da mais rápida à mais cara.

#### Camada 1 — Bot headless: `tools/playtest/`, `npm run playtest`

Dirige `core/` direto, sem browser. Milhares de partidas em segundos. Aceita `--runs N` e `--seed S`.

Duas políticas de jogador:

- **scripted** — uma sequência de ids de ação que zera o Ato 1. É o teste de regressão principal: prova que o jogo é zerável.
- **monkey** — escolhas pseudo-aleatórias por seed. É o que acha os buracos.

Invariantes que o bot verifica:

| Invariante         | Falha se                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Zerável            | nenhuma partida scripted chega em `mode.kind === 'ended'`                                                          |
| Sem softlock       | algum estado alcançável não tem nenhuma ação habilitada                                                            |
| Economia sã        | dá pra chegar a Grana insuficiente sem nenhuma forma de ganhar mais                                                |
| Alcançabilidade    | algum nó de diálogo / quest / item / place nunca é atingido em N partidas                                          |
| Ritmo              | duração estimada do ato fora da faixa alvo                                                                         |
| Orçamento de texto | qualquer cena viola as regras de escrita                                                                           |
| Dificuldade        | um Desenrolo não é vencível com as afinidades esperadas naquele ponto — **ou** é vencível só martelando "Insistir" |

Toda falha imprime **a seed** e o caminho de ações. Reprodução exata com `npm run playtest -- --seed <S>`.

> A última linha da tabela importa mais do que parece: se "Insistir" sozinho vence, o sistema de Desenrolo inteiro virou um botão só. Trate como falha, não como aviso.

#### Camada 2 — Playthrough visual: `playwright.config.ts` + `tools/playtest/visual/`, `npm run playtest:visual`

Abre o jogo real, executa roteiros por ato, e **a cada beat narrativo** captura screenshot, FPS, tempo de carga e erros de console. Saída em `playtest-report/` com contact sheet + métricas.

Isto existe para o agente **olhar as imagens** e julgar o que só olho pega: o texto está legível no tamanho real? o contraste do balão funciona? dá pra saber pra onde ir? o HUD comunica os três recursos sem explicação? a tela de Desenrolo deixa claro o que cada ação faz?

#### Camada 3 — Checklist de UX automatizado

Contraste WCAG AA em todo texto de HUD · navegação 100% por teclado e por gamepad · save→reload→estado idêntico · resize e escala inteira em 720p/1080p/ultrawide · primeiro carregamento < 3s em 4G simulado · nenhum erro não tratado no console.

**Aceite:** `npm run playtest -- --runs 1000` verde; `npm run playtest:visual` gera o relatório; o CI inteiro fica verde pela primeira vez.

---

### Fase G — Observabilidade

`src/observability/`: event bus tipado com exporters plugáveis.

- `NoopExporter` (**padrão**), `ConsoleExporter` (dev), `OtlpHttpExporter` (pronto para Datadog/Grafana).
- **Desligado por padrão.** Liga por env var, e no browser exige **consentimento explícito** do jogador.
- Instrumentar: progresso por ato, funil de quests, escolhas nas bifurcações, resultado de cada Desenrolo, onde o jogador trava ou abandona, FPS/frame time, tempo de carga, erros JS.
- **Sem PII.** Só id de sessão anônimo.
- O mesmo bus alimenta o overlay F3 — a observabilidade serve o loop de playtest antes de existir produção.

---

### Fase H — O loop (contínuo, não termina)

A partir daqui o trabalho é o ciclo:

```
rodar as 3 camadas → ler relatório e screenshots → listar problemas
      ↑                                                    ↓
   repetir  ←──────  corrigir + adicionar teste de regressão
```

Cada rodada vira uma entrada em **`PLAYTEST_LOG.md`**: data, o que jogou, o que quebrou, o que consertou, o que ficou pendente. É o registro auditável de que o loop rodou — e é onde o dono acompanha o progresso sem precisar jogar.

**Toda correção de bug ganha um teste de regressão.** Sem exceção: é o que impede o loop de ficar consertando a mesma coisa.

---

### Fase I — Atos 2 a 5

**Só comece depois que o dono jogar o Ato 1 e aprovar o tom.** Escrever ~30k palavras antes disso é o maior risco do projeto.

Resumo para contexto (detalhe quando chegar a hora):

- **Ato 2 "Sobrevivência"** (Centro, Liberdade, Bixiga) — grana e documentos; a cidade exige comprovante pra tudo, inclusive pra conseguir o que gera o comprovante. Mentores: **Seu Jorge** (→Lábia), **Yumi** (→Faro), **Tico** (→Fôlego). Chefe: **A Fila da Repartição**. Lição: a cidade não funciona por regra, funciona por rede de gente.
- **Ato 3 "A Cidade Grande"** (Paulista, Pinheiros) — a **Horizonte Urbano**, que vende "cursos de sucesso". **Escolha central:** entrar no esquema (grana rápida, rede despenca) ou recusar e virar freela (grana lenta, rede intacta). Duas rotas que reconvergem no Ato 4. Antagonista **Renan**. Chefe: **A Entrevista**.
- **Ato 4 "Enchente"** (Zona Leste, Marginal) — a cidade para. Val é achado em Artur Alvim, endividado e com vergonha, com passagem comprada de volta. **Aqui a rede paga:** quem você ajudou aparece; quem entrou na Horizonte tem muito menos gente. Chefe: **A Água Subindo** (contra o tempo).
- **Ato 5 "Garoa"** (Centro/Minhocão) — confronto final com Renan é argumentação, não briga. **4 finais** = (entrou na Horizonte sim/não) × (Val fica/vai), com epílogo variando por afinidade dominante e amigos feitos. Cena final: Minhocão num domingo de manhã, garoa caindo.

---

## 6. Verificação

```bash
npm ci
npm run typecheck                  # tsc --noEmit
npm run lint                       # ESLint flat config + regras de camada
npm run format:check               # Prettier
npm run test:coverage              # Vitest; core >= 90%, global >= 70%
npm run art:build                  # gera public/atlas.png (determinístico)
npm run playtest -- --runs 1000    # bot headless; falha imprime a seed
npm run playtest:visual            # Playwright → playtest-report/
npm run build                      # artifact estático em dist/
npm run verify                     # tudo acima, exceto visual e build
```

Checagens manuais que nenhum teste substitui:

- `npm run dev` → jogar o Ato 1 inteiro **só com teclado**.
- Salvar, fechar a aba, reabrir, continuar do mesmo ponto.
- Abrir `playtest-report/index.html` e **olhar** os screenshots.
- Os três workflows verdes no primeiro PR.

---

## 7. Convenções

- **Conventional commits** (`feat:`, `fix:`, `chore:`, `test:`, `docs:`). Um PR por fase.
- Comentários explicam **por quê**, não o quê. O código já diz o quê. Veja os comentários de cabeçalho em `rng.ts`, `session.ts` e `desenrolo.ts` como referência do padrão esperado.
- Nada de `any`. Nada de `as` para escapar de um tipo — se o tipo está atrapalhando, o tipo está errado.
- Conteúdo é dado. Se você está escrevendo `if` dentro de `src/content/`, provavelmente falta uma variante de `Condition` ou `Effect` em `core/rules/`.
- Antes de criar um helper, procure em `core/state/state.ts` e `core/economy/economy.ts` — a maioria já existe (`withFlag`, `withItem`, `withJournalEntry`, `clamp`, `spendEnergy`, `advancePeriod`, `awardSavvy`…).

## 8. Armadilhas conhecidas

- `noUncheckedIndexedAccess` está **ligado**: `array[i]` é `T | undefined`. Use `!` só quando o índice for comprovadamente válido (veja `rng.ts`), nunca por preguiça.
- `verbatimModuleSyntax` está ligado: use `import type` para tipos. Imports relativos precisam da extensão `.js` (padrão ESM), mesmo em arquivos `.ts`.
- `GameState.battle` é `DesenroloBattle | null` e mora em `desenrolo/battle.ts` — módulo separado justamente para não criar import circular com `state.ts`. Não mova.
- `dialogue.getView()` só oferece escolhas no **último balão** do nó. Se as escolhas "sumiram", o nó tem mais linhas para avançar.
- `session.perform()` sempre roda `reconcile()` no fim. É lá que batalha inicia, cutscene dispara e exaustão vira novo dia — não replique essa lógica em outro lugar.
