using System.IO.Compression;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Win32;
using DesktopGlowSetup.Core;

namespace DesktopGlowSetup;

/// <summary>--self-test: the parts that touch the PC, run against a dictionary registry and a temp folder.</summary>
public static class SelfTest
{
    public static int Run(string report)
    {
        var lines = new List<string>();
        int failed = 0;
        string temp = Path.Combine(Path.GetTempPath(), "desktopglow-selftest-" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(temp);

        void Test(string name, Action body)
        {
            try { body(); lines.Add("ok    " + name); }
            catch (Exception e) { failed++; lines.Add($"FAIL  {name}: {e.Message}"); }
        }

        Test("cursors: backup once, register, apply, uninstall restores", () => CursorRoundTrip(temp));
        Test("cursors: backup.json written by install.py is read back", () => PythonBackup(temp));
        Test("json merge keeps unknown keys", () => MergeKeeps(temp));
        Test("json merge replaces an unreadable file and keeps a .bak", () => MergeBroken(temp));
        Test("payload: glued zip is found, read and cut back to the exe", () => PayloadRoundTrip(temp));
        Test("run entry: only ours is removed", RunEntryOwnership);
        Test("shortcut: written, read back, removed only when ours", () => ShortcutOwnership(temp));
        Test("paths: inside checks", PathsInside);
        Test("priority: command split and task XML", PriorityTask);
        Test("text: every key exists in both languages", TextKeys);
        Test("shortcut names: one per language, both removable", ShortcutNamesBothLanguages);
        Test("components: five, each with its own key, folder and icon", ComponentsDistinct);

        try { Directory.Delete(temp, true); } catch { }
        lines.Add(failed == 0 ? "all passed" : $"{failed} failed");
        File.WriteAllText(report, string.Join(Environment.NewLine, lines) + Environment.NewLine, new UTF8Encoding(false));
        return failed == 0 ? 0 : 1;
    }

    static void ShortcutNamesBothLanguages()
    {
        foreach (var c in new[] { ComponentId.Ilha, ComponentId.Relogio, ComponentId.FundoVivo, ComponentId.GearHub })
        {
            string pt = Names.ShortcutName(c, false)!, en = Names.ShortcutName(c, true)!;
            Check(pt != en, $"{c}: same shortcut name in both languages");
            Check(Names.ShortcutNames(c).Count() == 2, $"{c}: uninstall does not look for both names");
        }
        Check(Names.ShortcutName(ComponentId.FundoVivo, true) == "Living Wallpaper.lnk", "English name of the Fundo Vivo shortcut");
        Check(Names.ShortcutName(ComponentId.GearHub, false) == "Central de Periféricos.lnk" && Names.ShortcutName(ComponentId.GearHub, true) == "Gear Hub.lnk", "Gear Hub shortcut names");
        Check(Names.RunValue(ComponentId.GearHub) == "GearHub" && Priority.RunNames.Contains("GearHub") && Priority.Label("GearHub") == "Gear Hub", "Gear Hub Run value and priority task");
        Check(Names.ShortcutNames(ComponentId.Cursors).Any() == false, "cursors have no shortcut");
    }

    static void ComponentsDistinct()
    {
        Check(Components.All.Length == 5, "five components");
        Check(Components.All.Select(Components.Key).Distinct().Count() == 5, "keys repeat");
        Check(Components.All.Select(Components.Folder).Distinct(StringComparer.OrdinalIgnoreCase).Count() == 5, "folders repeat");
        Check(Components.All.Select(Components.Icon).Distinct().Count() == 5, "icons repeat");
        Check(Components.Key(ComponentId.GearHub) == "gearhub" && Components.Folder(ComponentId.GearHub).EndsWith(@"\Programs\GearHub", StringComparison.OrdinalIgnoreCase), "Gear Hub key and folder");
        var o = new InstallOptions();
        o.Set(ComponentId.GearHub, false);
        Check(!o.Wants(ComponentId.GearHub) && o.Wants(ComponentId.Cursors), "turning Gear Hub off touched another app");
    }

    static void Check(bool condition, string what)
    {
        if (!condition) throw new Exception(what);
    }

    static CursorManifest FakeManifest() => new()
    {
        Version = "1.1.0",
        Order = new() { "Arrow", "Wait", "Hand" },
        Schemes = new()
        {
            ["black"] = new CursorScheme { Name = "Ilha preto", Files = new() { ["Arrow"] = "arrow.cur", ["Wait"] = "busy.ani", ["Hand"] = "link.ani" } },
            ["white"] = new CursorScheme { Name = "Ilha branco", Files = new() { ["Arrow"] = "arrow.cur", ["Wait"] = "busy.ani", ["Hand"] = "link.ani" } },
        },
    };

    static void CursorRoundTrip(string temp)
    {
        var reg = new MemoryRegistry();
        reg.Set(Cursors.CursorsKey, "Arrow", @"%SystemRoot%\cursors\aero_arrow.cur", RegistryValueKind.ExpandString);
        reg.Set(Cursors.CursorsKey, "", "Windows Default", RegistryValueKind.String);
        reg.Set(Cursors.CursorsKey, "Scheme Source", 2, RegistryValueKind.DWord);
        var m = FakeManifest();
        string target = Path.Combine(temp, "cursors1");
        string backup = Cursors.BackupFile(target);

        Cursors.SaveBackup(reg, m, backup);
        Cursors.Register(reg, m, target);
        Cursors.Apply(reg, m, "white", target, () => reg.Reloads++);
        Check(reg.Get(Cursors.CursorsKey, "Arrow") as string == Path.Combine(target, "white", "arrow.cur"), "arrow not applied");
        Check(reg.Get(Cursors.CursorsKey, "") as string == "Ilha branco", "scheme name not set");
        Check((int)reg.Get(Cursors.CursorsKey, "Scheme Source")! == 1, "scheme source not 1");
        Check(reg.Get(Cursors.SchemesKey, "Ilha preto") is string list && list.Split(',').Length == 3, "black scheme not registered");
        Check(Cursors.InUse(reg, target), "InUse should be true");

        // a second install must not overwrite the pointers from before the first one
        Cursors.SaveBackup(reg, m, backup);
        Check(File.ReadAllText(backup).Contains("aero_arrow"), "backup lost the original arrow");

        Cursors.Uninstall(reg, m, backup, () => reg.Reloads++);
        Check(reg.Get(Cursors.CursorsKey, "Arrow") as string == @"%SystemRoot%\cursors\aero_arrow.cur", "arrow not restored");
        Check(reg.Get(Cursors.CursorsKey, "Wait") as string == "", "a pointer with no backup should go back to the default");
        Check(reg.Get(Cursors.CursorsKey, "") as string == "Windows Default", "scheme name not restored");
        Check((int)reg.Get(Cursors.CursorsKey, "Scheme Source")! == 2, "scheme source not restored");
        Check(reg.Get(Cursors.SchemesKey, "Ilha preto") == null && reg.Get(Cursors.SchemesKey, "Ilha branco") == null, "schemes still listed");
        Check(reg.Reloads == 2, "reload count " + reg.Reloads);
    }

    static void PythonBackup(string temp)
    {
        // the exact shape json.dumps gives in ilha-cursors' install.py
        string target = Path.Combine(temp, "cursors2");
        Directory.CreateDirectory(target);
        File.WriteAllText(Cursors.BackupFile(target),
            "{\n  \"Arrow\": [\n    \"C:\\\\Windows\\\\cursors\\\\aero_arrow.cur\",\n    2\n  ],\n  \"\": [\n    \"Windows Default\",\n    1\n  ],\n  \"Scheme Source\": [\n    2,\n    4\n  ]\n}");
        var reg = new MemoryRegistry();
        Cursors.Uninstall(reg, FakeManifest(), Cursors.BackupFile(target), () => { });
        Check(reg.Get(Cursors.CursorsKey, "Arrow") as string == @"C:\Windows\cursors\aero_arrow.cur", "arrow from python backup");
        Check(reg.Keys[Cursors.CursorsKey]["Scheme Source"].Kind == RegistryValueKind.DWord, "dword kind");
    }

    static void MergeKeeps(string temp)
    {
        string file = Path.Combine(temp, "cfg", "config.json");
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        File.WriteAllText(file, "{ \"colada\": true, \"modulos\": { \"timer\": false }, // comentario\n \"tema\": \"x\", }");
        Json.Merge(file, new Dictionary<string, JsonNode?> { ["colada"] = false, ["language"] = "en" });
        var o = JsonNode.Parse(File.ReadAllText(file))!.AsObject();
        Check(o["colada"]!.GetValue<bool>() == false, "colada not set");
        Check(o["language"]!.GetValue<string>() == "en", "language not added");
        Check(o["modulos"]!["timer"]!.GetValue<bool>() == false && o["tema"]!.GetValue<string>() == "x", "other keys lost");
    }

    static void MergeBroken(string temp)
    {
        string file = Path.Combine(temp, "broken.json");
        File.WriteAllText(file, "{ not json");
        Json.Merge(file, new Dictionary<string, JsonNode?> { ["clima"] = true });
        Check(File.Exists(file + ".bak"), "no .bak");
        Check(JsonNode.Parse(File.ReadAllText(file))!["clima"]!.GetValue<bool>(), "value not written");
    }

    static void PayloadRoundTrip(string temp)
    {
        string exe = Path.Combine(temp, "fake.exe");
        var exeBytes = Encoding.ASCII.GetBytes("MZ fake executable body " + new string('x', 5000));
        File.WriteAllBytes(exe, exeBytes);
        string zipFile = Path.Combine(temp, "payload.zip");
        using (var zip = ZipFile.Open(zipFile, ZipArchiveMode.Create))
        {
            var e = zip.CreateEntry("manifest.json");
            using (var w = new StreamWriter(e.Open())) w.Write("{\"pack\":\"9.9.9\",\"components\":{\"ilha\":{\"version\":\"2.0.1\",\"bytes\":123}}}");
            var f = zip.CreateEntry("ilha/sub/hello.txt");
            using (var w = new StreamWriter(f.Open())) w.Write("hello");
            foreach (string n in new[] { "videos/ilha-en.mp4", "videos/ilha-en.jpg", "videos/ilha-pt.mp4" })
                using (var w = new StreamWriter(zip.CreateEntry(n).Open())) w.Write(n);
        }
        string glued = Path.Combine(temp, "glued.exe");
        Payload.Combine(exe, zipFile, glued);
        var p = Payload.Open(glued) ?? throw new Exception("payload not found");
        Check(p.Manifest.Pack == "9.9.9" && p.Manifest.Components["ilha"].Bytes == 123, "manifest");
        using (var z = p.OpenZip())
        using (var r = new StreamReader(z.GetEntry("ilha/sub/hello.txt")!.Open()))
            Check(r.ReadToEnd() == "hello", "entry content");
        var videos = p.ExtractVideos(new[] { "ilha", "relogio" }, "en", Path.Combine(temp, "videos"));
        Check(videos.Count == 1 && File.ReadAllText(videos[0].Video) == "videos/ilha-en.mp4" && File.Exists(videos[0].Poster), "videos: the English ilha video only");
        string cut = Path.Combine(temp, "cut.exe");
        p.WriteExecutable(cut);
        Check(File.ReadAllBytes(cut).AsSpan().SequenceEqual(exeBytes), "the cut exe differs from the original");
        Check(Payload.Open(exe) == null && Payload.Open(cut) == null, "a bare exe must have no payload");
    }

    static void RunEntryOwnership()
    {
        var reg = new MemoryRegistry();
        string ours = @"C:\Users\x\AppData\Local\Programs\RelogioMond";
        RunEntry.Set(reg, "RelogioMond", $"\"C:\\Python313\\pythonw.exe\" \"{ours}\\iniciar.pyw\"");
        RunEntry.Set(reg, "FundoVivo", "\"D:\\dev\\fundo-vivo\\app\\FundoVivo.exe\" --engine");
        Check(RunEntry.RemoveIfOurs(reg, "RelogioMond", ours), "ours not removed");
        Check(reg.Get(RunEntry.Key, "RelogioMond") == null, "still there");
        Check(!RunEntry.RemoveIfOurs(reg, "FundoVivo", @"C:\Users\x\AppData\Local\Programs\FundoVivo"), "someone else's entry was removed");
        Check(reg.Get(RunEntry.Key, "FundoVivo") != null, "someone else's entry is gone");
        Check(!RunEntry.PointsInto("\"C:\\Programs\\Ilha2\\Ilha.exe\"", @"C:\Programs\Ilha"), "prefix of a longer folder name matched");
    }

    static void ShortcutOwnership(string temp)
    {
        string folder = Path.Combine(temp, "app");
        Directory.CreateDirectory(folder);
        string exe = Path.Combine(folder, "App.exe");
        File.WriteAllText(exe, "");
        string lnk = Path.Combine(temp, "menu", "App.lnk");
        Shortcut.Create(lnk, exe, "--x", folder, exe, "test");
        var info = Shortcut.Read(lnk) ?? throw new Exception("shortcut not readable");
        Check(info.Target.Equals(exe, StringComparison.OrdinalIgnoreCase) && info.Arguments == "--x", $"read back {info.Target} {info.Arguments}");
        Check(!Shortcut.RemoveIfOurs(lnk, Path.Combine(temp, "other")), "removed a shortcut that is not ours");
        Check(Shortcut.RemoveIfOurs(lnk, folder) && !File.Exists(lnk), "ours not removed");
    }

    static void PathsInside()
    {
        Check(Paths.IsInside(@"C:\A\B\c.exe", @"C:\A\B"), "inside");
        Check(Paths.IsInside("\"C:/A/B/c.exe\"", @"C:\A\B\"), "quoted, forward slashes");
        Check(!Paths.IsInside(@"C:\A\BC\c.exe", @"C:\A\B"), "sibling with a longer name");
        Check(!Paths.IsInside(null, @"C:\A"), "null");
    }

    static void PriorityTask()
    {
        var a = Priority.Split("\"C:\\Program Files\\Python313\\pythonw.exe\" \"C:\\x y\\iniciar.pyw\"");
        Check(a.Exe == @"C:\Program Files\Python313\pythonw.exe" && a.Args == "\"C:\\x y\\iniciar.pyw\"", $"quoted split: {a.Exe} | {a.Args}");
        var b = Priority.Split("C:\\Apps\\FundoVivo.exe --engine");
        Check(b.Exe == @"C:\Apps\FundoVivo.exe" && b.Args == "--engine", "bare split");
        var c = Priority.Split("\"C:\\Ilha\\Ilha.exe\"");
        Check(c.Exe == @"C:\Ilha\Ilha.exe" && c.Args == "", "no arguments");
        string xml = Priority.Xml("\"C:\\A & B\\app.exe\" --x \"<y>\"", "test");
        Check(xml.StartsWith("<?xml", StringComparison.Ordinal), "the declaration must be the first thing");
        Check(xml.Contains("<Priority>2</Priority>") && xml.Contains("<LogonTrigger>") && xml.Contains("<ExecutionTimeLimit>PT0S</ExecutionTimeLimit>"), "task settings");
        Check(xml.Contains("C:\\A &amp; B\\app.exe") && xml.Contains("--x &quot;&lt;y&gt;&quot;") && xml.Contains("<WorkingDirectory>C:\\A &amp; B</WorkingDirectory>"), "escaping and working folder");
        var doc = new System.Xml.XmlDocument();
        doc.LoadXml(xml);  // throws if it is not well formed
    }

    static void TextKeys()
    {
        foreach (var c in Components.All)
            foreach (string k in new[] { "app.", "desc." })
                Check(Text.T(k + Components.Key(c)) != k + Components.Key(c), "missing " + k + Components.Key(c));
        foreach (var p in Enum.GetValues<Prerequisite>()) Check(Text.T("prereq." + p) != "prereq." + p, "missing prereq " + p);
    }
}
