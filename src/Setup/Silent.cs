using PacoteSetup.Core;

namespace PacoteSetup;

/// <summary>Install and uninstall with no window; progress goes to the log.</summary>
public static class Silent
{
    sealed class LogSink : IProgressSink
    {
        string _last = "";
        public void Component(ComponentId c, StepState state, string? detail) => Log.Write($"  {c}: {state} {detail}");

        public void Overall(double fraction, string text)
        {
            if (text == _last) return;
            _last = text;
            Log.Write($"  {fraction:P0} {text}");
        }
    }

    public static int Install(string self, string? optionsFile)
    {
        var payload = Payload.Open(self);
        if (payload == null) { Log.Write("silent install: no payload in " + self); return 4; }
        var options = optionsFile != null ? Json.Read<InstallOptions>(optionsFile) : new InstallOptions();
        if (options == null) { Log.Write("silent install: could not read " + optionsFile); return 3; }
        var installer = new Installer(payload, options, new UserRegistry(), new LogSink());
        installer.Run();
        foreach (var (c, e) in installer.Errors) Log.Write($"silent install: {c} failed: {e}");
        return installer.Errors.Count == 0 ? 0 : 1;
    }

    public static int Uninstall()
    {
        var state = InstalledState.Load();
        var which = Components.All.Where(state.Has).ToList();
        var u = new Uninstaller(new UserRegistry(), new LogSink());
        u.Run(which);
        return u.Errors.Count == 0 ? 0 : 1;
    }
}
