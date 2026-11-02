using System.Diagnostics;
using Microsoft.Win32;

namespace PacoteSetup.Core;

public enum Prerequisite { DesktopRuntime, Python, WebView2 }

/// <summary>
/// What the apps need from the PC: the .NET 10 Desktop Runtime (ilha, clock, Fundo Vivo), Python 3.10+ (the clock's
/// launcher, iniciar.pyw) and WebView2 (Fundo Vivo; Windows 11 ships it). Missing ones are installed with winget.
/// </summary>
public static class Prerequisites
{
    public static string WingetId(Prerequisite p) => p switch
    {
        Prerequisite.DesktopRuntime => "Microsoft.DotNet.DesktopRuntime.10",
        Prerequisite.Python => "Python.Python.3.13",
        _ => "Microsoft.EdgeWebView2Runtime",
    };

    public static bool IsInstalled(Prerequisite p) => p switch
    {
        Prerequisite.DesktopRuntime => HasDesktopRuntime10(),
        Prerequisite.Python => FindPythonw() != null,
        _ => HasWebView2(),
    };

    static bool HasDesktopRuntime10()
    {
        var roots = new List<string>();
        string? env = Environment.GetEnvironmentVariable("DOTNET_ROOT");
        if (!string.IsNullOrEmpty(env)) roots.Add(env);
        roots.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "dotnet"));
        foreach (string root in roots)
        {
            string dir = Path.Combine(root, "shared", "Microsoft.WindowsDesktop.App");
            if (Directory.Exists(dir) && Directory.GetDirectories(dir).Any(d => Path.GetFileName(d).StartsWith("10.", StringComparison.Ordinal)))
                return true;
        }
        return false;
    }

    static bool HasWebView2()
    {
        const string client = @"Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
        foreach (var (hive, path) in new[] { (Registry.LocalMachine, @"SOFTWARE\WOW6432Node\" + client), (Registry.LocalMachine, @"SOFTWARE\" + client), (Registry.CurrentUser, @"Software\" + client) })
        {
            using var k = hive.OpenSubKey(path);
            if (k?.GetValue("pv") is string v && v.Length > 0 && v != "0.0.0.0") return true;
        }
        return false;
    }

    /// <summary>
    /// pythonw.exe of a real Python 3.10 or newer: the newest registered one (PEP 514), then PATH. Never the Microsoft
    /// Store stub in WindowsApps.
    /// </summary>
    public static string? FindPythonw()
    {
        var found = new List<(Version Version, string Path)>();
        foreach (var hive in new[] { Registry.CurrentUser, Registry.LocalMachine })
        {
            using var core = hive.OpenSubKey(@"Software\Python\PythonCore");
            if (core == null) continue;
            foreach (string tag in core.GetSubKeyNames())
            {
                using var install = core.OpenSubKey(tag + @"\InstallPath");
                string? exe = install?.GetValue("WindowedExecutablePath") as string;
                if (string.IsNullOrEmpty(exe) && install?.GetValue("") is string dir) exe = Path.Combine(dir, "pythonw.exe");
                if (string.IsNullOrEmpty(exe) || !File.Exists(exe)) continue;
                if (Version.TryParse(new string(tag.TakeWhile(c => char.IsDigit(c) || c == '.').ToArray()), out var v) && v >= new Version(3, 10))
                    found.Add((v, exe));
            }
        }
        if (found.Count > 0) return found.OrderByDescending(f => f.Version).First().Path;

        foreach (string dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(';', StringSplitOptions.RemoveEmptyEntries))
        {
            string exe = Path.Combine(dir.Trim(), "pythonw.exe");
            if (!File.Exists(exe) || exe.Contains("WindowsApps", StringComparison.OrdinalIgnoreCase)) continue;
            return exe;
        }
        return null;
    }

    public static string? FindWinget()
    {
        string exe = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Microsoft", "WindowsApps", "winget.exe");
        return File.Exists(exe) ? exe : null;
    }

    /// <summary>Runs winget for one prerequisite. Its own installer may show the Windows admin prompt.</summary>
    public static (bool Ok, string Message) Install(Prerequisite p)
    {
        string? winget = FindWinget();
        if (winget == null) return (false, "winget");
        string args = $"install --id {WingetId(p)} -e --silent --accept-package-agreements --accept-source-agreements --disable-interactivity";
        Log.Write($"winget {args}");
        try
        {
            using var proc = Process.Start(new ProcessStartInfo(winget, args) { UseShellExecute = false, CreateNoWindow = true, RedirectStandardOutput = true, RedirectStandardError = true });
            if (proc == null) return (false, "winget");
            string output = proc.StandardOutput.ReadToEnd() + proc.StandardError.ReadToEnd();
            proc.WaitForExit();
            Log.Write($"winget {WingetId(p)} exit {proc.ExitCode}: {output.Trim()}");
            return (IsInstalled(p), $"winget {proc.ExitCode}");
        }
        catch (Exception e) { return (false, e.Message); }
    }
}
