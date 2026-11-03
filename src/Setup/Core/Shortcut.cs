using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;
using System.Text;

namespace DesktopGlowSetup.Core;

/// <summary>.lnk files through the shell's own IShellLink, no WScript.</summary>
public static class Shortcut
{
    public static void Create(string lnk, string target, string arguments, string workingDir, string icon, string description)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(lnk)!);
        var link = (IShellLinkW)new ShellLink();
        try
        {
            link.SetPath(target);
            link.SetArguments(arguments);
            link.SetWorkingDirectory(workingDir);
            link.SetIconLocation(icon, 0);
            link.SetDescription(description);
            ((IPersistFile)link).Save(lnk, true);
        }
        finally { Marshal.FinalReleaseComObject(link); }
    }

    /// <summary>The target and arguments of a shortcut, or null when it cannot be read.</summary>
    public static (string Target, string Arguments)? Read(string lnk)
    {
        if (!File.Exists(lnk)) return null;
        var link = (IShellLinkW)new ShellLink();
        try
        {
            ((IPersistFile)link).Load(lnk, 0);
            var path = new StringBuilder(1024);
            link.GetPath(path, path.Capacity, IntPtr.Zero, 0x4 /* SLGP_RAWPATH */);
            var args = new StringBuilder(4096);
            link.GetArguments(args, args.Capacity);
            return (path.ToString(), args.ToString());
        }
        catch { return null; }
        finally { Marshal.FinalReleaseComObject(link); }
    }

    /// <summary>Deletes the shortcut only if it opens something inside <paramref name="folder"/>.</summary>
    public static bool RemoveIfOurs(string lnk, string folder)
    {
        var info = Read(lnk);
        if (info == null) return false;
        if (!Paths.IsInside(info.Value.Target, folder) && !RunEntry.PointsInto(info.Value.Arguments, folder)) return false;
        File.Delete(lnk);
        return true;
    }

    [ComImport, Guid("00021401-0000-0000-C000-000000000046")]
    class ShellLink { }

    [ComImport, InterfaceType(ComInterfaceType.InterfaceIsIUnknown), Guid("000214F9-0000-0000-C000-000000000046")]
    interface IShellLinkW
    {
        void GetPath([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder file, int cch, IntPtr findData, int flags);
        void GetIDList(out IntPtr pidl);
        void SetIDList(IntPtr pidl);
        void GetDescription([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder name, int cch);
        void SetDescription([MarshalAs(UnmanagedType.LPWStr)] string name);
        void GetWorkingDirectory([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder dir, int cch);
        void SetWorkingDirectory([MarshalAs(UnmanagedType.LPWStr)] string dir);
        void GetArguments([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder args, int cch);
        void SetArguments([MarshalAs(UnmanagedType.LPWStr)] string args);
        void GetHotkey(out short hotkey);
        void SetHotkey(short hotkey);
        void GetShowCmd(out int showCmd);
        void SetShowCmd(int showCmd);
        void GetIconLocation([Out, MarshalAs(UnmanagedType.LPWStr)] StringBuilder iconPath, int cch, out int icon);
        void SetIconLocation([MarshalAs(UnmanagedType.LPWStr)] string iconPath, int icon);
        void SetRelativePath([MarshalAs(UnmanagedType.LPWStr)] string pathRel, int reserved);
        void Resolve(IntPtr hwnd, int flags);
        void SetPath([MarshalAs(UnmanagedType.LPWStr)] string file);
    }
}
