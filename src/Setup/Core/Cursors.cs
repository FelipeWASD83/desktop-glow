using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Win32;

namespace PacoteSetup.Core;

public sealed class CursorScheme
{
    public string Name { get; set; } = "";
    public Dictionary<string, string> Files { get; set; } = new();
}

public sealed class CursorManifest
{
    public string Version { get; set; } = "";
    public List<string> Order { get; set; } = new();
    public Dictionary<string, CursorScheme> Schemes { get; set; } = new();
}

/// <summary>
/// The same steps as ilha-cursors' install.py, in C# so the setup does not need Python for them: same folder, same
/// backup.json (pointers from before the very first install) and same scheme names, so either tool can undo the other.
/// </summary>
public static class Cursors
{
    public const string CursorsKey = @"Control Panel\Cursors";
    public const string SchemesKey = CursorsKey + @"\Schemes";
    public const string ManifestName = "manifest.json";

    public static string BackupFile(string target) => Path.Combine(target, "backup.json");

    public static List<string> SchemePaths(CursorManifest m, string variant, string target) =>
        m.Order.Select(role => Path.Combine(target, variant, m.Schemes[variant].Files[role])).ToList();

    public static void SaveBackup(IUserRegistry reg, CursorManifest m, string backupFile)
    {
        if (File.Exists(backupFile)) return;  // keep the pointers from before the very first install
        var keep = new Dictionary<string, object[]>();
        foreach (var (name, value) in reg.ReadAll(CursorsKey))
            if (m.Order.Contains(name) || name == "" || name == "Scheme Source")
                keep[name] = new[] { value.Data, (object)(int)value.Kind };
        Directory.CreateDirectory(Path.GetDirectoryName(backupFile)!);
        File.WriteAllText(backupFile, JsonSerializer.Serialize(keep, new JsonSerializerOptions { WriteIndented = true }));
    }

    public static void Register(IUserRegistry reg, CursorManifest m, string target)
    {
        foreach (var (variant, scheme) in m.Schemes)
            reg.Set(SchemesKey, scheme.Name, string.Join(",", SchemePaths(m, variant, target)), RegistryValueKind.ExpandString);
    }

    public static void Apply(IUserRegistry reg, CursorManifest m, string variant, string target, Action reload)
    {
        var paths = SchemePaths(m, variant, target);
        for (int i = 0; i < m.Order.Count; i++) reg.Set(CursorsKey, m.Order[i], paths[i], RegistryValueKind.ExpandString);
        reg.Set(CursorsKey, "", m.Schemes[variant].Name, RegistryValueKind.String);
        reg.Set(CursorsKey, "Scheme Source", 1, RegistryValueKind.DWord);  // 1 = user scheme
        reload();
    }

    /// <summary>Puts back the pointers from before the first install and removes both schemes from the list.</summary>
    public static void Uninstall(IUserRegistry reg, CursorManifest m, string backupFile, Action reload)
    {
        var saved = new Dictionary<string, RegValue>();
        if (File.Exists(backupFile))
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(backupFile));
            foreach (var p in doc.RootElement.EnumerateObject())
            {
                var kind = (RegistryValueKind)p.Value[1].GetInt32();
                var raw = p.Value[0];
                object data = raw.ValueKind == JsonValueKind.Number ? raw.GetInt32() : raw.GetString() ?? "";
                saved[p.Name] = new RegValue(data, kind);
            }
        }
        else
        {
            saved[""] = new RegValue("Windows Default", RegistryValueKind.String);
            saved["Scheme Source"] = new RegValue(2, RegistryValueKind.DWord);
        }
        foreach (string role in m.Order)
        {
            if (saved.TryGetValue(role, out var v)) reg.Set(CursorsKey, role, v.Data, v.Kind);
            else reg.Set(CursorsKey, role, "", RegistryValueKind.ExpandString);  // empty = the system default pointer
        }
        foreach (string name in new[] { "", "Scheme Source" })
            if (saved.TryGetValue(name, out var v)) reg.Set(CursorsKey, name, v.Data, v.Kind);
        foreach (var scheme in m.Schemes.Values) reg.Delete(SchemesKey, scheme.Name);
        reload();
    }

    /// <summary>True when the pointer in use right now is one of ours (the arrow points into the folder).</summary>
    public static bool InUse(IUserRegistry reg, string target) => Paths.IsInside(reg.Get(CursorsKey, "Arrow") as string, target);

    const uint SPI_SETCURSORS = 0x0057, SPIF_UPDATEINIFILE = 0x01, SPIF_SENDCHANGE = 0x02;

    [DllImport("user32.dll", SetLastError = true)]
    static extern bool SystemParametersInfoW(uint action, uint param, IntPtr vparam, uint winIni);

    /// <summary>Makes Windows load the pointers from the registry again, right now.</summary>
    public static void ReloadSystemCursors()
    {
        if (Paths.Sandbox) return;
        if (!SystemParametersInfoW(SPI_SETCURSORS, 0, IntPtr.Zero, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE))
            throw new InvalidOperationException("SystemParametersInfo(SPI_SETCURSORS) failed: " + Marshal.GetLastWin32Error());
    }
}
