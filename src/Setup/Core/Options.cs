namespace PacoteSetup.Core;

public enum ComponentId { Ilha, Relogio, FundoVivo, Cursors }

public static class Components
{
    public static readonly ComponentId[] All = { ComponentId.Ilha, ComponentId.Relogio, ComponentId.FundoVivo, ComponentId.Cursors };

    /// <summary>The folder name inside the payload zip and the key in its manifest and in installed.json.</summary>
    public static string Key(ComponentId c) => c switch
    {
        ComponentId.Ilha => "ilha",
        ComponentId.Relogio => "relogio",
        ComponentId.FundoVivo => "fundovivo",
        _ => "cursors",
    };

    public static string Folder(ComponentId c) => c switch
    {
        ComponentId.Ilha => Paths.Ilha,
        ComponentId.Relogio => Paths.Relogio,
        ComponentId.FundoVivo => Paths.FundoVivo,
        _ => Paths.Cursors,
    };

    public static string Icon(ComponentId c) => c switch
    {
        ComponentId.Ilha => "ilha",
        ComponentId.Relogio => "relogio",
        ComponentId.FundoVivo => "fundovivo",
        _ => "cursores",
    };

    public static IEnumerable<Prerequisite> Needs(ComponentId c) => c switch
    {
        ComponentId.Ilha => new[] { Prerequisite.DesktopRuntime },
        ComponentId.Relogio => new[] { Prerequisite.DesktopRuntime, Prerequisite.Python },
        ComponentId.FundoVivo => new[] { Prerequisite.DesktopRuntime, Prerequisite.WebView2 },
        _ => Array.Empty<Prerequisite>(),
    };
}

/// <summary>Everything the person picks in the setup. Also the JSON of --install-silent.</summary>
public sealed class InstallOptions
{
    public bool Ilha { get; set; } = true;
    public bool Relogio { get; set; } = true;
    public bool FundoVivo { get; set; } = true;
    public bool Cursors { get; set; } = true;

    public bool IlhaStartup { get; set; } = true;
    /// <summary>false = floating a little below the top edge (the ilha's default); true = glued to the edge, like a notch.</summary>
    public bool IlhaDocked { get; set; }

    public bool RelogioStartup { get; set; } = true;
    public bool Relogio24h { get; set; } = true;
    public bool RelogioWeather { get; set; } = true;
    public string? CityLabel { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    /// <summary>"black", "white" or "none" (only listed in Mouse settings, nothing changes).</summary>
    public string CursorScheme { get; set; } = "black";

    public bool FundoVivoStartup { get; set; } = true;

    public bool StartMenu { get; set; } = true;
    public bool DesktopShortcuts { get; set; }
    public bool LaunchWhenDone { get; set; } = true;
    public bool InstallMissing { get; set; } = true;
    /// <summary>The language of the ilha and the clock: "auto" follows Windows, "pt" or "en" fix it.</summary>
    public string AppLanguage { get; set; } = "auto";

    public bool Wants(ComponentId c) => c switch
    {
        ComponentId.Ilha => Ilha,
        ComponentId.Relogio => Relogio,
        ComponentId.FundoVivo => FundoVivo,
        _ => Cursors,
    };

    public void Set(ComponentId c, bool on)
    {
        switch (c)
        {
            case ComponentId.Ilha: Ilha = on; break;
            case ComponentId.Relogio: Relogio = on; break;
            case ComponentId.FundoVivo: FundoVivo = on; break;
            default: Cursors = on; break;
        }
    }

    public IEnumerable<ComponentId> Selected => Components.All.Where(Wants);
}

public sealed class InstalledComponent
{
    public string Version { get; set; } = "";
    public string Folder { get; set; } = "";
    public DateTime Installed { get; set; }
}

/// <summary>installed.json next to Uninstall.exe: what this pack put on the PC, so the uninstaller takes only that.</summary>
public sealed class InstalledState
{
    public string Pack { get; set; } = "";
    public Dictionary<string, InstalledComponent> Components { get; set; } = new();

    public static InstalledState Load() => Json.Read<InstalledState>(Paths.StateFile) ?? new InstalledState();
    public void Save() => Json.Write(Paths.StateFile, this);
    public bool Has(ComponentId c) => Components.ContainsKey(PacoteSetup.Core.Components.Key(c));
}
