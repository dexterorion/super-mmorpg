# GAROA

Um RPG 2D sobre chegar a São Paulo às 5h da manhã com R$ 340, o endereço de um primo desaparecido e nenhuma certeza de como a cidade funciona.

![Tela de chegada de GAROA](docs/screenshots/arrival.png)

## Estado do jogo

O Ato 1 é uma fatia vertical jogável do começo ao fim no navegador. Ele inclui exploração entre Tietê, Centro e Bixiga, diálogos ramificados, transporte público, saves, Caderninho e dois **Desenrolos** — conflitos por argumentação em que o adversário é uma situação, nunca uma pessoa.

O conteúdo está em pt-BR. Código, identificadores e documentação técnica usam inglês.

## Jogar localmente

Requisitos: Node.js 22 ou 24 e npm.

```bash
npm ci
npm run art:build
npm run dev
```

Abra `http://localhost:5173`. Use setas ou WASD para navegar, Enter/Espaço para escolher, Esc para abrir o Caderninho e F3 para o overlay de debug. Mouse e gamepad também são aceitos.

## Screenshots

| Título | Desenrolo |
| --- | --- |
| ![Título](docs/screenshots/title.png) | ![Desenrolo](docs/screenshots/desenrolo.png) |

| Chegada | Caderninho e saves |
| --- | --- |
| ![Chegada](docs/screenshots/arrival.png) | ![Caderninho](docs/screenshots/caderninho.png) |

## Arquitetura

O jogo tem uma única API de regras: `GameSession`. Phaser e o bot headless consultam `availableActions(state)` e executam `perform(state, action)`. Assim, um caminho que o bot testa é o mesmo caminho usado pelo jogador.

```text
core (TypeScript puro) ← content (dados)
        ↑
engine + platform + observability
        ↑
Phaser / Playwright / bot headless
```

- `src/core/`: estado imutável, economia, diálogos, Desenrolo, RNG e saves.
- `src/content/`: mundo e história como dados validados por Zod.
- `src/engine/`: apresentação Phaser, sem regras de jogo.
- `tools/art/`: atlas pixel-art determinístico gerado por código.
- `tools/playtest/`: bot headless e playthrough visual.
- `docs/screenshots/`: capturas reais produzidas pelo playthrough.

## Qualidade

```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:coverage
npm run art:build
npm run playtest -- --runs 1000
npm run playtest:visual
npm run build
```

`npm run verify` executa as verificações rápidas sem o Playwright. Os workflows CI, E2E e Security repetem a validação em GitHub Actions.

O histórico de rodadas e correções está em [PLAYTEST_LOG.md](PLAYTEST_LOG.md). Para contribuir, consulte [CONTRIBUTING.md](CONTRIBUTING.md).

## Princípios do jogo

- Perder um Desenrolo muda o caminho; nunca gera “game over”.
- Dinheiro é inteiro em centavos e todo acaso usa RNG semeado.
- Aprender a cidade aumenta **Manha**; não existe XP por derrotar pessoas.
- Texto curto: até 90 caracteres por balão e seis balões antes de devolver controle.
- Telemetria é desligada por padrão e não coleta PII.

GAROA é um projeto autoral, atualmente sem licença para redistribuição.
