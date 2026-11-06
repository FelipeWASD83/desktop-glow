# CLAUDE.md: desktop-glow

**Desktop Glow** (até a 1.2.2, "Pacote Windows Bonito"; nome escolhido por ele em 03/11/2026, domínio desktopglow.com):
instalador único da `ilha`, do `relogio-mond`, do `fundo-vivo`, do `ilha-cursors` e, desde a 1.5.0, do `gear-hub`
(pedido do Felipe em 02/11/2026: "exe de setup, muitas opções, bonitinho estilo ilha com fundo preto e bordas
arredondadas"; o Gear Hub entrou em 06/11/2026, "coloca ele no pacote"). **Repositório público**
(`FelipeWASD83/desktop-glow`, MIT, renomeado de `pacote-windows-bonito`; o GitHub redireciona o nome velho), escolha
dele ao criar. Código e comentários em inglês; README, changelog,
commits e este arquivo em português. Telas em pt e en, seguindo o Windows (`--lang pt|en` força). **Em inglês os apps têm nome em inglês** (pedido dele
em 03/11/2026): Island, Mond Clock, Living Wallpaper, Island Cursors, Gear Hub (em pt "Central de Periféricos"),
inclusive nos atalhos (`Names.ShortcutName`).

## Como é feito

- C# WPF .NET 10, **self-contained e single-file** (`src/Setup`): abre num PC sem .NET, porque é ele que instala o
  runtime que os apps precisam. Janela sem moldura, `AllowsTransparency`, cartão preto com cantos de 32 e a sombra numa
  camada separada (efeito no cartão tiraria o ClearType do texto).
- **A pílula do topo** (`Ui/Island.cs`) é a assinatura visual: preta com borda acesa, muda de tamanho por mola
  (`Ui/Spring.cs`, razão de amortecimento ~0,68) e troca o conteúdo com fade e crescimento. Cada tela tem a sua; na
  instalação ela abre com o ícone do app, o que está fazendo e um anel com a porcentagem.
- Fonte Quicksand (a do relógio e do Fundo Vivo 2.1) nos títulos, Segoe UI Variable no resto.
- **Os apps vão colados no fim do exe** (`Core/Payload.cs`): `[exe][zip][tamanho do zip, 8 bytes]["GLOWPAY1"]` (era `PWBPAY01` até a 1.2.2). Os
  bytes antes do zip são exatamente o exe que o `build.ps1` testou no Smart App Control, e é isso que vira o
  `Uninstall.exe` (`WriteExecutable`): o desinstalador tem o hash que já passou. Não mudar o formato do rabicho sem
  mudar o `build.ps1` junto.

## Contratos com os outros projetos (quebram calados se mudarem lá)

- **Pastas:** `%LOCALAPPDATA%\Programs\Ilha` (fixa: o `Inicio.cs` da ilha só grava o Run dessa pasta),
  `...\Programs\RelogioMond`, `...\Programs\FundoVivo`, `%USERPROFILE%\.ilha-cursors` (a do `install.py`),
  `...\Programs\GearHub` (fixa: o Gear Hub só grava o Run quando roda dessa pasta, `Paths.InstallDir` de lá),
  `...\Programs\DesktopGlow` (Uninstall.exe e `installed.json`; até a 1.2.2 `PacoteWindowsBonito`, ver "Nome antigo").
- **Run (HKCU):** `Ilha` = `"Ilha.exe"`, `RelogioMond` = `"pythonw" "iniciar.pyw"`, `FundoVivo` = `"FundoVivo.exe" --engine`,
  `GearHub` = `"GearHub.exe" --tray`. Os mesmos nomes que os apps usam, então não duplica com o que eles mesmos gravam.
- **Atalhos:** em pt `Ilha.lnk`, `Relógio Mond.lnk`, `Fundo Vivo.lnk`, `Central de Periféricos.lnk` (os nomes do
  `_organizacao\atalhos` e dos scripts deles); em en `Island.lnk`, `Mond Clock.lnk`, `Living Wallpaper.lnk`,
  `Gear Hub.lnk`. Instalar remove o do outro idioma (se for nosso) e desinstalar procura os dois. O do Gear Hub usa o
  `icone.ico` da pasta dele e abre sem argumento (a janela); o `--tray` fica só no Run.
- **Configs** (mescladas, o resto do JSON fica): ilha `~\.ilha\config.json` (`iniciarComWindows`, `colada`, `language`);
  relógio `dados\config.json` em camelCase (`iniciarComWindows`, `idioma`, `formato24h`, `clima`, `latitude`, `longitude`);
  Gear Hub `~\.gear-hub\settings.json` (`startWithWindows`, `language`: `auto`, `pt` ou `en`, o mesmo `AppLanguage` da
  ilha e do relógio). Ao abrir, o Gear Hub acerta o Run pelo `startWithWindows`.
- **Cursores:** `Core/Cursors.cs` é o `install.py` em C#: mesmo `backup.json` (`{nome: [dado, tipo]}`, feito uma vez,
  no primeiro install), mesmos nomes de esquema, `SPI_SETCURSORS` no fim. O `manifest.json` do build vai junto para a
  pasta, porque o desinstalador precisa dele.
- **`SPI_SETCURSORS` responde FALSE com erro 0 mesmo quando funciona** (Windows 11 26300, 02/11/2026: o primeiro teste
  dele deu "Falhou" e a seta em uso era a nossa pixel por pixel; o `install.py` do `ilha-cursors` faz a mesma chamada e
  também acusaria). Desde a 1.0.1 um FALSE é conferido com `Cursors.ArrowDifference` (a seta em uso contra o arquivo,
  no tamanho da que está em uso) e só falha acima de 3% de pixels diferentes. `--arrow-diff <arquivo.cur>` mede isso
  sem mexer em nada.
- **Fechar os apps:** ilha `Ilha.exe --sair` (a 4.0.2 também aceita `--quit`, mas uma ilha mais velha sendo atualizada
  só conhece `--sair`), Fundo Vivo `FundoVivo.exe --quit` (devolve o papel de parede do
  Windows), relógio `dotnet RelogioMond.dll --quit` (desde a 1.5.0; versão antiga não conhece e o `dotnet` que sobrar
  depois de 4 s é morto, achado pela linha de comando com `RelogioMond.dll`), Gear Hub `GearHub.exe --quit` (sinaliza a
  cópia aberta, instância única pelo mutex `GearHub.Instance`, e espera até 5 s; o que sobrar é morto).
- **O build pega cada app do pacote de release dele** (desde a 1.3.0): `publicar-versao.ps1 -SoGerar build\sources\<app>`,
  o mesmo zip que o atualizador de cada app baixa. Fica em cache até a versão mudar ou `-Rebuild <app>`. O zip do
  relógio e o dos cursores têm uma pasta-base (`relogio-mond/`, `ilha-cursors/`) que o `Expand-Package` tira; dos
  cursores só entra o `build/` (`black`, `white`, `manifest.json`). O relógio sai compilado do último commit pelo
  script dele (com o carimbo e o `--check-load`), então trabalho não commitado lá não entra. O Gear Hub também sai
  compilado do último commit (`GearHub-X.Y.Z.zip`, arquivos na raiz, .NET 10 framework-dependent, carimbo e `--ping` do
  `compilar.ps1` de lá); o build confere `GearHub.exe`, `GearHub.dll`, `icone.ico` e `versao.json`, e recusa se o
  `versao.json`, o csproj e o topo do changelog de lá discordarem. Commit novo lá sem subir a versão não refaz o cache:
  `-Rebuild gearhub`. **O `publicar-versao.ps1` do Gear Hub chama `tar`:** rodando o build pelo Bash do Git, o
  `/usr/bin/tar` dele vem antes do do Windows e falha ("Cannot connect to C:"); rodar pelo PowerShell.
- **Formato de release comum (03/11/2026):** relógio e cursores têm `versao.json` (`versao`, `repositorio`) e
  `ferramentas\publicar-versao.ps1` que gera `<nome>-<versão>.zip`, o modelo do `clave`. O `build.ps1` lê a versão
  do `versao.json` quando existe (`App-Version`) e recusa se discordar do csproj ou do changelog. A `ilha` tem
  desde a 4.0.2 (também aceita `--quit`, o zip dela continua `Ilha-X.Y.Z.zip`) e o `fundo-vivo` desde a 2.9.1
  (`build\release\fundo-vivo-X.Y.Z.zip` sem os `.pdb`, só `--quit`). Os quatro seguem o formato, e o `gear-hub` nasceu
  nele (06/11/2026).

## Decisões que não se desfazem sem motivo

- **Só remove o que é nosso:** Run e atalho saem só se apontam para dentro das nossas pastas; na desinstalação os
  ponteiros voltam ao backup só se o ponteiro em uso ainda é o nosso (se a pessoa trocou depois, fica o dela).
- **Desinstalar não apaga configuração** (`~\.ilha`, `dados\` do relógio, `%APPDATA%\FundoVivo`, `~\.gear-hub`). A `~\.ilha` tem mais
  que config; apagar por engano doeria.
- **Aplicar um fundo de exemplo pelo setup ficou de fora** (estava no plano): exigiria repetir a lógica de monitores do
  Fundo Vivo (`Monitors.cs`, id pelo caminho do DisplayConfig) e os exemplos que não reagem a som precisam virar vídeo
  pelo ffmpeg antes. No lugar, ao terminar o Fundo Vivo abre na biblioteca.
- **Pré-requisitos pelo winget** (`Core/Prerequisites.cs`): `Microsoft.DotNet.DesktopRuntime.10`, `Python.Python.3.13`,
  `Microsoft.EdgeWebView2Runtime`, com `--accept-package-agreements`. A tela avisa antes e dá para desligar.
  **Não testado de verdade** (o PC dele já tem os três).
- O relógio é aberto com `RELOGIO_PYTHONW` no ambiente: logo depois de instalar o Python, o PATH do processo do setup
  ainda é o velho, e o `InicioAutomatico.cs` do relógio procuraria o pythonw pelo PATH.
- **O build nunca recompila o Fundo Vivo sozinho** (só com `-Rebuild fundovivo`): o `compilar.ps1` de lá troca o
  `fundo-vivo\app` e fecha o Fundo Vivo rodando dali. Sem o zip da versão atual, usa o mais novo de
  `fundo-vivo\build\release` e avisa. A 1.0.0 saiu com o pacote 2.4.0 (gerado pela sessão que trabalhava lá).
- **Zip com barra normal:** no PowerShell 5.1 o `ZipFile.CreateFromDirectory` grava os nomes com `\`, e o setup não
  achava nada dentro de `ilha/` (instalava "pronto" sem arquivo nenhum). O `build.ps1` grava entrada por entrada com
  `/`, e o `Installer.Extract` aceita as duas.
- O setup não tem atalho próprio nem atualizador dentro: não é um app que fica no PC. Cada app atualiza sozinho pelo
  dele; para atualizar o pacote, roda-se o setup novo.
- Até a 1.2.2 o relógio ia como estava em `relogio-mond\app`, com uma trava de data contra a DLL velha. Saiu na 1.3.0:
  o pacote de release compila do commit.

## Nome antigo (1.3.0)

- `Core/Legacy.cs` traz uma instalação feita como Pacote Windows Bonito para os nomes novos: copia o `installed.json`
  de `Programs\PacoteWindowsBonito` para `Programs\DesktopGlow`, escreve o `Uninstall.exe` novo (os bytes do setup
  que está rodando), registra `Uninstall\DesktopGlow`, apaga `Uninstall\PacoteWindowsBonito`, troca as tarefas
  "Pacote Windows Bonito - <app>" por "Desktop Glow - <app>" (refeitas pelo Run em uso) e apaga a pasta velha. Roda antes
  de toda janela de instalação ou desinstalação, no `--install-silent` e sozinho com `--migrate`. As pastas dos apps, os
  Run e os atalhos em pt não mudaram de nome.
- O `test-sandbox.ps1` monta uma instalação antiga falsa (pasta, chave e tarefa "PWB-Sandbox Ilha") e confere que some.

## Abrir primeiro, com prioridade (1.2.0)

- Pedido dele em 03/11/2026 ("definir os programas como prioridade para que iniciem mais rápido"). O que atrasa os
  apps no logon é a fila do Run (o Windows solta os 16 programas dele aos poucos); a prioridade de CPU ajuda pouco
  sozinha. Por isso `Core/Priority.cs` cria, para cada app com "abrir junto com o Windows", uma tarefa
  "Desktop Glow - <app>" (até a 1.2.2 "Pacote Windows Bonito - <app>") no Agendador: gatilho no logon do próprio usuário, **prioridade 2** (acima do normal;
  o padrão de tarefa é 7, abaixo do normal), sem limite de tempo, sem parar na bateria. `schtasks /create /xml` com o
  XML em UTF-16, **sem administrador** (testado em 02/11/2026 num shell de integridade média).
- **A entrada do Run continua.** Os apps recusam segunda cópia (mutex `Ilha.Instancia`, `RelogioMond`,
  `FundoVivoEngine`, `GearHub.Instance`), então a cópia que a fila abre depois fecha sozinha, e o "iniciar com o Windows"
  de dentro de cada app segue funcionando. **Exceção em aberto (06/11/2026):** a segunda cópia do Gear Hub 1.0.0 manda a
  primeira mostrar a janela (`SignalShow` no `App.Main` de lá), mesmo com `--tray`. Com a tarefa de prioridade e o Run
  juntos, a janela dele deve abrir sozinha no logon (lido no código, não medido). A correção é no `gear-hub` (segunda
  cópia com `--tray` sai calada); depois dela, subir a versão de lá e refazer o setup. Descartado: `StartupDelayInMSec` (acelera os 16 programas, não os nossos) e IFEO (HKLM, pede
  administrador, e valeria para todo `dotnet.exe`).
- **No relógio a prioridade fica no `pythonw`**: o `dotnet` filho nasce normal, porque o Windows só passa a prioridade
  do pai quando ela é abaixo do normal. Ele ganha a saída antecipada, não a CPU.
- `--prioridade ligar|desligar` faz o mesmo a partir do que está no Run agora (no PC dele o relógio e o Fundo Vivo
  abrem das pastas dos projetos). Ligado no PC dele em 03/11/2026.
- No modo `DESKTOPGLOW_HOME` (era `PACOTE_HOME`) as tarefas se chamam "Desktop Glow Sandbox - <app>" e são tarefas de verdade: os dois testes apagam no
  fim, para nenhuma sobrar para o próximo logon.
- **O ganho no logon não foi medido** (exige sair e entrar no Windows).

## Vídeos na tela de progresso (1.1.0)

- Os 8 vídeos `setup-<app>-<en|pt>` do subprojeto `video/` (ler o `video/CLAUDE.md`) saem em versão leve em
  `video/saida/setup/<app>-<lingua>.mp4` (720p, ~1 MB) com o `.jpg`; o `build.ps1` põe em `videos/` no zip. Sem eles,
  o setup avisa no build e a tela de progresso fica só com a lista. **O Gear Hub não tem vídeo** (`gearhub-pt.mp4` e
  `gearhub-en.mp4` não existem): o build avisa por app que falta e o `ExtractVideos` só pula, então a tela toca os dos
  outros escolhidos (e, com só o Gear Hub escolhido, fica só a lista).
- Ao instalar, `Payload.ExtractVideos` tira os dos apps escolhidos, no idioma da tela, para
  `%TEMP%\DesktopGlow\videos`, e o `Ui/VideoPanel.cs` toca em sequência num `MediaElement` mudo (botão de som
  no canto). **A instalação leva 1 a 2 s no PC dele**, por isso o vídeo continua na tela de "Tudo pronto".
- O `MediaElement` do WPF usa o Windows Media Player do sistema: no Windows N ele falha e fica a capa parada. No
  `--screenshot` aparece a capa, porque vídeo tocando não sai no `RenderTargetBitmap`.

## Site (desktopglow.com)

O site mora no projeto **`desktop-glow-site`** (pasta irmã, repositório privado), desde 03/11/2026; antes ficava em
`site/` aqui. O que este projeto deve a ele: o exe da release se chama sempre `DesktopGlow-Setup.exe` (o botão de
baixar aponta para `releases/latest/download/DesktopGlow-Setup.exe`), **este repositório continua público** (release
de repositório privado não abre para quem visita) e os vídeos saem de `video/saida/` (o `ferramentas/midia.py` de
lá copia). Ao publicar versão nova do setup, atualizar o texto de versão e tamanho do site junto.
A página de privacidade do site lista com quem cada um dos cinco apps e o instalador conversam pela internet (o Gear Hub
entrou lá na 1.5.0: só a API do GitHub para atualização, o resto é local):
**app que passar a mandar algo novo pela rede (ou parar) obriga a atualizar `privacy.html` de lá.**

## Testar sem mexer no PC

- `DesktopGlow.exe --self-test <relatorio.txt>`: cursores contra um registro de mentira (inclusive um
  `backup.json` escrito pelo Python), mescla de JSON, rabicho do exe, Run e atalho "só o nosso", textos nos dois idiomas.
- `DESKTOPGLOW_HOME=<pasta>` muda todas as pastas para dentro dela e o registro para `HKCU\Software\DesktopGlow-Sandbox`;
  nesse modo nada é fechado, aberto, nem recarregado (cursor), e o winget não roda. Com `--install-silent <opcoes.json>`
  (o JSON é o `InstallOptions`) e `--uninstall-silent` dá para instalar e desinstalar inteiro numa pasta. **Rodar num
  terminal normal** (`run_in_terminal`), não pelo shell do app do Claude: o MSIX virtualiza o HKCU.
- `--screenshot <pasta> [--lang en]`: cada tela num PNG (2x), com a janela fora de todos os monitores.
- `ferramentas\test-sandbox.ps1`: instala, reinstala e desinstala (pelo `Uninstall.exe` copiado) numa pasta, e confere
  53 coisas (arquivos, Run, ponteiros, atalhos nos dois idiomas, configs mescladas, hash do desinstalador, migração do
  nome antigo, os do Gear Hub). Fica em ASCII (o atalho com acento é achado por `Central de Perif*ricos.lnk`): o
  PowerShell 5.1 lê sem BOM como ANSI. Relatório em
  `build\sandbox-report.txt`.
- `ferramentas\test-ui.ps1`: a janela de verdade fora da tela, clicada por UI Automation (desliga o cartão do Fundo
  Vivo, escolhe o cursor branco, instala, fecha; depois a janela do desinstalador). Os cartões e os quadros têm
  `AutomationProperties.Name` (o WPF mostra o ToggleButton como Button sem nome); manter.
- Os dois scripts rodam **num terminal normal**.
- **Instalar de verdade no PC dele só com o OK dele:** troca os ponteiros, regrava os Run do relógio e do Fundo Vivo
  para as cópias instaladas (hoje apontam para as pastas dos projetos) e fecha a ilha, o relógio, o Fundo Vivo e o Gear
  Hub abertos.

## Comandos

- Gerar o setup: `powershell -ExecutionPolicy Bypass -File ferramentas\build.ps1` (`-Rebuild ilha,relogio,cursors,fundovivo,gearhub`)
  → `dist\DesktopGlow-Setup.exe` (nome fixo, é o que o site baixa da release mais nova) e `dist\SHA256.txt`. `build\` e `dist\` ficam fora do git.
- **Logos (04/11/2026, pedido dele: "melhorar as logos, principalmente a do relógio"; desenho novo, não mais detalhe):**
  a família do Desktop Glow mora em `_organizacao\atalhos\desenhar_icones.py` (`glow_tile`, `island`, `mond_clock`,
  `living_wallpaper`, `island_cursors`, `desktop_glow`) e o `gerar_icones.py` (pelo Edge, num terminal normal) escreve o
  `.ico` e o PNG de 512 em `icone/` de cada projeto, inclusive aqui e no `ilha-cursors`. Daqui eles são copiados à mão
  para `src\Setup\Assets\<app>.png`, `video\public\icones\` e o `img\` do `desktop-glow-site`. O relógio é a lua
  crescente com os ponteiros (Mond é lua em alemão), sem o visualizador. O ícone do Gear Hub (laranja com três sliders)
  não é dessa família: `src\Setup\Assets\gearhub.png` é cópia do `gear-hub\icone\icone.png`.
- **Com cinco apps** os cartões de "O que instalar" e do desinstalador ficam num `ScrollViewer` com a borda esmaecida
  (`CardScroller`), duas colunas e o quinto embaixo; `--screenshot` grava também `pick-end`.
- `python ferramentas\make_icon.py` só recorta as duas setas do `ilha-cursors` para a escolha de esquema
  (`arrow-black.png`, `arrow-white.png`); o ícone do setup e o cartão dos cursores vêm das logos acima.
- **PNGs para o After Effects dele:** `python ferramentas\pngs.py [logos ilha fundo cursores setup]`, num terminal
  normal, grava `pngs\` (fora do git): as cinco logos em 1024, cada estado da ilha em 4x e o relógio (fundo
  transparente, recortados; saem do `video\src\recortes.tsx`), os dez fundos do Fundo Vivo em 3840 x 2160 e a
  biblioteca, os ponteiros no maior tamanho com as sequências dos animados (cada quadro uma vez: os que se transformam
  seguram o último quadro por 24 h no `.ani`) e as telas do setup. A parte da ilha troca o `src\roteiro.json`: nunca
  junto com o `todos.py`.
- Compilar só a janela: `dotnet build src\Setup -c Release`.
- Versão: `<Version>` no `src\Setup\Setup.csproj` e o topo do `CHANGELOG.md`, juntos.
