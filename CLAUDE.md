# GAROA — instruções para agentes

## Rastreamento

Este projeto usa Beads pelo rig Gas Town `super_mmorpg`. Execute `bd prime` para
carregar o fluxo e use `bd` para trabalho persistente. O HQ fica em
`/Users/viniciusnordiesperanca/gt`; este repositório não é o HQ.

O usuário autorizou commits e pushes incrementais ao concluir cada etapa.

## Comandos de qualidade

```bash
npm run verify
CI=1 npm run playtest:visual
npm run build
```

## Arquitetura

- `src/core`: regras puras e estado serializável.
- `src/content`: São Paulo, narrativa, arquétipos e moradias como dados.
- `src/engine`: Phaser, áudio e apresentação, sem regras de domínio.
- `tools/playtest`: campanha headless, monkey runs e Playwright.

`GameSession.availableActions/perform` é a única API de regras usada pela interface
e pelos bots. Preserve saves com migração ao alterar o schema.

## Convenções

- Código e identificadores em inglês; texto do jogo em pt-BR.
- Dinheiro sempre em centavos inteiros.
- Todo acaso usa RNG semeado.
- Desenrolo enfrenta uma situação, nunca uma pessoa.
- Não invente fatos sobre instituições reais; documente fontes em `docs/RESEARCH.md`.
