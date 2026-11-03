# CLAUDE.md: pacote-windows-bonito

Instalador único da `ilha`, do `relogio-mond`, do `fundo-vivo` e do `ilha-cursors` (pedido do Felipe em 02/11/2026:
"exe de setup, muitas opções, bonitinho estilo ilha com fundo preto e bordas arredondadas"). **Repositório público**
(`FelipeWASD83/pacote-windows-bonito`, MIT), escolha dele ao criar. Código e comentários em inglês; README, changelog,
commits e este arquivo em português. Telas em pt e en, seguindo o Windows (`--lang pt|en` força).

## Como é feito

- C# WPF .NET 10, **self-contained e single-file** (`src/Setup`): abre num PC sem .NET, porque é ele que instala o
  runtime que os apps precisam. Janela sem moldura, `AllowsTransparency`, cartão preto com cantos de 32 e a sombra numa
  camada separada (efeito no cartão tiraria o ClearType do texto).
- **A pílula do topo** (`Ui/Island.cs`) é a assinatura visual: preta com borda acesa, muda de tamanho por mola
  (`Ui/Spring.cs`, razão de amortecimento ~0,68) e troca o conteúdo com fade e crescimento. Cada tela tem a sua; na
  instalação ela abre com o ícone do app, o que está fazendo e um anel com a porcentagem.
- Fonte Quicksand (a do relógio e do Fundo Vivo 2.1) nos títulos, Segoe UI Variable no resto.
- **Os apps vão colados no fim do exe** (`Core/Payload.cs`): `[exe][zip][tamanho do zip, 8 bytes]["PWBPAY01"]`. Os
  bytes antes do zip são exatamente o exe que o `build.ps1` testou no Smart App Control, e é isso que vira o
  `Uninstall.exe` (`WriteExecutable`): o desinstalador tem o hash que já passou. Não mudar o formato do rabicho sem
  mudar o `build.ps1` junto.

## Contratos com os outros projetos (quebram calados se mudarem lá)

- **Pastas:** `%LOCALAPPDATA%\Programs\Ilha` (fixa: o `Inicio.cs` da ilha só grava o Run dessa pasta),
  `...\Programs\RelogioMond`, `...\Programs\FundoVivo`, `%USERPROFILE%\.ilha-cursors` (a do `install.py`),
  `...\Programs\PacoteWindowsBonito` (Uninstall.exe e `installed.json`).
- **Run (HKCU):** `Ilha` = `"Ilha.exe"`, `RelogioMond` = `"pythonw" "iniciar.pyw"`, `FundoVivo` = `"FundoVivo.exe" --engine`.
  Os mesmos nomes que os apps usam, então não duplica com o que eles mesmos gravam.
- **Atalhos:** `Ilha.lnk`, `Relógio Mond.lnk`, `Fundo Vivo.lnk` (os nomes do `_organizacao\atalhos` e dos scripts deles).
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
- **Fechar os apps:** ilha `Ilha.exe --sair`, Fundo Vivo `FundoVivo.exe --quit` (devolve o papel de parede do
  Windows), relógio `dotnet RelogioMond.dll --quit` (desde a 1.5.0; versão antiga não conhece e o `dotnet` que sobrar
  depois de 4 s é morto, achado pela linha de comando com `RelogioMond.dll`).
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
- **O build nunca recompila o Fundo Vivo sozinho** (só com `-RebuildFundoVivo`): o `compilar.ps1` de lá troca o
  `fundo-vivo\app` e fecha o Fundo Vivo rodando dali. Sem o zip da versão atual, usa o mais novo de
  `fundo-vivo\build\release` e avisa. A 1.0.0 saiu com o pacote 2.4.0 (gerado pela sessão que trabalhava lá).
- **Zip com barra normal:** no PowerShell 5.1 o `ZipFile.CreateFromDirectory` grava os nomes com `\`, e o setup não
  achava nada dentro de `ilha/` (instalava "pronto" sem arquivo nenhum). O `build.ps1` grava entrada por entrada com
  `/`, e o `Installer.Extract` aceita as duas.
- O setup não tem atalho próprio nem atualizador dentro: não é um app que fica no PC. Cada app atualiza sozinho pelo
  dele; para atualizar o pacote, roda-se o setup novo.
- **O relógio vai como está em `relogio-mond\app`** (a DLL que já roda no PC dele, que o SAC aceitou); o build recusa
  se algum `.cs` igual ao commit for mais novo que a DLL. Arquivo em edição (aparece no `git status`) é trabalho de
  alguém em andamento: não entra e só gera aviso. Comparar com a hora do commit não serve: a 1.1.3 foi commitada 1 min
  depois de compilada.

## Abrir primeiro, com prioridade (1.2.0)

- Pedido dele em 03/11/2026 ("definir os programas como prioridade para que iniciem mais rápido"). O que atrasa os
  apps no logon é a fila do Run (o Windows solta os 16 programas dele aos poucos); a prioridade de CPU ajuda pouco
  sozinha. Por isso `Core/Priority.cs` cria, para cada app com "abrir junto com o Windows", uma tarefa
  "Pacote Windows Bonito - <app>" no Agendador: gatilho no logon do próprio usuário, **prioridade 2** (acima do normal;
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
- No modo `PACOTE_HOME` as tarefas se chamam "PWB-Sandbox <app>" e são tarefas de verdade: os dois testes apagam no
  fim, para nenhuma sobrar para o próximo logon.
- **O ganho no logon não foi medido** (exige sair e entrar no Windows).

## Vídeos na tela de progresso (1.1.0)

- Os 8 vídeos `setup-<app>-<en|pt>` do subprojeto `video/` (ler o `video/CLAUDE.md`) saem em versão leve em
  `video/saida/setup/<app>-<lingua>.mp4` (720p, ~1 MB) com o `.jpg`; o `build.ps1` põe em `videos/` no zip. Sem eles,
  o setup avisa no build e a tela de progresso fica só com a lista.
- Ao instalar, `Payload.ExtractVideos` tira os dos apps escolhidos, no idioma da tela, para
  `%TEMP%\PacoteWindowsBonito\videos`, e o `Ui/VideoPanel.cs` toca em sequência num `MediaElement` mudo (botão de som
  no canto). **A instalação leva 1 a 2 s no PC dele**, por isso o vídeo continua na tela de "Tudo pronto".
- O `MediaElement` do WPF usa o Windows Media Player do sistema: no Windows N ele falha e fica a capa parada. No
  `--screenshot` aparece a capa, porque vídeo tocando não sai no `RenderTargetBitmap`.

## Testar sem mexer no PC

- `PacoteWindowsBonito.exe --self-test <relatorio.txt>`: cursores contra um registro de mentira (inclusive um
  `backup.json` escrito pelo Python), mescla de JSON, rabicho do exe, Run e atalho "só o nosso", textos nos dois idiomas.
- `PACOTE_HOME=<pasta>` muda todas as pastas para dentro dela e o registro para `HKCU\Software\PacoteWindowsBonito-Sandbox`;
  nesse modo nada é fechado, aberto, nem recarregado (cursor), e o winget não roda. Com `--install-silent <opcoes.json>`
  (o JSON é o `InstallOptions`) e `--uninstall-silent` dá para instalar e desinstalar inteiro numa pasta. **Rodar num
  terminal normal** (`run_in_terminal`), não pelo shell do app do Claude: o MSIX virtualiza o HKCU.
- `--screenshot <pasta> [--lang en]`: cada tela num PNG (2x), com a janela fora de todos os monitores.
- `ferramentas\test-sandbox.ps1`: instala, reinstala e desinstala (pelo `Uninstall.exe` copiado) numa pasta, e confere
  39 coisas (arquivos, Run, ponteiros, atalhos, configs mescladas, hash do desinstalador). Relatório em
  `build\sandbox-report.txt`.
- `ferramentas\test-ui.ps1`: a janela de verdade fora da tela, clicada por UI Automation (desliga o cartão do Fundo
  Vivo, escolhe o cursor branco, instala, fecha; depois a janela do desinstalador). Os cartões e os quadros têm
  `AutomationProperties.Name` (o WPF mostra o ToggleButton como Button sem nome); manter.
- Os dois scripts rodam **num terminal normal**.
- **Instalar de verdade no PC dele só com o OK dele:** troca os ponteiros, regrava os Run do relógio e do Fundo Vivo
  para as cópias instaladas (hoje apontam para as pastas dos projetos) e fecha a ilha, o relógio e o Fundo Vivo abertos.

## Comandos

- Gerar o setup: `powershell -ExecutionPolicy Bypass -File ferramentas\build.ps1` (`-RebuildIlha`, `-RebuildFundoVivo`)
  → `dist\PacoteWindowsBonito-Setup-<versão>.exe` e `dist\SHA256.txt`. `build\` e `dist\` ficam fora do git.
- Ícone do setup e as figuras dos cartões dos cursores: `python ferramentas\make_icon.py` (lê os `.cur` do
  `ilha-cursors\build`; o Pillow perde o alfa do `.cur`, por isso o leitor próprio).
- Compilar só a janela: `dotnet build src\Setup -c Release`.
- Versão: `<Version>` no `src\Setup\Setup.csproj` e o topo do `CHANGELOG.md`, juntos.
