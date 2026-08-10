# Arte e licenças

## FisherG — 12×12 City Tiles — Top Down

- Origem: https://opengameart.org/content/12x12-city-tiles-top-down
- Autor: FisherG
- Licença: CC0; modificação e uso comercial permitidos.
- Arquivos preservados em `public/assets/fisherg-city/`, junto ao README/licença
  distribuído pelo autor.

O pack fornece a base urbana modular: ruas, faixas, calçadas, prédios, árvores,
postes, lixeiras, cercas, veículos e personagens de referência. GAROA sobrepõe
garoa, paleta fria, sinalização, NPCs e objetos paulistanos autorais.

O pack de dungeon da CraftPix foi usado apenas como referência de densidade e
composição. Nenhum pixel desse pack foi incluído no repositório.

## Personagens GAROA v2 e NPCs v3

A folha em `public/assets/garoa-characters-v2/characters-sheet.png` foi gerada
especificamente para o projeto com a ferramenta de geração de imagens da OpenAI e
pós-processada para transparência e grade regular. A direção visual estudou a
legibilidade e a organização de folhas de sprites top-down da CraftPix, sem copiar
personagens ou arquivos do catálogo.

Os seis desenhos representam Jaci, Seu Jorge, Dona Cida, Yumi, Tico e Renan em
quatro direções e três quadros por direção.

A folha v3 em `public/assets/garoa-characters-v3/characters-sheet.png` substitui
os NPCs genéricos por seis silhuetas urbanas mais legíveis: trabalhador da
construção, profissional de escritório, artista, entregador de bicicleta,
estudante e trabalhadora da saúde. Ela também foi gerada especificamente para o
GAROA, removida de fundo cromático e normalizada para a grade 12×6 de 128×170 px.

## Kenney — RPG Urban Pack

- Origem: https://kenney.nl/assets/rpg-urban-pack
- Autor: Kenney
- Licença: Creative Commons Zero (CC0 1.0).
- Arquivos usados: uma região sem material promocional de `Sample.png` e a folha
  `Tilemap/tilemap.png`, preservados com a licença original em
  `public/assets/kenney-rpg-urban/`.

O pacote passa a fornecer uma única grade visual de 16×16 para cidade, player,
NPCs, veículos e mobiliário. Os oito mapas de distrito são montados de forma
determinística diretamente dessa grade, em escala inteira de 2×, sem recortar ou
distorcer o cenário de demonstração. Pedestres decorativos e personagens
interativos compartilham proporção, contorno e paleta; somente os interativos
recebem rótulo, colisão e diálogo.

## Vertical slice do Centro

`public/assets/garoa-city/centro-anhangabau.png` foi gerado especificamente para
o projeto com a ferramenta de geração de imagens da OpenAI. O asset usa o pack
Kenney apenas como referência de escala e linguagem pixel-art; não reproduz o
mapa de demonstração. A composição foi dirigida por referências institucionais
do Centro, com Viaduto do Chá, calçadão, fachadas históricas, banca, bicicletário,
drenagem, postes e pavimento molhado. Personagens, chuva e HUD continuam sendo
renderizados em tempo real.
