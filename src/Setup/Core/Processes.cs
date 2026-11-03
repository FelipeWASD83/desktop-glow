using System.Diagnostics;
using System.Runtime.InteropServices;

namespace DesktopGlowSetup.Core;

/// <summary>Finding, closing and starting the apps. Nothing here runs in sandbox mode.</summary>
public static class Processes
{
    /// <summary>Asks the ilha to quit (Ilha.exe --sair: 4.0.2 also takes --quit, but an older ilha being updated only knows --sair), then forces whatever is left.</summary>
    public static void CloseIlha()
    {
        if (Paths.Sandbox) return;
        var open = Process.GetProcessesByName("Ilha");
        if (open.Length == 0) return;
        string? exe = ImagePath(open[0].Id);
        if (exe != null) RunAndWait(exe, "--sair", 10000);
        WaitOrKill(open, 10000);
    }

    /// <summary>FundoVivo.exe --quit gives the Windows wallpaper back before the engine exits.</summary>
    public static void CloseFundoVivo()
    {
        if (Paths.Sandbox) return;
        var open = Process.GetProcessesByName("FundoVivo");
        if (open.Length == 0) return;
        string? exe = ImagePath(open[0].Id);
        if (exe != null) RunAndWait(exe, "--quit", 8000);
        foreach (var p in open) { try { p.CloseMainWindow(); } catch { } }
        WaitOrKill(open, 3000);
    }

    /// <summary>The clock is dotnet.exe running RelogioMond.dll, started by pythonw running iniciar.pyw.
    /// RelogioMond.dll --quit (1.5.0, same name as the Fundo Vivo's) closes it like the tray's Quit; older
    /// versions do not know it, so whatever is still running after a few seconds is killed.</summary>
    public static void CloseRelogio()
    {
        if (Paths.Sandbox) return;
        var clocks = Process.GetProcessesByName("dotnet").Where(p => CommandLine(p.Id)?.Contains("RelogioMond.dll", StringComparison.OrdinalIgnoreCase) == true).ToArray();
        var launchers = Process.GetProcessesByName("pythonw").Where(p => CommandLine(p.Id)?.Contains("iniciar.pyw", StringComparison.OrdinalIgnoreCase) == true
            && CommandLine(p.Id)?.Contains("relogio", StringComparison.OrdinalIgnoreCase) == true).ToArray();
        if (clocks.Length > 0)
        {
            string? exe = ImagePath(clocks[0].Id);
            var dll = System.Text.RegularExpressions.Regex.Match(CommandLine(clocks[0].Id) ?? "", "\"?([^\"]*RelogioMond\\.dll)\"?", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (exe != null && dll.Success) RunAndWait(exe, $"\"{dll.Groups[1].Value}\" --quit", 6000);
        }
        WaitOrKill(clocks, 4000);
        WaitOrKill(launchers, 3000);
    }

    public static void Start(string exe, string arguments, string workingDir, IDictionary<string, string>? env = null)
    {
        if (Paths.Sandbox) { Log.Write($"sandbox: would start {exe} {arguments}"); return; }
        var info = new ProcessStartInfo(exe, arguments) { UseShellExecute = false, WorkingDirectory = workingDir };
        if (env != null) foreach (var (k, v) in env) info.Environment[k] = v;
        Process.Start(info)?.Dispose();
    }

    static void RunAndWait(string exe, string arguments, int ms)
    {
        try
        {
            using var p = Process.Start(new ProcessStartInfo(exe, arguments) { UseShellExecute = false, CreateNoWindow = true });
            p?.WaitForExit(ms);
        }
        catch (Exception e) { Log.Write($"{exe} {arguments}: {e.Message}"); }
    }

    static void WaitOrKill(Process[] processes, int ms)
    {
        var until = DateTime.UtcNow.AddMilliseconds(ms);
        foreach (var p in processes)
        {
            try
            {
                int left = (int)Math.Max(0, (until - DateTime.UtcNow).TotalMilliseconds);
                if (!p.WaitForExit(left)) { p.Kill(entireProcessTree: false); p.WaitForExit(5000); }
            }
            catch { }
            finally { p.Dispose(); }
        }
    }

    const int PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;

    [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr OpenProcess(int access, bool inherit, int pid);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool QueryFullProcessImageNameW(IntPtr h, int flags, char[] name, ref int size);
    [DllImport("ntdll.dll")] static extern int NtQueryInformationProcess(IntPtr h, int infoClass, IntPtr info, int length, out int returned);

    [StructLayout(LayoutKind.Sequential)]
    struct UnicodeString { public ushort Length, MaximumLength; public IntPtr Buffer; }

    public static string? ImagePath(int pid)
    {
        IntPtr h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
        if (h == IntPtr.Zero) return null;
        try
        {
            var buffer = new char[1024];
            int size = buffer.Length;
            return QueryFullProcessImageNameW(h, 0, buffer, ref size) ? new string(buffer, 0, size) : null;
        }
        finally { CloseHandle(h); }
    }

    /// <summary>Another process's command line (ProcessCommandLineInformation, Windows 8.1 and later).</summary>
    public static string? CommandLine(int pid)
    {
        IntPtr h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid);
        if (h == IntPtr.Zero) return null;
        try
        {
            NtQueryInformationProcess(h, 60, IntPtr.Zero, 0, out int needed);
            if (needed <= 0) return null;
            IntPtr buf = Marshal.AllocHGlobal(needed);
            try
            {
                if (NtQueryInformationProcess(h, 60, buf, needed, out _) != 0) return null;
                var us = Marshal.PtrToStructure<UnicodeString>(buf);
                return us.Buffer == IntPtr.Zero ? null : Marshal.PtrToStringUni(us.Buffer, us.Length / 2);
            }
            finally { Marshal.FreeHGlobal(buf); }
        }
        finally { CloseHandle(h); }
    }
}
