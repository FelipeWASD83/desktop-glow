using System.Diagnostics;

namespace DesktopGlowSetup.Core;

/// <summary>
/// Takes away what this pack installed, and only that: Run entries and shortcuts are removed only when they point
/// into our folders. The apps' settings stay (~\.ilha, the clock's dados\, %APPDATA%\FundoVivo) for a reinstall.
/// </summary>
public sealed class Uninstaller
{
    readonly IUserRegistry _reg;
    readonly IProgressSink _sink;

    public Dictionary<ComponentId, string> Errors { get; } = new();
    public List<ComponentId> Removed { get; } = new();

    public Uninstaller(IUserRegistry reg, IProgressSink sink)
    {
        _reg = reg;
        _sink = sink;
    }

    public void Run(IReadOnlyCollection<ComponentId> which)
    {
        var state = InstalledState.Load();
        Log.Write($"uninstall {string.Join(", ", which)}");
        foreach (var c in Components.All) _sink.Component(c, which.Contains(c) ? StepState.Waiting : StepState.Skipped, null);
        int i = 0;
        foreach (var c in which)
        {
            _sink.Component(c, StepState.Running, null);
            _sink.Overall((double)i / which.Count, Text.T("progress.removing", Text.T("app." + Components.Key(c))));
            try
            {
                Remove(c);
                state.Components.Remove(Components.Key(c));
                Removed.Add(c);
                _sink.Component(c, StepState.Done, null);
            }
            catch (Exception e)
            {
                Errors[c] = e.Message;
                _sink.Component(c, StepState.Failed, e.Message);
                Log.Write($"uninstall {c}: {e}");
            }
            i++;
        }

        if (state.Components.Count == 0)
        {
            _reg.DeleteKey(Names.UninstallKey);
            try { File.Delete(Paths.StateFile); } catch { }
            DeleteSelfLater();
        }
        else
        {
            state.Save();
            Installer.RegisterUninstall(_reg, state);
        }
        _sink.Overall(1, Errors.Count == 0 ? Text.T("progress.removed") : Text.T("progress.doneWithErrors"));
    }

    void Remove(ComponentId c)
    {
        string folder = Components.Folder(c);
        switch (c)
        {
            case ComponentId.Ilha: Processes.CloseIlha(); break;
            case ComponentId.Relogio: Processes.CloseRelogio(); break;
            case ComponentId.FundoVivo: Processes.CloseFundoVivo(); break;
            default:
                var manifest = Json.Read<CursorManifest>(Path.Combine(folder, Cursors.ManifestName));
                if (manifest != null)
                {
                    // Pointers someone picked after installing ours are left alone; only ours are given back.
                    if (Cursors.InUse(_reg, folder)) Cursors.Uninstall(_reg, manifest, Cursors.BackupFile(folder), () => Cursors.ReloadSystemCursors(null));
                    else foreach (var s in manifest.Schemes.Values) _reg.Delete(Cursors.SchemesKey, s.Name);
                }
                DeleteFolder(folder);
                return;
        }
        if (Names.RunValue(c) is string run)
        {
            RunEntry.RemoveIfOurs(_reg, run, folder);
            Priority.Remove(run);
        }
        foreach (string lnk in Names.ShortcutNames(c))
            foreach (string dir in new[] { Paths.StartMenu, Paths.Desktop })
                Shortcut.RemoveIfOurs(Path.Combine(dir, lnk), folder);

        if (c == ComponentId.Relogio && Directory.Exists(Path.Combine(folder, "dados")))
        {
            foreach (string entry in Directory.EnumerateFileSystemEntries(folder))
            {
                if (Path.GetFileName(entry).Equals("dados", StringComparison.OrdinalIgnoreCase)) continue;
                if (Directory.Exists(entry)) Directory.Delete(entry, true); else File.Delete(entry);
            }
        }
        else DeleteFolder(folder);
    }

    static void DeleteFolder(string folder)
    {
        for (int i = 0; ; i++)
        {
            try
            {
                if (Directory.Exists(folder)) Directory.Delete(folder, recursive: true);
                return;
            }
            catch (Exception e) when ((e is IOException or UnauthorizedAccessException) && i < 8) { Thread.Sleep(400); }
        }
    }

    /// <summary>Uninstall.exe cannot delete the folder it runs from: a hidden cmd does it a few seconds after we exit.</summary>
    static void DeleteSelfLater()
    {
        if (Paths.Sandbox)
        {
            Log.Write("sandbox: would delete " + Paths.Pack + " after exiting");
            return;
        }
        try
        {
            Process.Start(new ProcessStartInfo("cmd.exe", $"/c ping 127.0.0.1 -n 4 >nul & rmdir /s /q \"{Paths.Pack}\"")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = Path.GetTempPath(),
            })?.Dispose();
        }
        catch (Exception e) { Log.Write("delete self: " + e.Message); }
    }
}
