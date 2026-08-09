# Playtest log

## 2026-08-09 — Rodada 1: core e rota scripted

- Jogou: Ato 1 completo pelo `GameSession`, seed 7.
- Encontrou: “Observar” continuava habilitado depois de revelar todos os tells; a política scripted repetia interações opcionais.
- Corrigiu: ação agora fica desabilitada com motivo visível; política segue o objetivo e varia tópicos.
- Regressão: teste de `GameSession` e execução do roteiro no Vitest.
- Resultado: Ato 1 concluído em 36 ações; 10 monkey runs sem softlock.

## 2026-08-09 — Rodada 2: Chromium 1280×720

- Jogou: título → chegada → golpe da mala → Desenrolo → metrô → save/reload.
- Encontrou: botão “Fechar” do Caderninho herdava o estilo branco do navegador.
- Corrigiu: botão passou a usar o mesmo sistema visual dos slots e ações.
- Regressão: Playwright verifica teclado, save/reload, console limpo, carga e screenshots.
- Resultado: playthrough visual verde; texto e HUD legíveis no tamanho real.

## 2026-08-09 — Rodada 3: Firefox 1280×720

- Jogou: o mesmo roteiro visual completo em Firefox.
- Encontrou: nenhum erro novo.
- Resultado: Chromium e Firefox verdes; quatro screenshots publicáveis gerados.
