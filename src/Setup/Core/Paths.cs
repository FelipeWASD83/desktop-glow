namespace DesktopGlowSetup.Core;

/// <summary>
/// Every place the setup writes to. DESKTOPGLOW_HOME moves all of them (and the registry, see <see cref="UserRegistry"/>)
/// into one folder, and in that mode nothing is closed, launched or reloaded: it is how the install is tested
/// without touching the PC.
/// </summary>
public static class Paths
{
    static readonly string? Home = Environment.GetEnvironmentVariable("DESKTOPGLOW_HOME");
    public static bool Sandbox => !string.IsNullOrEmpty(Home);

    static string Pick(string sandboxName, Environment.SpecialFolder real) =>
        Sandbox ? Ensure(Path.Combine(Home!, sandboxName)) : Environment.GetFolderPath(real);

    public static string LocalAppData => Pick("local", Environment.SpecialFolder.LocalApplicationData);
    public static string RoamingAppData => Pick("roaming", Environment.SpecialFolder.ApplicationData);
    public static string UserProfile => Pick("home", Environment.SpecialFolder.UserProfile);
    public static string StartMenu => Pick("startmenu", Environment.SpecialFolder.Programs);
    public static string Desktop => Pick("desktop", Environment.SpecialFolder.DesktopDirectory);

    public static string Programs => Path.Combine(LocalAppData, "Programs");
    /// <summary>The ilha only writes its Run entry from exactly this folder (Inicio.cs in the ilha project).</summary>
    public static string Ilha => Path.Combine(Programs, "Ilha");
    public static string Relogio => Path.Combine(Programs, "RelogioMond");
    public static string FundoVivo => Path.Combine(Programs, "FundoVivo");
    /// <summary>Same folder as ilha-cursors' install.py, so its --uninstall keeps working.</summary>
    public static string Cursors => Path.Combine(UserProfile, ".ilha-cursors");
    public static string IlhaConfig => Path.Combine(UserProfile, ".ilha", "config.json");

    public static string Pack => Path.Combine(Programs, "DesktopGlow");
    public static string Uninstaller => Path.Combine(Pack, "Uninstall.exe");
    public static string StateFile => Path.Combine(Pack, "installed.json");

    public static string LogFile => Path.Combine(Sandbox ? Home! : Path.GetTempPath(), "DesktopGlow", "setup.log");

    public static string Ensure(string dir)
    {
        Directory.CreateDirectory(dir);
        return dir;
    }

    /// <summary>True when <paramref name="path"/> is inside <paramref name="folder"/> (case-insensitive, either slash).</summary>
    public static bool IsInside(string? path, string folder)
    {
        if (string.IsNullOrWhiteSpace(path)) return false;
        string p = path.Trim().Trim('"').Replace('/', '\\');
        string f = folder.TrimEnd('\\') + "\\";
        return p.StartsWith(f, StringComparison.OrdinalIgnoreCase);
    }
}
