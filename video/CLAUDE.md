# CLAUDE.md: desktop-glow/video

Os vídeos de propaganda do pacote (pedido do Felipe em 02/11/2026), em Remotion 4.0.534 a partir do modelo da skill
`video-motion`. São 15, em 30 fps, **narrados** (edge-tts: Ava em inglês, Thalita em português) e **sem trilha de fundo**
(regra dele desde 03/11/2026, vale para todo vídeo: só os efeitos pontuais do `ferramentas/sons.py`):

| Roteiro | Formato | Língua | Para |
|---|---|---|---|
| `tiktok-todos` | 9:16 | en | TikTok, os quatro apps |
| `tiktok-ilha`, `tiktok-relogio`, `tiktok-fundovivo`, `tiktok-cursores` | 9:16 | en | TikTok, um app detalhado |
| `youtube-todos`, `youtube-todos-pt` | 16:9 | en, pt | YouTube e o topo do site (desktopglow.com), os quatro apps |
| `setup-<app>-en`, `setup-<app>-pt` | 16:9 | en e pt | YouTube e a tela de progresso do setup |

Código e comentários em inglês; este arquivo, os textos em pt e os commits em português. O que aparece na tela fica em
`src/textos.ts` (pt e en lado a lado).

## Como é montado

- **Os roteiros saem do `ferramentas/roteiros.py`** (desde 03/11/2026): uma tabela com as cenas de cada vídeo, o tempo
  mínimo e a fala de cada cena em inglês e em português. Mudou fala ou ordem: editar lá e rodar de novo; os JSON de
  `roteiros/` são a saída dele. Cena narrada dura a fala mais as folgas (nunca menos que o `segundos`).
- **Narração por roteiro:** o `narrar.py` grava em `public/narracao/<roteiro>/` (fora do git) e o tempo de cada palavra
  vai para `roteiros/narracao/<roteiro>.json` (no git), porque os roteiros dividem os ids de cena nas duas línguas.
  `todos.py --so-narrar` só gera as vozes. Precisa do `.venv` com `edge-tts==7.3.1` e de internet.
- **Um roteiro por vídeo em `roteiros/`.** O modelo lê um só (`src/roteiro.json`); o `ferramentas/todos.py` copia
  cada roteiro para lá, traz a narração dele e renderiza com `--sem-trilha`. No fim volta o `youtube-todos`, que é o que o
  Studio abre. Os campos novos do roteiro são `app` (`todos`, `ilha`, `relogio`, `fundovivo`, `cursores`, que dá a cor
  de destaque e as luzes do fundo) e `lingua`.
- **As cenas são compartilhadas** (`src/cenas/index.tsx`): a mesma cena serve aos dois formatos e às duas línguas, e
  os roteiros só escolhem e ordenam. `Layout.tsx` põe o texto à esquerda e o visual à direita no deitado, e o texto em
  cima e o visual embaixo no em pé.
- **Estilo `produto`** (zoom, empurra, cortina, divide, íris), direção da família da ilha: preto de verdade, pílulas,
  Quicksand, cada app na cor do próprio ícone (`tema.ts`). Assinatura: a pílula da ilha mudando de forma com mola.
- **3D por CSS** (`perspective`): monitor ultrawide com pé (`app/Monitor.tsx`), painéis de tela inclinados
  (`app/Tela.tsx`), carrossel do Fundo Vivo, ícones girando no fecho.

## De onde vem cada imagem

- **Fundo Vivo e cursores: imagem real**, gerada pelos próprios apps fora da tela por `ferramentas/capturas.py`:
  4 s de cada exemplo `.vivo` quadro a quadro (`FundoVivo.exe --vivo-still`, ~1,5 s por quadro, ~12 min; falha de vez
  em quando, por isso 3 tentativas), a janela da biblioteca (`--screenshot library`, com `FUNDOVIVO_HOME` de teste e
  sem a biblioteca do Wallpaper Engine) e os quadros dos `.ani` do `ilha-cursors` amostrados a 30 fps. Tudo em
  `public/gerado/` (fora do git).
- **Ilha: redesenhada** (`app/Ilha.tsx`) a partir do código dela (tamanhos 128 x 32, 36 de altura, raio 38 do cartão,
  coral `#d97857`). Ela desenha no DWM e não tem modo de foto fora da tela. Se ele gravar a ilha de verdade, dá para
  trocar por vídeo.
- **Relógio: redesenhado** (`app/Relogio.tsx`) na medida do `--captura` dele: o `--captura` sempre põe um degradê de
  fundo fixo no código, então não dava para pôr por cima do papel de parede. Redesenhado, a hora anda e as barras mexem.
- **A Anurati é só para uso pessoal, e os vídeos são públicos:** desde 03/11/2026 o dia do relógio sai na Quicksand
  Light com mais espaçamento (o mesmo substituto que o próprio relógio usa sem ela). O `capturas.py` não copia mais a
  fonte.
- **Nomes em inglês nos vídeos em inglês** (pedido dele em 03/11/2026): Island, Mond Clock, Living Wallpaper, Island
  Cursors, e o pack é Desktop Glow (`src/textos.ts`). O fecho aponta para desktopglow.com.
- **Ilha 4.0 nas cenas novas:** `ilha-placar` (placar ao vivo de uma partida inventada, sem marca de jogo),
  `ilha-downloads` (download da Steam), `ilha-clima` (aviso de chuva) e as bolinhas ao lado do menu (`ilha-menu`, em
  escala menor para caber no painel). Desenhadas de memória do que a ilha faz, não medidas contra ela.
- **Relógio 1.5:** barras finas brancas com o pontinho de pico (`BarrasMond`), em função pura do quadro.
- **Fundo Vivo 2.9:** os dez exemplos (`aurora-curtain`, `dusk-layers`, `fireflies`, `night-tide`, `northern-lights`,
  `pulse`, `rainy-night`, `snowfall`, `sound-cube`, `sparks`), todos capturados com o espectro de mentira do
  `--vivo-still ... 0 som`. O carrossel mostra os dez numa volta inteira.
- A biblioteca do Fundo Vivo só existe em português: só entra no `setup-fundovivo-pt`.

## Comandos

```powershell
npm install                                   # uma vez
python ferramentas/capturas.py                # as imagens reais (o que faltar; --refazer para tudo)
python ferramentas/roteiros.py                # reescreve os roteiros a partir da tabela de falas
python ferramentas/todos.py --so-narrar       # só as vozes
python ferramentas/todos.py                   # os 15 vídeos (ou só alguns: todos.py setup-ilha-en tiktok-ilha)
python ferramentas/todos.py --folhas          # só as folhas de quadros, quadros/folha-<roteiro>.jpg
npm run studio -- --port 3470                 # o Studio (entrada desktop-glow-video do launch.json)
```

Saída em `saida/` (fora do git): `<roteiro>-<formato>-<social|youtube>.mp4` e a capa. A cópia leve que o setup toca
vai para `saida/setup/<app>-<lingua>.mp4` (720p, CRF 22, ~1 MB) com o `.jpg`; o `ferramentas\build.ps1` do pacote pega
de lá.

## Armadilhas

- **O Edge que o Remotion usa não abre pelo shell do app do Claude** (03/11/2026: sai na hora, sem erro, e o render
  falha com "Failed to launch the browser process"). Rodar `todos.py` num terminal normal (`run_in_terminal`).

- O `Contador` do modelo formatava sempre em pt-BR ("1,4" no vídeo em inglês): agora segue a `lingua` do roteiro.
- Em pé, a caixa do visual começa em y = 640: mais embaixo sobrava um buraco entre o texto e o visual.
- O carrossel do Fundo Vivo fica empurrado para trás pelo próprio raio: sem isso o cartão da frente sai do quadro.
- O resto das armadilhas do modelo (Edge no lugar do Chrome por causa do Smart App Control, nada de `Math.random`,
  fade barrado nas cenas) está no `README.md`.
