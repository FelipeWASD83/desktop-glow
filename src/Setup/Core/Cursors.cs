using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Win32;

namespace DesktopGlowSetup.Core;

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

    /// <summary>
    /// Makes Windows load the pointers from the registry again, right now. On Windows 11 26300 the call returns FALSE
    /// with error 0 even when it worked (measured 02/11/2026: the arrow in use was ours pixel for pixel), so a FALSE
    /// is checked against the arrow Windows is really using before it counts as a failure.
    /// </summary>
    public static void ReloadSystemCursors(string? expectedArrow)
    {
        if (Paths.Sandbox) return;
        if (SystemParametersInfoW(SPI_SETCURSORS, 0, IntPtr.Zero, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE)) return;
        int error = Marshal.GetLastWin32Error();
        if (expectedArrow == null)
        {
            Log.Write($"SPI_SETCURSORS returned FALSE (error {error}); nothing to check against");
            return;
        }
        double off = ArrowDifference(expectedArrow);
        Log.Write($"SPI_SETCURSORS returned FALSE (error {error}); the arrow in use differs from {expectedArrow} in {off:P1} of its pixels");
        if (off > 0.03) throw new InvalidOperationException(Text.T("error.cursorReload"));
    }

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    static extern IntPtr LoadImageW(IntPtr hInst, IntPtr name, uint type, int cx, int cy, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "LoadImageW")]
    static extern IntPtr LoadImageFile(IntPtr hInst, string name, uint type, int cx, int cy, uint flags);
    [DllImport("user32.dll")] static extern bool DestroyCursor(IntPtr h);
    [DllImport("user32.dll")] static extern bool GetIconInfo(IntPtr h, out IconInfo info);
    [DllImport("user32.dll")] static extern bool DrawIconEx(IntPtr dc, int x, int y, IntPtr icon, int cx, int cy, uint step, IntPtr brush, uint flags);
    [DllImport("user32.dll")] static extern IntPtr GetDC(IntPtr hwnd);
    [DllImport("user32.dll")] static extern int ReleaseDC(IntPtr hwnd, IntPtr dc);
    [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleDC(IntPtr dc);
    [DllImport("gdi32.dll")] static extern IntPtr CreateCompatibleBitmap(IntPtr dc, int w, int h);
    [DllImport("gdi32.dll")] static extern IntPtr SelectObject(IntPtr dc, IntPtr obj);
    [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr obj);
    [DllImport("gdi32.dll")] static extern bool DeleteDC(IntPtr dc);
    [DllImport("gdi32.dll")] static extern bool PatBlt(IntPtr dc, int x, int y, int w, int h, uint rop);
    [DllImport("gdi32.dll")] static extern uint GetPixel(IntPtr dc, int x, int y);
    [DllImport("gdi32.dll")] static extern int GetObjectW(IntPtr obj, int size, out Bitmap bmp);

    [StructLayout(LayoutKind.Sequential)]
    struct IconInfo { public bool fIcon; public int xHotspot, yHotspot; public IntPtr hbmMask, hbmColor; }
    [StructLayout(LayoutKind.Sequential)]
    struct Bitmap { public int bmType, bmWidth, bmHeight, bmWidthBytes; public ushort bmPlanes, bmBitsPixel; public IntPtr bmBits; }

    /// <summary>
    /// Fraction of pixels (0 to 1) where the arrow Windows is using differs from <paramref name="file"/>, both drawn
    /// at the size of the one in use. 1 when it cannot be measured.
    /// </summary>
    public static double ArrowDifference(string file)
    {
        const uint IMAGE_CURSOR = 2, LR_LOADFROMFILE = 0x10, LR_SHARED = 0x8000;
        IntPtr system = LoadImageW(IntPtr.Zero, 32512 /* OCR_NORMAL */, IMAGE_CURSOR, 0, 0, LR_SHARED);
        if (system == IntPtr.Zero) return 1;
        int size = 32;
        if (GetIconInfo(system, out var info))
        {
            IntPtr bmp = info.hbmColor != IntPtr.Zero ? info.hbmColor : info.hbmMask;
            if (GetObjectW(bmp, Marshal.SizeOf<Bitmap>(), out var b) > 0 && b.bmWidth > 0) size = b.bmWidth;
            if (info.hbmColor != IntPtr.Zero) DeleteObject(info.hbmColor);
            if (info.hbmMask != IntPtr.Zero) DeleteObject(info.hbmMask);
        }
        IntPtr ours = LoadImageFile(IntPtr.Zero, file, IMAGE_CURSOR, size, size, LR_LOADFROMFILE);
        if (ours == IntPtr.Zero) return 1;
        try
        {
            uint[] a = Draw(system, size), b = Draw(ours, size);
            int differ = 0;
            for (int i = 0; i < a.Length; i++)
            {
                uint p = a[i], q = b[i];
                int d = Math.Abs((int)(p & 0xFF) - (int)(q & 0xFF)) + Math.Abs((int)((p >> 8) & 0xFF) - (int)((q >> 8) & 0xFF)) + Math.Abs((int)((p >> 16) & 0xFF) - (int)((q >> 16) & 0xFF));
                if (d > 48) differ++;
            }
            return (double)differ / a.Length;
        }
        finally { DestroyCursor(ours); }
    }

    static uint[] Draw(IntPtr cursor, int size)
    {
        IntPtr screen = GetDC(IntPtr.Zero);
        IntPtr dc = CreateCompatibleDC(screen);
        IntPtr bmp = CreateCompatibleBitmap(screen, size, size);
        IntPtr old = SelectObject(dc, bmp);
        try
        {
            PatBlt(dc, 0, 0, size, size, 0x00FF0062);  // WHITENESS
            DrawIconEx(dc, 0, 0, cursor, size, size, 0, IntPtr.Zero, 3 /* DI_NORMAL */);
            var px = new uint[size * size];
            for (int y = 0; y < size; y++)
                for (int x = 0; x < size; x++)
                    px[y * size + x] = GetPixel(dc, x, y);
            return px;
        }
        finally
        {
            SelectObject(dc, old);
            DeleteObject(bmp);
            DeleteDC(dc);
            ReleaseDC(IntPtr.Zero, screen);
        }
    }
}
