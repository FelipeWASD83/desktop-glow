namespace DesktopGlowSetup.Core;

/// <summary>
/// Until 1.2.2 the pack was called "Pacote Windows Bonito". An install made then keeps its installed.json and
/// Uninstall.exe in Programs\PacoteWindowsBonito, its Settings &gt; Apps entry under that name and its priority tasks
/// as "Pacote Windows Bonito - &lt;app&gt;". This moves all of it to the new names; the apps' own folders, Run entries
/// and shortcuts did not change. It runs before every install or uninstall window, and alone with --migrate.
/// </summary>
public static class Legacy
{
    public static string Pack => Path.Combine(Paths.Programs, "PacoteWindowsBonito");
    public const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\PacoteWindowsBonito";
    static string TaskPrefix => Paths.Sandbox ? "PWB-Sandbox " : "Pacote Windows Bonito - ";
    static string OldTask(string runName) => TaskPrefix + Priority.Label(runName);

    public static bool Present(IUserRegistry reg) =>
        Directory.Exists(Pack) || reg.ReadAll(UninstallKey).Count > 0 || Priority.RunNames.Any(n => Priority.TaskExists(OldTask(n)));

    /// <summary>
    /// Moves the old install to the new names. <paramref name="payload"/> is the running setup, whose executable part
    /// becomes the new Uninstall.exe; without one (the uninstaller itself) only the state file moves.
    /// Returns what it did, for the log and for --migrate.
    /// </summary>
    public static List<string> Migrate(IUserRegistry reg, Payload? payload)
    {
        var done = new List<string>();
        string oldState = Path.Combine(Pack, "installed.json");
        if (File.Exists(oldState) && !File.Exists(Paths.StateFile))
        {
            Directory.CreateDirectory(Paths.Pack);
            File.Copy(oldState, Paths.StateFile);
            done.Add("installed.json moved");
        }

        var state = InstalledState.Load();
        if (state.Components.Count > 0)
        {
            if (payload != null && !File.Exists(Paths.Uninstaller))
            {
                payload.WriteExecutable(Paths.Uninstaller);
                done.Add("new Uninstall.exe");
            }
            if (File.Exists(Paths.Uninstaller))
            {
                Installer.RegisterUninstall(reg, state);
                done.Add("Settings > Apps entry as " + Names.DisplayName);
            }
        }

        if (reg.ReadAll(UninstallKey).Count > 0)
        {
            reg.DeleteKey(UninstallKey);
            done.Add("old Settings > Apps entry removed");
        }

        foreach (string name in Priority.RunNames)
        {
            if (!Priority.TaskExists(OldTask(name))) continue;
            Priority.DeleteTask(OldTask(name));
            done.Add($"task {OldTask(name)} removed");
            // the task rides on "start with Windows": made again under the new name from the Run entry in use
            if (reg.Get(RunEntry.Key, name) is string command && command.Trim().Length > 0 && Priority.Set(name, command) == null)
                done.Add($"task {Priority.TaskName(name)} made");
        }

        if (Directory.Exists(Pack))
        {
            try
            {
                Directory.Delete(Pack, recursive: true);
                done.Add(Pack + " removed");
            }
            catch (Exception e) { done.Add($"{Pack} left in place ({e.Message})"); }
        }

        foreach (string line in done) Log.Write("legacy: " + line);
        return done;
    }
}
