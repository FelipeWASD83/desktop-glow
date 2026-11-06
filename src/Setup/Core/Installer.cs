using System.IO.Compression;
using System.Text.Json.Nodes;
using Microsoft.Win32;

namespace DesktopGlowSetup.Core;

public enum StepState { Waiting, Running, Done, Failed, Skipped }

/// <summary>What the screens listen to while the install or the uninstall runs (raised on a worker thread).</summary>
public interface IProgressSink
{
    void Component(ComponentId c, StepState state, string? detail);
    void Overall(double fraction, string text);
}

/// <summary>Names that appear on the PC: shortcuts and Run entries (the same names the apps' own tools use).</summary>
public static class Names
{
    public const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\DesktopGlow";
    public const string DisplayName = "Desktop Glow";

    public static string? RunValue(ComponentId c) => c switch
    {
        ComponentId.Ilha => "Ilha",
        ComponentId.Relogio => "RelogioMond",
        ComponentId.FundoVivo => "FundoVivo",
        ComponentId.GearHub => "GearHub",
        _ => null,
    };

    /// <summary>The shortcut in the language of the setup's screens (the apps' names are translated in English).</summary>
    public static string? ShortcutName(ComponentId c) => ShortcutName(c, Text.English);

    public static string? ShortcutName(ComponentId c, bool english) => c switch
    {
        ComponentId.Ilha => english ? "Island.lnk" : "Ilha.lnk",
        ComponentId.Relogio => english ? "Mond Clock.lnk" : "Relógio Mond.lnk",
        ComponentId.FundoVivo => english ? "Living Wallpaper.lnk" : "Fundo Vivo.lnk",
        ComponentId.GearHub => english ? "Gear Hub.lnk" : "Central de Periféricos.lnk",
        _ => null,
    };

    /// <summary>Both languages: a reinstall in the other one, or the uninstaller, must find the shortcut either way.</summary>
    public static IEnumerable<string> ShortcutNames(ComponentId c) =>
        new[] { ShortcutName(c, false), ShortcutName(c, true) }.OfType<string>().Distinct();
}

public sealed class Installer
{
    readonly Payload _payload;
    readonly InstallOptions _o;
    readonly IUserRegistry _reg;
    readonly IProgressSink _sink;
    long _totalBytes, _doneBytes;
    double _prereqWeight;

    public Dictionary<ComponentId, string> Errors { get; } = new();
    public List<ComponentId> Installed { get; } = new();

    public Installer(Payload payload, InstallOptions options, IUserRegistry reg, IProgressSink sink)
    {
        _payload = payload;
        _o = options;
        _reg = reg;
        _sink = sink;
    }

    public void Run()
    {
        var selected = _o.Selected.ToList();
        Log.Write($"install {string.Join(", ", selected)} (pack {_payload.Manifest.Pack}, sandbox {Paths.Sandbox})");
        foreach (var c in Components.All) _sink.Component(c, selected.Contains(c) ? StepState.Waiting : StepState.Skipped, null);

        _totalBytes = selected.Sum(c => _payload.Manifest.Components.TryGetValue(Components.Key(c), out var p) ? p.Bytes : 0);
        var missing = MissingPrerequisites(selected);
        // a winget install takes a while; give each one the weight of ~40 MB so the bar does not stall at 0
        _prereqWeight = 40L << 20;
        _totalBytes += (long)(_prereqWeight * missing.Count);

        var stillMissing = new HashSet<Prerequisite>();
        foreach (var p in missing)
        {
            _sink.Overall(Fraction(), Text.T("progress.prereq", Text.T("prereq." + p)));
            bool ok = false;
            if (_o.InstallMissing && !Paths.Sandbox) ok = Prerequisites.Install(p).Ok;
            if (!ok) stillMissing.Add(p);
            _doneBytes += (long)_prereqWeight;
        }

        using var zip = _payload.OpenZip();
        foreach (var c in selected)
        {
            var lacking = Components.Needs(c).Where(stillMissing.Contains).ToList();
            if (lacking.Count > 0 && !Paths.Sandbox)
            {
                Fail(c, Text.T("error.missing", string.Join(", ", lacking.Select(p => Text.T("prereq." + p)))));
                _doneBytes += _payload.Manifest.Components[Components.Key(c)].Bytes;
                continue;
            }
            _sink.Component(c, StepState.Running, null);
            _sink.Overall(Fraction(), Text.T("progress.installing", Text.T("app." + Components.Key(c))));
            try
            {
                switch (c)
                {
                    case ComponentId.Ilha: InstallIlha(zip); break;
                    case ComponentId.Relogio: InstallRelogio(zip); break;
                    case ComponentId.FundoVivo: InstallFundoVivo(zip); break;
                    case ComponentId.GearHub: InstallGearHub(zip); break;
                    default: InstallCursors(zip); break;
                }
                Installed.Add(c);
                _sink.Component(c, StepState.Done, null);
                Log.Write($"{c}: ok");
            }
            catch (Exception e)
            {
                Fail(c, e.Message);
                Log.Write($"{c}: {e}");
            }
        }

        if (Installed.Count > 0)
        {
            _sink.Overall(Fraction(), Text.T("progress.finishing"));
            try { WriteUninstaller(); }
            catch (Exception e) { Log.Write("uninstaller: " + e); }
        }
        if (_o.LaunchWhenDone) Launch();
        _sink.Overall(1, Errors.Count == 0 ? Text.T("progress.done") : Text.T("progress.doneWithErrors"));
        Log.Write($"install finished, {Installed.Count} ok, {Errors.Count} failed");
    }

    public static List<Prerequisite> MissingPrerequisites(IEnumerable<ComponentId> selected) =>
        selected.SelectMany(Components.Needs).Distinct().Where(p => !Prerequisites.IsInstalled(p)).ToList();

    void Fail(ComponentId c, string message)
    {
        Errors[c] = message;
        _sink.Component(c, StepState.Failed, message);
    }

    double Fraction() => _totalBytes <= 0 ? 0 : Math.Clamp((double)_doneBytes / _totalBytes, 0, 1);

    // ---- the five components

    void InstallIlha(ZipArchive zip)
    {
        Processes.CloseIlha();
        Extract(zip, "ilha/", Paths.Ilha, keep: Array.Empty<string>());
        Json.Merge(Paths.IlhaConfig, new Dictionary<string, JsonNode?>
        {
            ["iniciarComWindows"] = _o.IlhaStartup,
            ["colada"] = _o.IlhaDocked,
            ["language"] = _o.AppLanguage,
        });
        string exe = Path.Combine(Paths.Ilha, "Ilha.exe");
        // The installed ilha writes its Run entry itself when it opens; written here too so it is right even if
        // the person does not open it now.
        Startup(ComponentId.Ilha, _o.IlhaStartup, $"\"{exe}\"");
        string icon = Path.Combine(Paths.Ilha, "icone.ico");
        Shortcuts(ComponentId.Ilha, exe, "", Paths.Ilha, File.Exists(icon) ? icon : exe, Text.T("desc.ilha"));
    }

    void InstallRelogio(ZipArchive zip)
    {
        string pythonw = Prerequisites.FindPythonw() ?? (Paths.Sandbox ? @"C:\Python\pythonw.exe" : throw new InvalidOperationException(Text.T("error.missing", Text.T("prereq.Python"))));
        Processes.CloseRelogio();
        // dados\ has the clock's config and update state, fontes\ the Anurati it downloads on the first start
        Extract(zip, "relogio/", Paths.Relogio, keep: new[] { "dados", "fontes" });
        var config = new Dictionary<string, JsonNode?>
        {
            ["iniciarComWindows"] = _o.RelogioStartup,
            ["idioma"] = _o.AppLanguage,
            ["formato24h"] = _o.Relogio24h,
            ["clima"] = _o.RelogioWeather,
        };
        if (_o.Latitude is double lat && _o.Longitude is double lon)
        {
            config["latitude"] = Math.Round(lat, 4);
            config["longitude"] = Math.Round(lon, 4);
        }
        Json.Merge(Path.Combine(Paths.Relogio, "dados", "config.json"), config);
        string script = Path.Combine(Paths.Relogio, "iniciar.pyw");
        Startup(ComponentId.Relogio, _o.RelogioStartup, $"\"{pythonw}\" \"{script}\"");
        Shortcuts(ComponentId.Relogio, pythonw, $"\"{script}\"", Paths.Relogio, Path.Combine(Paths.Relogio, "icone", "icone.ico"), Text.T("desc.relogio"));
    }

    void InstallFundoVivo(ZipArchive zip)
    {
        Processes.CloseFundoVivo();
        Extract(zip, "fundovivo/", Paths.FundoVivo, keep: Array.Empty<string>());
        string exe = Path.Combine(Paths.FundoVivo, "FundoVivo.exe");
        Startup(ComponentId.FundoVivo, _o.FundoVivoStartup, $"\"{exe}\" --engine");
        Shortcuts(ComponentId.FundoVivo, exe, "", Paths.FundoVivo, exe, Text.T("desc.fundovivo"));
    }

    void InstallGearHub(ZipArchive zip)
    {
        Processes.CloseGearHub();
        // its settings, profiles, log and update state live in ~\.gear-hub, outside the folder
        Extract(zip, "gearhub/", Paths.GearHub, keep: Array.Empty<string>());
        Json.Merge(Paths.GearHubConfig, new Dictionary<string, JsonNode?>
        {
            ["startWithWindows"] = _o.GearHubStartup,
            ["language"] = _o.AppLanguage,
        });
        string exe = Path.Combine(Paths.GearHub, "GearHub.exe");
        // the same command the installed Gear Hub writes for itself when it opens
        Startup(ComponentId.GearHub, _o.GearHubStartup, $"\"{exe}\" --tray");
        string icon = Path.Combine(Paths.GearHub, "icone.ico");
        Shortcuts(ComponentId.GearHub, exe, "", Paths.GearHub, File.Exists(icon) ? icon : exe, Text.T("desc.gearhub"));
    }

    void InstallCursors(ZipArchive zip)
    {
        Extract(zip, "cursors/", Paths.Cursors, keep: new[] { "backup.json" });
        var manifest = Json.Read<CursorManifest>(Path.Combine(Paths.Cursors, Cursors.ManifestName))
            ?? throw new InvalidOperationException("cursors/manifest.json");
        Cursors.SaveBackup(_reg, manifest, Cursors.BackupFile(Paths.Cursors));
        Cursors.Register(_reg, manifest, Paths.Cursors);
        if (_o.CursorScheme is "black" or "white")
        {
            string arrow = Path.Combine(Paths.Cursors, _o.CursorScheme, manifest.Schemes[_o.CursorScheme].Files["Arrow"]);
            Cursors.Apply(_reg, manifest, _o.CursorScheme, Paths.Cursors, () => Cursors.ReloadSystemCursors(arrow));
        }
    }

    void Startup(ComponentId c, bool on, string command)
    {
        string name = Names.RunValue(c)!;
        if (on) RunEntry.Set(_reg, name, command);
        else RunEntry.RemoveIfOurs(_reg, name, Components.Folder(c));
        // the priority task rides on "start with Windows": no task for an app that does not start with it
        if (on && _o.Priority)
        {
            if (Priority.Set(name, command) is string erro) Log.Write($"{c}: priority task not made ({erro}); it still starts from Run");
        }
        else Priority.Remove(name);
    }

    void Shortcuts(ComponentId c, string target, string args, string workingDir, string icon, string description)
    {
        string name = Names.ShortcutName(c)!;
        foreach (var (folder, wanted) in new[] { (Paths.StartMenu, _o.StartMenu), (Paths.Desktop, _o.DesktopShortcuts) })
        {
            foreach (string other in Names.ShortcutNames(c).Where(n => n != name))
                Shortcut.RemoveIfOurs(Path.Combine(folder, other), Components.Folder(c));
            string lnk = Path.Combine(folder, name);
            if (wanted) Shortcut.Create(lnk, target, args, workingDir, icon, description);
            else Shortcut.RemoveIfOurs(lnk, Components.Folder(c));
        }
    }

    void Launch()
    {
        foreach (var c in Installed)
        {
            try
            {
                switch (c)
                {
                    case ComponentId.Ilha:
                        Processes.Start(Path.Combine(Paths.Ilha, "Ilha.exe"), "", Paths.Ilha);
                        break;
                    case ComponentId.FundoVivo:
                        // with no argument it starts the engine and opens the library to pick a wallpaper per monitor
                        Processes.Start(Path.Combine(Paths.FundoVivo, "FundoVivo.exe"), "", Paths.FundoVivo);
                        break;
                    case ComponentId.GearHub:
                        // with no argument it opens its window (with --tray it would start hidden in the tray)
                        Processes.Start(Path.Combine(Paths.GearHub, "GearHub.exe"), "", Paths.GearHub);
                        break;
                    case ComponentId.Relogio:
                        if (Prerequisites.FindPythonw() is string pythonw)
                            Processes.Start(pythonw, $"\"{Path.Combine(Paths.Relogio, "iniciar.pyw")}\"", Paths.Relogio,
                                new Dictionary<string, string> { ["RELOGIO_PYTHONW"] = pythonw });
                        break;
                }
            }
            catch (Exception e) { Log.Write($"launch {c}: {e.Message}"); }
        }
    }

    /// <summary>
    /// Empties <paramref name="dest"/> (but the names in <paramref name="keep"/>) and writes every entry under
    /// <paramref name="prefix"/> into it. A file still locked by an app that is closing gets a few tries.
    /// </summary>
    void Extract(ZipArchive zip, string prefix, string dest, string[] keep)
    {
        Directory.CreateDirectory(dest);
        foreach (string entry in Directory.EnumerateFileSystemEntries(dest))
        {
            if (keep.Contains(Path.GetFileName(entry), StringComparer.OrdinalIgnoreCase)) continue;
            Retry(() =>
            {
                if (Directory.Exists(entry)) Directory.Delete(entry, recursive: true);
                else File.Delete(entry);
            });
        }
        string root = Path.GetFullPath(dest).TrimEnd('\\') + "\\";
        // a zip written by Windows PowerShell 5.1 has backslashes in its names; both kinds are accepted
        foreach (var e in zip.Entries.Where(e => e.FullName.Replace('\\', '/').StartsWith(prefix, StringComparison.Ordinal)))
        {
            string name = e.FullName.Replace('\\', '/');
            string rel = name[prefix.Length..];
            if (rel.Length == 0) continue;
            string target = Path.GetFullPath(Path.Combine(dest, rel.Replace('/', '\\')));
            if (!target.StartsWith(root, StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("zip entry outside the folder: " + e.FullName);
            if (name.EndsWith('/')) { Directory.CreateDirectory(target); continue; }
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            Retry(() => e.ExtractToFile(target, overwrite: true));
            _doneBytes += e.Length;
            _sink.Overall(Fraction(), Text.T("progress.installing", Text.T("app." + prefix.TrimEnd('/'))));
        }
    }

    static void Retry(Action action)
    {
        for (int i = 0; ; i++)
        {
            try { action(); return; }
            catch (Exception e) when ((e is IOException or UnauthorizedAccessException) && i < 8) { Thread.Sleep(400); }
        }
    }

    /// <summary>Uninstall.exe (the setup without the apps glued to it), installed.json and the entry in Settings &gt; Apps.</summary>
    void WriteUninstaller()
    {
        Directory.CreateDirectory(Paths.Pack);
        _payload.WriteExecutable(Paths.Uninstaller);

        var state = InstalledState.Load();
        state.Pack = _payload.Manifest.Pack;
        foreach (var c in Installed)
            state.Components[Components.Key(c)] = new InstalledComponent
            {
                Version = _payload.Manifest.Components[Components.Key(c)].Version,
                Folder = Components.Folder(c),
                Installed = DateTime.Now,
            };
        state.Save();
        RegisterUninstall(_reg, state);
    }

    public static void RegisterUninstall(IUserRegistry reg, InstalledState state)
    {
        long kb = state.Components.Values.Sum(c => FolderSize(c.Folder)) / 1024 + new FileInfo(Paths.Uninstaller).Length / 1024;
        string k = Names.UninstallKey;
        reg.Set(k, "DisplayName", Names.DisplayName, RegistryValueKind.String);
        reg.Set(k, "DisplayVersion", state.Pack, RegistryValueKind.String);
        reg.Set(k, "Publisher", "Felipe", RegistryValueKind.String);
        reg.Set(k, "DisplayIcon", $"{Paths.Uninstaller},0", RegistryValueKind.String);
        reg.Set(k, "UninstallString", $"\"{Paths.Uninstaller}\" --uninstall", RegistryValueKind.String);
        reg.Set(k, "InstallLocation", Paths.Pack, RegistryValueKind.String);
        reg.Set(k, "InstallDate", DateTime.Now.ToString("yyyyMMdd"), RegistryValueKind.String);
        reg.Set(k, "EstimatedSize", (int)Math.Min(int.MaxValue, kb), RegistryValueKind.DWord);
        reg.Set(k, "NoModify", 1, RegistryValueKind.DWord);
        reg.Set(k, "NoRepair", 1, RegistryValueKind.DWord);
    }

    static long FolderSize(string folder)
    {
        try { return Directory.Exists(folder) ? Directory.EnumerateFiles(folder, "*", SearchOption.AllDirectories).Sum(f => new FileInfo(f).Length) : 0; }
        catch { return 0; }
    }
}
