# Contribuindo com GAROA

## Preparação

Use Node 22 ou 24, rode `npm ci` e confirme `npm run verify` antes de alterar o projeto.

## Regras arquiteturais

- `src/core/` é TypeScript puro: não importa Phaser e não acessa DOM, storage ou relógio.
- Conteúdo é dado. Novas condições e efeitos entram nos unions do core, nunca como closures.
- Estado é imutável; dinheiro usa centavos inteiros; acaso passa pelo RNG semeado.
- Scenes e UI só apresentam `GameSession.availableActions()` e chamam `perform()`.
- Conteúdo em pt-BR; código, identificadores e comentários em inglês.

## Fluxo

1. Escreva ou ajuste o teste que demonstra o comportamento.
2. Implemente a menor mudança que o satisfaz.
3. Rode `npm run verify` e, para UI, `npm run playtest:visual`.
4. Inspecione `playtest-report/index.html` e registre a rodada em `PLAYTEST_LOG.md`.
5. Use Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

Toda correção de bug precisa de teste de regressão. Não versione `public/atlas.png`: ele é reconstruído deterministicamente.

## Conteúdo

Balões têm no máximo 90 caracteres e nós no máximo seis linhas. Toda escolha deve produzir consequência visível. Evite caricatura, glamourização de pobreza e paredes de lore.
