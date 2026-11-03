# Pacote Windows Bonito

Um instalador só para quatro apps que deixam o Windows com a cara da ilha:

| App | O que é |
|---|---|
| [Ilha](https://github.com/FelipeWASD83/ilha) | A Dynamic Island do iPhone no topo da tela: música, timer, gravador, avisos e atalhos |
| [Relógio Mond](https://github.com/FelipeWASD83/relogio-mond) | Dia, data, hora, clima e a música tocando, no meio da área de trabalho |
| [Fundo Vivo](https://github.com/FelipeWASD83/fundo-vivo) | Papel de parede animado e leve (vídeo, imagem, página web e cenas) |
| [Cursores da Ilha](https://github.com/FelipeWASD83/ilha-cursors) | Ponteiros preto ou branco, com contorno e animações |

## Como usar

Abra o `PacoteWindowsBonito-Setup-<versão>.exe` e siga as telas:

1. **O que instalar:** clique nos cartões para ligar ou desligar cada app.
2. **Do seu jeito:** abrir com o Windows, ilha flutuando ou colada no topo, relógio em 24 h ou 12 h, clima e a
   cidade dele, esquema de cursor (preto, branco ou só deixar na lista de Ponteiros).
3. **Últimos detalhes:** atalhos no Menu Iniciar e na área de trabalho, abrir os apps ao terminar, idioma da ilha e do
   relógio. Se faltar alguma coisa no PC (.NET 10, Python, WebView2), o setup avisa e instala pelo winget.
4. **Instalar.** Enquanto instala (e depois, na tela de "Tudo pronto"), passa um vídeo curto de cada app escolhido,
   mudo; o botão no canto do vídeo liga o som.

Tudo é instalado só para o seu usuário, sem pedir administrador (só o instalador do .NET ou do Python, se precisar,
pode pedir). Os apps vão para `%LOCALAPPDATA%\Programs` e os cursores para `%USERPROFILE%\.ilha-cursors`.

Rodar o setup de novo atualiza o que já está instalado e começa das escolhas que já estavam no PC.

## Desinstalar

**Configurações > Aplicativos > Pacote Windows Bonito > Desinstalar.** Dá para escolher o que tirar. Os ponteiros
voltam a ser os de antes, e as configurações de cada app ficam guardadas caso você instale de novo.

## Precisa de

- Windows 10 ou 11, 64 bits.
- Para o relógio: Python 3.10 ou mais novo (o setup instala o 3.13 se não tiver).
- Para a ilha, o relógio e o Fundo Vivo: .NET 10 Desktop Runtime (o setup instala se não tiver).

**Smart App Control:** o setup não é assinado. Com o Smart App Control ligado, o Windows pode recusar abrir ele.

## Gerar o setup

```powershell
powershell -ExecutionPolicy Bypass -File ferramentas\build.ps1
```

Junta os quatro apps a partir das pastas vizinhas (`ilha`, `relogio-mond`, `fundo-vivo`, `ilha-cursors`), compila a
janela e gera `dist\PacoteWindowsBonito-Setup-<versão>.exe` com o `SHA256.txt`. Precisa do .NET SDK 10 e do Python
com Pillow. Detalhes em `CLAUDE.md`.

## Vídeos

Os vídeos de propaganda (TikTok e YouTube) e os que o setup toca são feitos em código, com Remotion, na pasta
[`video/`](video/CLAUDE.md).

## Licença

MIT. Cada app tem a licença dele; a fonte Quicksand é OFL (`src/Setup/Fonts/OFL.txt`).
