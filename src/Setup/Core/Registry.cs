using Microsoft.Win32;

namespace PacoteSetup.Core;

public readonly record struct RegValue(object Data, RegistryValueKind Kind);

/// <summary>The few HKCU operations the setup needs, so the tests can swap in a dictionary.</summary>
public interface IUserRegistry
{
    Dictionary<string, RegValue> ReadAll(string path);
    object? Get(string path, string name);
    void Set(string path, string name, object data, RegistryValueKind kind);
    void Delete(string path, string name);
    void DeleteKey(string path);
}

public sealed class UserRegistry : IUserRegistry
{
    // In sandbox mode every key lives under this one, so a test install can be read and wiped in one place.
    public const string SandboxRoot = @"Software\PacoteWindowsBonito-Sandbox\";
    static string Real(string path) => Paths.Sandbox ? SandboxRoot + path : path;

    public Dictionary<string, RegValue> ReadAll(string path)
    {
        var values = new Dictionary<string, RegValue>(StringComparer.OrdinalIgnoreCase);
        using var key = Registry.CurrentUser.OpenSubKey(Real(path));
        if (key == null) return values;
        foreach (string name in key.GetValueNames())
        {
            object? data = key.GetValue(name, null, RegistryValueOptions.DoNotExpandEnvironmentNames);
            if (data != null) values[name] = new RegValue(data, key.GetValueKind(name));
        }
        return values;
    }

    public object? Get(string path, string name)
    {
        using var key = Registry.CurrentUser.OpenSubKey(Real(path));
        return key?.GetValue(name, null, RegistryValueOptions.DoNotExpandEnvironmentNames);
    }

    public void Set(string path, string name, object data, RegistryValueKind kind)
    {
        using var key = Registry.CurrentUser.CreateSubKey(Real(path));
        key.SetValue(name, data, kind);
    }

    public void Delete(string path, string name)
    {
        using var key = Registry.CurrentUser.OpenSubKey(Real(path), writable: true);
        key?.DeleteValue(name, throwOnMissingValue: false);
    }

    public void DeleteKey(string path) => Registry.CurrentUser.DeleteSubKeyTree(Real(path), throwOnMissingSubKey: false);
}

public sealed class MemoryRegistry : IUserRegistry
{
    public readonly Dictionary<string, Dictionary<string, RegValue>> Keys = new(StringComparer.OrdinalIgnoreCase);
    public int Reloads;

    Dictionary<string, RegValue> KeyFor(string path)
    {
        if (!Keys.TryGetValue(path, out var k)) Keys[path] = k = new Dictionary<string, RegValue>(StringComparer.OrdinalIgnoreCase);
        return k;
    }

    public Dictionary<string, RegValue> ReadAll(string path) =>
        Keys.TryGetValue(path, out var k) ? new Dictionary<string, RegValue>(k, StringComparer.OrdinalIgnoreCase) : new(StringComparer.OrdinalIgnoreCase);

    public object? Get(string path, string name) => Keys.TryGetValue(path, out var k) && k.TryGetValue(name, out var v) ? v.Data : null;
    public void Set(string path, string name, object data, RegistryValueKind kind) => KeyFor(path)[name] = new RegValue(data, kind);
    public void Delete(string path, string name) { if (Keys.TryGetValue(path, out var k)) k.Remove(name); }

    public void DeleteKey(string path)
    {
        foreach (string p in Keys.Keys.Where(p => p.Equals(path, StringComparison.OrdinalIgnoreCase)
                     || p.StartsWith(path + "\\", StringComparison.OrdinalIgnoreCase)).ToList())
            Keys.Remove(p);
    }
}

/// <summary>"Start with Windows": a value in HKCU\...\Run, removed only when it points into our own folder.</summary>
public static class RunEntry
{
    public const string Key = @"Software\Microsoft\Windows\CurrentVersion\Run";

    public static void Set(IUserRegistry reg, string name, string command) => reg.Set(Key, name, command, RegistryValueKind.String);

    /// <summary>Takes the entry away only if it starts our copy, never one the person set up some other way.</summary>
    public static bool RemoveIfOurs(IUserRegistry reg, string name, string folder)
    {
        if (reg.Get(Key, name) is not string command) return false;
        if (!PointsInto(command, folder)) return false;
        reg.Delete(Key, name);
        return true;
    }

    /// <summary>A command line points into the folder if any quoted or bare token of it does.</summary>
    public static bool PointsInto(string command, string folder) =>
        Tokens(command).Any(t => Paths.IsInside(t, folder));

    static IEnumerable<string> Tokens(string command)
    {
        var current = new System.Text.StringBuilder();
        bool quoted = false;
        foreach (char c in command)
        {
            if (c == '"') { quoted = !quoted; continue; }
            if (c == ' ' && !quoted)
            {
                if (current.Length > 0) yield return current.ToString();
                current.Clear();
                continue;
            }
            current.Append(c);
        }
        if (current.Length > 0) yield return current.ToString();
    }
}
