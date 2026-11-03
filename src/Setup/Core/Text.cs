using System.Globalization;

namespace PacoteSetup.Core;

/// <summary>Every on-screen text in Portuguese and English. Follows the Windows language unless --lang says otherwise.</summary>
public static class Text
{
    public static bool English { get; private set; }
    public static string Lang => English ? "en" : "pt";

    public static void Init(string? forced) =>
        English = forced == "en" || (forced != "pt" && CultureInfo.CurrentUICulture.TwoLetterISOLanguageName != "pt");

    public static string T(string key, params object[] args)
    {
        if (!Strings.TryGetValue(key, out var s)) return key;
        string text = English ? s.En : s.Pt;
        return args.Length > 0 ? string.Format(CultureInfo.CurrentCulture, text, args) : text;
    }

    public static string Size(long bytes) => bytes >= 1L << 30
        ? (bytes / (double)(1L << 30)).ToString("0.0", CultureInfo.CurrentCulture) + " GB"
        : Math.Max(1, (long)Math.Round(bytes / (double)(1 << 20))) + " MB";

    static readonly Dictionary<string, (string Pt, string En)> Strings = new()
    {
        ["app.ilha"] = ("Ilha", "Ilha"),
        ["app.relogio"] = ("Relógio Mond", "Relógio Mond"),
        ["app.fundovivo"] = ("Fundo Vivo", "Fundo Vivo"),
        ["app.cursors"] = ("Cursores da Ilha", "Ilha Cursors"),

        ["desc.ilha"] = ("A Dynamic Island no topo da tela: música, timer, gravador, avisos e atalhos.",
            "A Dynamic Island at the top of the screen: music, timer, recorder, alerts and shortcuts."),
        ["desc.relogio"] = ("Dia, data, hora, clima e a música tocando, no meio da área de trabalho.",
            "Day, date, time, weather and the song playing, right on the desktop."),
        ["desc.fundovivo"] = ("Papel de parede animado e leve: vídeo, imagem, página web e cenas.",
            "A light animated wallpaper: video, picture, web page and scenes."),
        ["desc.cursors"] = ("Ponteiros preto ou branco, com contorno e animações no jeito da ilha.",
            "Black or white pointers with an outline and animations in the island's style."),

        ["prereq.DesktopRuntime"] = (".NET 10", ".NET 10"),
        ["prereq.Python"] = ("Python", "Python"),
        ["prereq.WebView2"] = ("WebView2", "WebView2"),

        ["btn.start"] = ("Começar", "Get started"),
        ["btn.next"] = ("Continuar", "Continue"),
        ["btn.back"] = ("Voltar", "Back"),
        ["btn.install"] = ("Instalar", "Install"),
        ["btn.close"] = ("Fechar", "Close"),
        ["btn.uninstall"] = ("Desinstalar", "Uninstall"),
        ["btn.log"] = ("Ver o registro", "Open the log"),
        ["btn.search"] = ("Buscar", "Search"),
        ["win.minimize"] = ("Minimizar", "Minimize"),
        ["win.close"] = ("Fechar", "Close"),

        ["welcome.title"] = ("Pacote Windows Bonito", "Pacote Windows Bonito"),
        ["welcome.sub"] = ("A ilha, o relógio, os cursores e o fundo animado, instalados de uma vez.",
            "The island, the clock, the cursors and the live wallpaper, installed in one go."),
        ["welcome.foot"] = ("Versão {0}  ·  instala só para você, sem pedir administrador",
            "Version {0}  ·  installs for you only, no administrator needed"),

        ["pick.title"] = ("O que instalar", "What to install"),
        ["pick.sub"] = ("Clique num cartão para ligar ou desligar.", "Click a card to turn it on or off."),
        ["card.meta"] = ("{0}  ·  versão {1}", "{0}  ·  version {1}"),
        ["card.update"] = ("Já instalado, vai atualizar", "Already installed, it will update"),
        ["card.installed"] = ("Instalado, versão {0}", "Installed, version {0}"),
        ["pick.ready"] = ("{0} pronto", "{0} ready"),
        ["pick.willInstall"] = ("{0} vai ser instalado", "{0} will be installed"),
        ["pick.none"] = ("Escolha pelo menos um", "Pick at least one"),

        ["opt.title"] = ("Do seu jeito", "Your way"),
        ["opt.sub"] = ("Dá para mudar tudo isso depois, dentro de cada app.", "You can change all of this later inside each app."),
        ["opt.startup"] = ("Abrir junto com o Windows", "Open when Windows starts"),
        ["opt.startupSub"] = ("Começa sozinho quando você entra no PC", "Starts by itself when you sign in"),
        ["opt.ilhaPos"] = ("Posição", "Position"),
        ["opt.ilhaPosSub"] = ("Flutuando um pouco abaixo da borda, como no iPhone, ou colada no topo",
            "Floating a little below the edge, like on the iPhone, or glued to the top"),
        ["opt.floating"] = ("Flutuando", "Floating"),
        ["opt.docked"] = ("Colada no topo", "Glued to the top"),
        ["opt.clock"] = ("Formato da hora", "Time format"),
        ["opt.clockSub"] = ("Como a hora aparece no relógio", "How the clock shows the time"),
        ["opt.weather"] = ("Mostrar o clima", "Show the weather"),
        ["opt.weatherSub"] = ("Temperatura e tempo agora, pelo Open-Meteo", "Temperature and conditions, from Open-Meteo"),
        ["opt.city"] = ("Cidade do clima", "Weather city"),
        ["opt.cityHint"] = ("Digite a cidade", "Type a city"),
        ["opt.cityDefault"] = ("Sem cidade escolhida, o relógio mostra o clima de Belo Horizonte",
            "With no city picked, the clock shows the weather in Belo Horizonte"),
        ["opt.citySearching"] = ("Buscando...", "Searching..."),
        ["opt.cityNone"] = ("Nenhuma cidade com esse nome", "No city with that name"),
        ["opt.cityError"] = ("Não deu para buscar agora. Sem internet?", "Could not search right now. Offline?"),
        ["opt.cityPicked"] = ("Clima de {0}", "Weather for {0}"),
        ["opt.scheme"] = ("Esquema", "Scheme"),
        ["opt.schemeSub"] = ("Os dois ficam em Configurações > Mouse > Ponteiros", "Both go to Settings > Mouse > Pointers"),
        ["scheme.black"] = ("Preto", "Black"),
        ["scheme.white"] = ("Branco", "White"),
        ["scheme.none"] = ("Só na lista", "Just add them"),
        ["scheme.noneSub"] = ("Não troca o ponteiro agora", "Keeps your pointer for now"),
        ["opt.fundoNote"] = ("Ao terminar, a biblioteca do Fundo Vivo abre para você escolher o fundo de cada monitor.",
            "When it's done, the Fundo Vivo library opens so you can pick a wallpaper for each monitor."),
        ["opt.fundoNoteNoLaunch"] = ("Para escolher o fundo de cada monitor, abra o Fundo Vivo depois de instalar.",
            "To pick a wallpaper for each monitor, open Fundo Vivo after installing."),

        ["final.title"] = ("Últimos detalhes", "Last details"),
        ["final.sub"] = ("Confira e instale.", "Check and install."),
        ["final.general"] = ("Geral", "General"),
        ["final.startMenu"] = ("Atalhos no Menu Iniciar", "Start menu shortcuts"),
        ["final.desktop"] = ("Atalhos na área de trabalho", "Desktop shortcuts"),
        ["final.launch"] = ("Abrir os apps ao terminar", "Open the apps when done"),
        ["final.priority"] = ("Abrir primeiro, com prioridade", "Open first, with priority"),
        ["final.prioritySub"] = ("Os apps que abrem com o Windows saem na frente dos outros programas e ganham mais CPU",
            "The apps that open with Windows start ahead of the other programs, with more CPU"),
        ["final.lang"] = ("Idioma da ilha e do relógio", "Language of the island and the clock"),
        ["lang.auto"] = ("Do Windows", "Windows"),
        ["lang.pt"] = ("Português", "Português"),
        ["lang.en"] = ("English", "English"),
        ["final.missing"] = ("Instalar o que falta", "Install what's missing"),
        ["final.missingSub"] = ("{0}, pelo winget. Pode pedir permissão de administrador.",
            "{0}, through winget. It may ask for administrator permission."),
        ["final.summary"] = ("Resumo", "Summary"),
        ["final.total"] = ("Total", "Total"),
        ["final.where"] = ("Vai para {0}", "Goes to {0}"),

        ["progress.title"] = ("Instalando", "Installing"),
        ["progress.prereq"] = ("Instalando o {0}...", "Installing {0}..."),
        ["progress.installing"] = ("Instalando: {0}", "Installing {0}"),
        ["progress.finishing"] = ("Terminando...", "Finishing..."),
        ["progress.done"] = ("Tudo pronto", "All done"),
        ["progress.doneWithErrors"] = ("Terminou com problema", "Finished with a problem"),
        ["progress.removing"] = ("Tirando: {0}", "Removing {0}"),
        ["progress.removed"] = ("Tudo removido", "All removed"),
        ["progress.uninstallTitle"] = ("Desinstalando", "Uninstalling"),

        ["state.waiting"] = ("Na fila", "Waiting"),
        ["state.running"] = ("Instalando", "Installing"),
        ["state.done"] = ("Pronto", "Done"),
        ["state.removing"] = ("Tirando", "Removing"),
        ["state.removed"] = ("Removido", "Removed"),

        ["done.title"] = ("Tudo pronto", "All done"),
        ["done.sub"] = ("Para desinstalar depois: Configurações > Aplicativos > Pacote Windows Bonito.",
            "To uninstall later: Settings > Apps > Pacote Windows Bonito."),
        ["done.errorTitle"] = ("Quase tudo", "Almost everything"),
        ["done.errorSub"] = ("Alguma coisa não instalou. O motivo está ao lado do nome, e o registro tem os detalhes.",
            "Something did not install. The reason is next to its name, and the log has the details."),
        ["error.short"] = ("Falhou", "Failed"),
        ["error.cursorReload"] = ("O Windows não trocou o ponteiro. Escolha \"Ilha preto\" ou \"Ilha branco\" em Configurações > Mouse > Ponteiros.",
            "Windows did not switch the pointer. Pick \"Ilha preto\" or \"Ilha branco\" in Settings > Mouse > Pointers."),
        ["error.missing"] = ("Falta {0}", "{0} is missing"),

        ["uninstall.title"] = ("Desinstalar", "Uninstall"),
        ["uninstall.sub"] = ("Escolha o que tirar do PC. As configurações dos apps ficam guardadas, caso queira instalar de novo.",
            "Pick what to remove. The apps' settings are kept in case you install again."),
        ["uninstall.doneTitle"] = ("Removido", "Removed"),
        ["uninstall.doneSub"] = ("O que você escolheu saiu do PC.", "What you picked is gone from the PC."),
        ["uninstall.nothing"] = ("Nada deste pacote está instalado.", "Nothing from this pack is installed."),

        ["broken.title"] = ("Este arquivo está incompleto", "This file is incomplete"),
        ["broken.sub"] = ("O instalador não achou os apps dentro dele. Baixe o arquivo de novo.",
            "The setup could not find the apps inside it. Download the file again."),

        ["island.selected"] = ("{0} de 4", "{0} of 4"),
        ["island.options"] = ("Opções", "Options"),
        ["island.ready"] = ("Pronto para instalar", "Ready to install"),
        ["video.sound"] = ("Ligar ou desligar o som", "Sound on or off"),
        ["island.copying"] = ("Copiando os arquivos", "Copying files"),
        ["island.removing"] = ("Tirando do PC", "Removing"),
        ["island.uninstall"] = ("Desinstalar", "Uninstall"),
    };
}
