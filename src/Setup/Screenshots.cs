using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using DesktopGlowSetup.Core;

namespace DesktopGlowSetup;

/// <summary>--screenshot: every screen rendered to a PNG from a window placed outside all monitors.</summary>
public static class Screenshots
{
    public static int Run(string folder, Payload? payload)
    {
        Directory.CreateDirectory(folder);
        MainWindow.ShutdownOnClose = false;
        string lang = Text.Lang;
        try
        {
            if (payload != null)
            {
                var install = Open(new MainWindow(payload, Mode.Install));
                foreach (string s in new[] { "welcome", "pick", "options", "options-mid", "options-end", "final", "progress", "done", "done-error" })
                    Save(install, s, Path.Combine(folder, $"{lang}-{s}.png"));
                install.Close();
            }

            MainWindow.StateOverride = new InstalledState
            {
                Pack = payload?.Manifest.Pack ?? "1.0.0",
                Components = Components.All.ToDictionary(Components.Key, c => new InstalledComponent
                {
                    Version = payload?.Manifest.Components.GetValueOrDefault(Components.Key(c))?.Version ?? "1.0.0",
                    Folder = Components.Folder(c),
                }),
            };
            var uninstall = Open(new MainWindow(null, Mode.Uninstall));
            Save(uninstall, "uninstall", Path.Combine(folder, $"{lang}-uninstall.png"));
            uninstall.Close();
            MainWindow.StateOverride = null;

            var broken = Open(new MainWindow(null, Mode.Broken));
            Save(broken, "broken", Path.Combine(folder, $"{lang}-broken.png"));
            broken.Close();
            return 0;
        }
        catch (Exception e)
        {
            Log.Write("screenshot: " + e);
            File.WriteAllText(Path.Combine(folder, "error.txt"), e.ToString());
            return 1;
        }
    }

    static MainWindow Open(MainWindow w)
    {
        w.WindowStartupLocation = WindowStartupLocation.Manual;
        w.Left = -32000;
        w.Top = -32000;
        w.ShowActivated = false;
        w.ShowInTaskbar = false;
        w.Show();
        Pump();
        return w;
    }

    static void Save(MainWindow w, string scenario, string file)
    {
        w.Scenario(scenario);
        Pump();
        w.UpdateLayout();
        Pump();
        var root = (FrameworkElement)w.Content;
        const double scale = 2;
        var bmp = new RenderTargetBitmap((int)(root.ActualWidth * scale), (int)(root.ActualHeight * scale), 96 * scale, 96 * scale, PixelFormats.Pbgra32);
        bmp.Render(root);
        var png = new PngBitmapEncoder();
        png.Frames.Add(BitmapFrame.Create(bmp));
        using var fs = File.Create(file);
        png.Save(fs);
    }

    static void Pump()
    {
        var frame = new DispatcherFrame();
        Dispatcher.CurrentDispatcher.BeginInvoke(DispatcherPriority.ApplicationIdle, () => frame.Continue = false);
        Dispatcher.PushFrame(frame);
    }
}
