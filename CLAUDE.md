# CLAUDE.md: desktop-glow

**Desktop Glow** (até a 1.2.2, "Pacote Windows Bonito"; nome escolhido por ele em 03/11/2026, domínio desktopglow.com):
instalador único da `ilha`, do `relogio-mond`, do `fundo-vivo` e do `ilha-cursors` (pedido do Felipe em 02/11/2026:
"exe de setup, muitas opções, bonitinho estilo ilha com fundo preto e bordas arredondadas"). **Repositório público**
(`FelipeWASD83/desktop-glow`, MIT, renomeado de `pacote-windows-bonito`; o GitHub redireciona o nome velho), escolha
dele ao criar. Código e comentários em inglês; README, changelog,
commits e este arquivo em português. Telas em pt e en, seguindo o Windows (`--lang pt|en` força). **Em inglês os apps têm nome em inglês** (pedido dele
em 03/11/2026): Island, Mond Clock, Living Wallpaper, Island Cursors, inclusive nos atalhos (`Names.ShortcutName`).

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
  `...\Programs\DesktopGlow` (Uninstall.exe e `installed.json`; até a 1.2.2 `PacoteWindowsBonito`, ver "Nome antigo").
- **Run (HKCU):** `Ilha` = `"Ilha.exe"`, `RelogioMond` = `"pythonw" "iniciar.pyw"`, `FundoVivo` = `"FundoVivo.exe" --engine`.
  Os mesmos nomes que os apps usam, então não duplica com o que eles mesmos gravam.
- **Atalhos:** em pt `Ilha.lnk`, `Relógio Mond.lnk`, `Fundo Vivo.lnk` (os nomes do `_organizacao\atalhos` e dos scripts
  deles); em en `Island.lnk`, `Mond Clock.lnk`, `Living Wallpaper.lnk`. Instalar remove o do outro idioma (se for nosso)
  e desinstalar procura os dois.
- **Configs** (mescladas, o resto do JSON fica): ilha `~\.ilha\config.json` (`iniciarComWindows`, `colada`, `language`);
  relógio `dados\config.json` em camelCase (`iniciarComWindows`, `idioma`, `formato24h`, `clima`, `latitude`, `longitude`).
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
  depois de 4 s é morto, achado pela linha de comando com `RelogioMond.dll`).
- **O build pega cada app do pacote de release dele** (desde a 1.3.0): `publicar-versao.ps1 -SoGerar build\sources\<app>`,
  o mesmo zip que o atualizador de cada app baixa. Fica em cache até a versão mudar ou `-Rebuild <app>`. O zip do
  relógio e o dos cursores têm uma pasta-base (`relogio-mond/`, `ilha-cursors/`) que o `Expand-Package` tira; dos
  cursores só entra o `build/` (`black`, `white`, `manifest.json`). O relógio sai compilado do último commit pelo
  script dele (com o carimbo e o `--check-load`), então trabalho não commitado lá não entra.
- **Formato de release comum (03/11/2026):** relógio e cursores têm `versao.json` (`versao`, `repositorio`) e
  `ferramentas\publicar-versao.ps1` que gera `<nome>-<versão>.zip`, o modelo do `clave`. O `build.ps1` lê a versão
  do `versao.json` quando existe (`App-Version`) e recusa se discordar do csproj ou do changelog. A `ilha` tem
  desde a 4.0.2 (também aceita `--quit`, o zip dela continua `Ilha-X.Y.Z.zip`) e o `fundo-vivo` desde a 2.9.1
  (`build\release\fundo-vivo-X.Y.Z.zip` sem os `.pdb`, só `--quit`). Os quatro seguem o formato.

## Decisões que não se desfazem sem motivo

- **Só remove o que é nosso:** Run e atalho saem só se apontam para dentro das nossas pastas; na desinstalação os
  ponteiros voltam ao backup só se o ponteiro em uso ainda é o nosso (se a pessoa trocou depois, fica o dela).
- **Desinstalar não apaga configuração** (`~\.ilha`, `dados\` do relógio, `%APPDATA%\FundoVivo`). A `~\.ilha` tem mais
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
- **A entrada do Run continua.** Os três apps recusam segunda cópia (mutex `Ilha.Instancia`, `RelogioMond`,
  `FundoVivoEngine`), então a cópia que a fila abre depois fecha sozinha, e o "iniciar com o Windows" de dentro de cada
  app segue funcionando. Descartado: `StartupDelayInMSec` (acelera os 16 programas, não os nossos) e IFEO (HKLM, pede
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
  o setup avisa no build e a tela de progresso fica só com a lista.
- Ao instalar, `Payload.ExtractVideos` tira os dos apps escolhidos, no idioma da tela, para
  `%TEMP%\DesktopGlow\videos`, e o `Ui/VideoPanel.cs` toca em sequência num `MediaElement` mudo (botão de som
  no canto). **A instalação leva 1 a 2 s no PC dele**, por isso o vídeo continua na tela de "Tudo pronto".
- O `MediaElement` do WPF usa o Windows Media Player do sistema: no Windows N ele falha e fica a capa parada. No
  `--screenshot` aparece a capa, porque vídeo tocando não sai no `RenderTargetBitmap`.

## Site (desktopglow.com, 03/11/2026)

- `site/public/` é o site inteiro, estático: `index.html`, `style.css`, `app.js`, as fontes Quicksand e os ícones dos
  apps. Página em inglês, com o português no `app.js` (`PT`); abre na língua do navegador (`navigator.language`, que no
  Windows segue o sistema) e o botão PT/EN da pílula troca e lembra no `localStorage`. **Os nomes dos apps são em
  inglês na página em inglês.** Sem otimizar para celular (decisão dele: os apps são de Windows); conferido em 3440 x
  1440 e 1080 x 1920.
- Direção "vitrine da ilha": hero claro com o vídeo emoldurado (Lusion), uma seção por app com o vídeo dela (ritmo da
  Apple), fundos alternando preto e `#f2f2f7` até o rodapé. A assinatura é o menu: uma pílula preta como a ilha que
  cresce com mola e mostra "Download" depois do topo.
- **Baixar:** `releases/latest/download/DesktopGlow-Setup.exe` do GitHub (o Cloudflare não serve arquivo acima de 25 MiB,
  e o setup tem ~107 MB). Por isso o nome do exe é fixo. A versão e o tamanho na página vêm da API do GitHub
  (`releases/latest`), com o texto do HTML como reserva.
- **Vídeos:** `site/public/media/` fica fora do git e sai do `python site/ferramentas/midia.py` (hero em 1600 px, os
  oito do setup como estão). Tocam mudos só enquanto aparecem na tela; o botão de som deixa um com som por vez.
- **Publicar:** Worker `desktopglow` com os dois domínios próprios (`site/wrangler.jsonc`); o DNS e o certificado o
  Cloudflare cria no primeiro deploy (a zona não pode ter A/CNAME próprio para esses nomes). Comando, da pasta
  `desktop-glow`: `npx wrangler@4 deploy --config site/wrangler.jsonc`. **Deploy só quando ele mandar.**
- **Doação:** GitHub Sponsors (`github.com/sponsors/FelipeWASD83`), que ele ativou em 03/11/2026 e estava esperando a
  aprovação do GitHub; até ela sair, o link não abre. Botão no rodapé do site e `.github/FUNDING.yml` (o botão
  "Sponsor" do repositório). Antes disso ele tinha descartado PayPal (não tem) e o Pix só serviria para o Brasil.
- Prévia: entrada `desktop-glow-site` do `launch.json` (porta 3471).

## Testar sem mexer no PC

- `DesktopGlow.exe --self-test <relatorio.txt>`: cursores contra um registro de mentira (inclusive um
  `backup.json` escrito pelo Python), mescla de JSON, rabicho do exe, Run e atalho "só o nosso", textos nos dois idiomas.
- `DESKTOPGLOW_HOME=<pasta>` muda todas as pastas para dentro dela e o registro para `HKCU\Software\DesktopGlow-Sandbox`;
  nesse modo nada é fechado, aberto, nem recarregado (cursor), e o winget não roda. Com `--install-silent <opcoes.json>`
  (o JSON é o `InstallOptions`) e `--uninstall-silent` dá para instalar e desinstalar inteiro numa pasta. **Rodar num
  terminal normal** (`run_in_terminal`), não pelo shell do app do Claude: o MSIX virtualiza o HKCU.
- `--screenshot <pasta> [--lang en]`: cada tela num PNG (2x), com a janela fora de todos os monitores.
- `ferramentas\test-sandbox.ps1`: instala, reinstala e desinstala (pelo `Uninstall.exe` copiado) numa pasta, e confere
  47 coisas (arquivos, Run, ponteiros, atalhos nos dois idiomas, configs mescladas, hash do desinstalador, migração do
  nome antigo). Relatório em
  `build\sandbox-report.txt`.
- `ferramentas\test-ui.ps1`: a janela de verdade fora da tela, clicada por UI Automation (desliga o cartão do Fundo
  Vivo, escolhe o cursor branco, instala, fecha; depois a janela do desinstalador). Os cartões e os quadros têm
  `AutomationProperties.Name` (o WPF mostra o ToggleButton como Button sem nome); manter.
- Os dois scripts rodam **num terminal normal**.
- **Instalar de verdade no PC dele só com o OK dele:** troca os ponteiros, regrava os Run do relógio e do Fundo Vivo
  para as cópias instaladas (hoje apontam para as pastas dos projetos) e fecha a ilha, o relógio e o Fundo Vivo abertos.

## Comandos

- Gerar o setup: `powershell -ExecutionPolicy Bypass -File ferramentas\build.ps1` (`-Rebuild ilha,relogio,cursors,fundovivo`)
  → `dist\DesktopGlow-Setup.exe` (nome fixo, é o que o site baixa da release mais nova) e `dist\SHA256.txt`. `build\` e `dist\` ficam fora do git.
- Ícone do setup e as figuras dos cartões dos cursores: `python ferramentas\make_icon.py` (lê os `.cur` do
  `ilha-cursors\build`; o Pillow perde o alfa do `.cur`, por isso o leitor próprio).
- Compilar só a janela: `dotnet build src\Setup -c Release`.
- Versão: `<Version>` no `src\Setup\Setup.csproj` e o topo do `CHANGELOG.md`, juntos.
