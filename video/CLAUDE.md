# CLAUDE.md: pacote-windows-bonito/video

Os vídeos de propaganda do pacote (pedido do Felipe em 02/11/2026), em Remotion 4.0.534 a partir do modelo da skill
`video-motion`. São 14, em 30 fps, sem narração, com trilha e efeitos sintetizados (`ferramentas/sons.py`):

| Roteiro | Formato | Língua | Para |
|---|---|---|---|
| `tiktok-todos` | 9:16 | en | TikTok, os quatro apps |
| `tiktok-ilha`, `tiktok-relogio`, `tiktok-fundovivo`, `tiktok-cursores` | 9:16 | en | TikTok, um app detalhado |
| `youtube-todos` | 16:9 | en | YouTube, os quatro apps |
| `setup-<app>-en`, `setup-<app>-pt` | 16:9 | en e pt | YouTube e a tela de progresso do setup |

Código e comentários em inglês; este arquivo, os textos em pt e os commits em português. O que aparece na tela fica em
`src/textos.ts` (pt e en lado a lado).

## Como é montado

- **Um roteiro por vídeo em `roteiros/`.** O modelo lê um só (`src/roteiro.json`); o `ferramentas/todos.py` copia
  cada roteiro para lá, gera a trilha do tamanho certo e renderiza. No fim volta o `youtube-todos`, que é o que o
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
- **A Anurati é só para uso pessoal.** Não vai para o git: o `capturas.py` copia de `relogio-mond/fontes` para
  `public/gerado/fontes`, que é ignorado. Os vídeos mostram o dia do relógio nela, como o app mostra. **Usar num vídeo
  público é decisão dele**; sem ela, o `tema.ts` cai na Quicksand.
- A biblioteca do Fundo Vivo só existe em português: só entra no `setup-fundovivo-pt`.

## Comandos

```powershell
npm install                                   # uma vez
python ferramentas/capturas.py                # as imagens reais (o que faltar; --refazer para tudo)
python ferramentas/todos.py                   # os 14 vídeos (ou só alguns: todos.py setup-ilha-en tiktok-ilha)
python ferramentas/todos.py --folhas          # só as folhas de quadros, quadros/folha-<roteiro>.jpg
npm run studio -- --port 3470                 # o Studio (entrada pacote-windows-bonito-video do launch.json)
```

Saída em `saida/` (fora do git): `<roteiro>-<formato>-<social|youtube>.mp4` e a capa. A cópia leve que o setup toca
vai para `saida/setup/<app>-<lingua>.mp4` (720p, CRF 22, ~1 MB) com o `.jpg`; o `ferramentas\build.ps1` do pacote pega
de lá.

## Armadilhas

- O `Contador` do modelo formatava sempre em pt-BR ("1,4" no vídeo em inglês): agora segue a `lingua` do roteiro.
- Em pé, a caixa do visual começa em y = 640: mais embaixo sobrava um buraco entre o texto e o visual.
- O carrossel do Fundo Vivo fica empurrado para trás pelo próprio raio: sem isso o cartão da frente sai do quadro.
- O resto das armadilhas do modelo (Edge no lugar do Chrome por causa do Smart App Control, nada de `Math.random`,
  fade barrado nas cenas) está no `README.md`.
