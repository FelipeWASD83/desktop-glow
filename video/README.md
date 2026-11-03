# Vídeo em motion graphics (modelo da skill video-motion)

Vídeo feito em código com **Remotion 4.0.534** (React), renderizado pelo Edge do
Windows e codificado pelo ffmpeg. Este arquivo vira a base do `CLAUDE.md` do
vídeo: trocar o exemplo pelo que o vídeo é de verdade.

## Como rodar

```powershell
npm install                                   # uma vez (node_modules fica fora do git)
npm run testar                                # planejador, keyframes e conferir.py
python -m venv .venv                          # uma vez, para a voz
.venv\Scripts\pip install edge-tts==7.3.1
npm run narrar                                # a narração (precisa de internet; só refaz o que mudou)
npm run sons                                  # os efeitos, os sons das transições e a trilha
npm run conferir                              # plano de transições e o que barra o render
npm run studio                                # o Remotion Studio, para ver e ajustar
python ferramentas/quadros.py 16x9            # folha de quadros com as guias (quadros/)
python ferramentas/quadros.py 16x9 2 --cena ideia   # uma cena só, de perto
python ferramentas/entregar.py 16x9 --previa  # prévia em meia resolução, para o ver-video
python ferramentas/entregar.py 9x16 --preset social --legenda
```

Presets do `entregar.py`: `social` (Reels, TikTok, Shorts, -14 LUFS), `youtube`
(-14 LUFS), `app` (-16 LUFS, `--teto <MB>`), `site` (720p mudo, MP4 + WebM +
capa WebP). `--sem-trilha` tira a música; `--legenda` força a legenda;
`--so-capa` só a capa. O `quadros.py` e o `entregar.py` rodam o `conferir.py`
antes e param se ele barrar.

## Regras que o código garante

- **Transição:** cada troca usa uma transição da família do estilo, nunca a
  mesma em duas trocas seguidas e no máximo 2 vezes no vídeo (corte seco não
  conta). Pedido no roteiro que quebra isso para o render com erro.
- **Sem fade:** opacidade animada solta numa cena é barrada pelo
  `conferir.py`; entrar e sair é com `<Entra>` e `<Palavras>`.
- **Sem monotonia:** nenhum tipo de entrada em mais da metade das entradas.

## Como está montado

- `src/roteiro.json`: título, **estilo**, BPM, formatos (`16x9`, `9x16`, `1x1`,
  `4x5`), segundo da capa, legenda, voz, trilha e as cenas. Cena com `fala` dura
  a fala mais as folgas; cena sem fala dura os `segundos`. `{marca}` antes de
  uma palavra da fala marca o momento em que ela é dita. `"transicao"` numa
  cena fixa a transição que a traz (opcional).
- `src/movimento/` (puro, sem React; testado no Node):
  `estilos.ts` (os dez estilos), `transicoes-dados.ts` (as doze transições),
  `planejar.ts` (escolhe sem repetir), `chaves.ts` (keyframes e atrasos).
- `src/estilo.ts`: o estilo do roteiro e as molas dele.
- `src/tema.ts`: a direção visual (cores, fontes), os formatos com a zona
  segura e as folgas.
- `src/linha.tsx`: a linha do tempo. Dentro de uma cena, `useCena()` dá
  `quando('marca')`, `batida(n)`, `entra`, `sai`, `dura`, `fala`, `palavras` e o
  `formato` (`vertical`, `seguro`). Fora, `em(cena, q)` e `marca(cena, nome)`.
- `src/Video.tsx`: fundo contínuo, cenas com a transição planejada, voz,
  efeitos, trilha que abaixa sob a voz, legenda; `Capa` e `SoCena`.
- `src/sons.ts`: os efeitos das cenas (o das transições entra sozinho).
- `src/cenas/`: uma cena por arquivo, ligadas ao id em `cenas/index.ts`. As
  seis de exemplo mostram cada recurso: `Gancho` (texto que sobe, poeira,
  brilho), `Ideia` (mola, letra por letra, traço, recorte), `Numeros`
  (contador, barras com atraso do centro), `Camadas` (câmera 2.5D, parallax,
  morfo), `Acabamento` (texto em degradê, separação de cor, luz, brasas,
  embaralha), `Fecho` (bolha líquida, texto que cai, foco).
- `src/componentes/`: `Transicoes`, `Entra`, `Palavras`, `Efeitos`, `Camera`,
  `Legenda`, `Apoio` (`Respira`, `Traco`, `Guias`), `Fundo`.
- `ferramentas/`: `narrar.py`, `sons.py`, `conferir.py` (+ `plano.mjs`),
  `quadros.py`, `entregar.py` e o `comum.py` que eles dividem.
- `testes/`: `movimento.test.mjs` (Node) e `test_conferir.py` (unittest).

Composições: `Video-<formato>`, `Capa-<formato>` e `Cena-<id>-<formato>` para
cada formato do roteiro.

## Fora do git

`node_modules/`, `.venv/`, `saida/`, `quadros/`, `public/narracao/` (voz gerada
por serviço da Microsoft) e `public/sons/` (regerados pelo `npm run sons`).

## Armadilhas

- O Chrome que o Remotion baixa é barrado pelo Smart App Control: o
  `remotion.config.ts` aponta para o Edge. Não tirar.
- Nada de CSS animation, `Math.random()` ou relógio: tudo sai de
  `useCurrentFrame()` (o `conferir.py` barra).
- Espaço no fim de `inline-block` some: palavras separadas pelo gap do flex.
- Composição de capa com 1 quadro sai vazia: ela tem a duração do vídeo.
- `Easing.out(Easing.exp)` para em 99,9 %: número termina errado (1.249).
- No vertical, quebrar linha à mão: o navegador deixa palavra órfã.
