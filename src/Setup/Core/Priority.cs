using System.Diagnostics;
using System.Security;
using System.Text;

namespace PacoteSetup.Core;

/// <summary>
/// "Open first, with priority": a Task Scheduler task per app that starts it at the person's logon, ahead of the
/// Run queue Windows lets out bit by bit after sign-in, at priority 2 (above normal; a task's default is 7, below
/// normal). Made with schtasks from an XML, as the person, with no administrator (checked on 02/11/2026). The Run entry
/// stays: the three apps refuse a second copy, so the one the queue opens later just closes.
/// </summary>
public static class Priority
{
    public const int Level = 2;

    // the apps that start with Windows, by their Run value name
    public static readonly string[] RunNames = { "Ilha", "RelogioMond", "FundoVivo" };

    public static string TaskName(string runName) =>
        (Paths.Sandbox ? "PWB-Sandbox " : "Pacote Windows Bonito - ") + runName switch
        {
            "RelogioMond" => "Relogio Mond",
            "FundoVivo" => "Fundo Vivo",
            _ => runName,
        };

    /// <summary>Splits a Run command line into the program and the rest of the line, kept as written.</summary>
    public static (string Exe, string Args) Split(string command)
    {
        string c = command.Trim();
        if (c.StartsWith('"'))
        {
            int end = c.IndexOf('"', 1);
            if (end < 0) return (c.Trim('"'), "");
            return (c[1..end], c[(end + 1)..].Trim());
        }
        int space = c.IndexOf(' ');
        return space < 0 ? (c, "") : (c[..space], c[(space + 1)..].Trim());
    }

    static string User => $"{Environment.UserDomainName}\\{Environment.UserName}";

    public static string Xml(string command, string description)
    {
        var (exe, args) = Split(command);
        string E(string s) => SecurityElement.Escape(s) ?? "";
        string workingDir = Path.GetDirectoryName(exe) ?? "";
        return $"""
            <?xml version="1.0" encoding="UTF-16"?>
            <Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
              <RegistrationInfo>
                <Author>Pacote Windows Bonito</Author>
                <Description>{E(description)}</Description>
              </RegistrationInfo>
              <Triggers>
                <LogonTrigger>
                  <Enabled>true</Enabled>
                  <UserId>{E(User)}</UserId>
                </LogonTrigger>
              </Triggers>
              <Principals>
                <Principal id="Author">
                  <UserId>{E(User)}</UserId>
                  <LogonType>InteractiveToken</LogonType>
                  <RunLevel>LeastPrivilege</RunLevel>
                </Principal>
              </Principals>
              <Settings>
                <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
                <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
                <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
                <AllowHardTerminate>false</AllowHardTerminate>
                <StartWhenAvailable>false</StartWhenAvailable>
                <IdleSettings>
                  <StopOnIdleEnd>false</StopOnIdleEnd>
                  <RestartOnIdle>false</RestartOnIdle>
                </IdleSettings>
                <AllowStartOnDemand>true</AllowStartOnDemand>
                <Enabled>true</Enabled>
                <Hidden>false</Hidden>
                <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
                <Priority>{Level}</Priority>
              </Settings>
              <Actions Context="Author">
                <Exec>
                  <Command>{E(exe)}</Command>
                  <Arguments>{E(args)}</Arguments>
                  <WorkingDirectory>{E(workingDir)}</WorkingDirectory>
                </Exec>
              </Actions>
            </Task>
            """;
    }

    /// <summary>Creates or replaces the app's task. Returns null when it worked, or what schtasks said.</summary>
    public static string? Set(string runName, string command)
    {
        string xml = Path.Combine(Path.GetTempPath(), $"pwb-task-{Guid.NewGuid():N}.xml");
        try
        {
            // schtasks wants the XML in UTF-16, as its header says
            File.WriteAllText(xml, Xml(command, $"Opens {runName} at logon, ahead of the startup queue, above normal priority."), Encoding.Unicode);
            var (code, output) = Schtasks($"/create /tn \"{TaskName(runName)}\" /xml \"{xml}\" /f");
            Log.Write($"priority task {TaskName(runName)}: {(code == 0 ? "ok" : output)}");
            return code == 0 ? null : output;
        }
        finally { try { File.Delete(xml); } catch { } }
    }

    public static void Remove(string runName)
    {
        if (!Exists(runName)) return;
        var (code, output) = Schtasks($"/delete /tn \"{TaskName(runName)}\" /f");
        Log.Write($"priority task {TaskName(runName)} removed: {(code == 0 ? "ok" : output)}");
    }

    public static bool Exists(string runName) => Schtasks($"/query /tn \"{TaskName(runName)}\"").Code == 0;

    /// <summary>
    /// --prioridade ligar|desligar: the same for whatever is in Run right now, wherever the apps live (on his PC the
    /// clock and Fundo Vivo start from their project folders). Writes what it did to the log.
    /// </summary>
    public static int FromCurrentStartup(bool on, IUserRegistry reg)
    {
        int failed = 0;
        foreach (string name in RunNames)
        {
            if (!on) { Remove(name); continue; }
            if (reg.Get(RunEntry.Key, name) is not string command || command.Trim().Length == 0)
            {
                Log.Write($"priority: {name} does not start with Windows, no task");
                continue;
            }
            if (Set(name, command) != null) failed++;
        }
        return failed == 0 ? 0 : 1;
    }

    static (int Code, string Output) Schtasks(string args)
    {
        try
        {
            using var p = Process.Start(new ProcessStartInfo(Path.Combine(Environment.SystemDirectory, "schtasks.exe"), args)
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
            });
            if (p == null) return (-1, "schtasks did not start");
            string output = p.StandardOutput.ReadToEnd() + p.StandardError.ReadToEnd();
            p.WaitForExit();
            return (p.ExitCode, output.Trim());
        }
        catch (Exception e) { return (-1, e.Message); }
    }
}
