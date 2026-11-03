using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using DesktopGlowSetup.Core;

namespace DesktopGlowSetup;

/// <summary>
/// Command line:
///   (nothing)                       the setup window (or the uninstaller, when this file has no apps inside)
///   --uninstall                     the uninstaller window (what Settings &gt; Apps runs)
///   --lang pt|en                    force the language
///   --ping                          exit 0 once WPF has loaded (the build's Smart App Control check)
///   --check-payload                 exit 0 if the apps are glued to this file, 4 if not
///   --migrate                       move an install made as "Pacote Windows Bonito" (until 1.2.2) to the new names
///   --prioridade ligar|desligar      logon tasks with priority for the apps now in "start with Windows", wherever they are
///   --arrow-diff &lt;file.cur&gt;         exit code = per mille of pixels where the arrow in use differs from the file
///   --self-test &lt;report&gt;           logic tests with a fake registry and a temp folder
///   --install-silent &lt;options.json&gt; install with no window (use with DESKTOPGLOW_HOME to test in a folder)
///   --uninstall-silent              remove everything installed, no window
///   --screenshot &lt;folder&gt;           render every screen to PNGs, with no window on the screen
///   --offscreen                     open the window outside every monitor (UI Automation tests)
/// </summary>
public partial class App : Application
{
    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        string[] args = e.Args;
        bool Has(string flag) => args.Contains(flag, StringComparer.OrdinalIgnoreCase);
        string? Arg(string flag)
        {
            int i = Array.FindIndex(args, a => a.Equals(flag, StringComparison.OrdinalIgnoreCase));
            return i >= 0 && i + 1 < args.Length ? args[i + 1] : null;
        }
        Text.Init(Arg("--lang"));
        string self = Environment.ProcessPath!;

        if (Has("--ping"))
        {
            // draws once so the WPF native libraries load: that is what Smart App Control could refuse
            var bmp = new RenderTargetBitmap(4, 4, 96, 96, PixelFormats.Pbgra32);
            bmp.Render(new DrawingVisual());
            Shutdown(0);
            return;
        }
        if (Has("--check-payload")) { Shutdown(Payload.Open(self) != null ? 0 : 4); return; }
        if (Arg("--prioridade") is string modo && modo is "ligar" or "desligar")
        {
            Shutdown(Priority.FromCurrentStartup(modo == "ligar", new UserRegistry()));
            return;
        }
        if (Arg("--arrow-diff") is string cursorFile)
        {
            // per mille of pixels where the arrow in use differs from the file: 0 means that file is the pointer now
            double off = Cursors.ArrowDifference(cursorFile);
            Log.Write($"arrow-diff {cursorFile}: {off:P1}");
            Shutdown((int)Math.Round(off * 1000));
            return;
        }
        if (Has("--self-test")) { Shutdown(SelfTest.Run(Arg("--self-test") ?? Path.Combine(Path.GetTempPath(), "desktopglow-selftest.txt"))); return; }
        if (Has("--install-silent")) { Shutdown(Silent.Install(self, Arg("--install-silent"))); return; }
        if (Has("--uninstall-silent")) { Shutdown(Silent.Uninstall()); return; }

        var payload = Payload.Open(self);
        if (Has("--migrate"))
        {
            var reg = new UserRegistry();
            if (Legacy.Present(reg)) Legacy.Migrate(reg, payload);
            else Log.Write("legacy: nothing from Pacote Windows Bonito on this PC");
            Shutdown(0);
            return;
        }
        if (Arg("--screenshot") == null)
        {
            // an install from the time the pack was called Pacote Windows Bonito, before the window reads the state
            try
            {
                var reg = new UserRegistry();
                if (Legacy.Present(reg)) Legacy.Migrate(reg, payload);
            }
            catch (Exception ex) { Log.Write("legacy: " + ex); }
        }
        Mode mode = Has("--uninstall") ? Mode.Uninstall : payload != null ? Mode.Install : File.Exists(Paths.StateFile) ? Mode.Uninstall : Mode.Broken;

        if (Arg("--screenshot") is string folder)
        {
            Shutdown(Screenshots.Run(folder, payload));
            return;
        }
        var window = new MainWindow(payload, mode);
        if (Has("--offscreen"))
        {
            // for ferramentas\test-ui.ps1: the real window, driven by UI Automation, outside every monitor
            window.WindowStartupLocation = WindowStartupLocation.Manual;
            window.Left = -32000;
            window.Top = -32000;
            window.ShowActivated = false;
        }
        window.Show();
    }
}
