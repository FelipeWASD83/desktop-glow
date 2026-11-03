using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace DesktopGlowSetup.Core;

public static class Json
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    static readonly JsonDocumentOptions DocOptions = new() { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true };

    /// <summary>
    /// Sets some keys of an app's config file and keeps every other key as it was, so a reinstall never wipes the
    /// person's settings. A file that does not parse is kept aside as .bak and replaced.
    /// </summary>
    public static void Merge(string file, IReadOnlyDictionary<string, JsonNode?> values)
    {
        JsonObject root = new();
        if (File.Exists(file))
        {
            try
            {
                root = JsonNode.Parse(File.ReadAllText(file), documentOptions: DocOptions) as JsonObject ?? new JsonObject();
            }
            catch (JsonException)
            {
                File.Copy(file, file + ".bak", overwrite: true);
                Log.Write($"{file} did not parse; kept as .bak");
            }
        }
        foreach (var (key, value) in values) root[key] = value?.DeepClone();
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        File.WriteAllText(file, root.ToJsonString(new JsonSerializerOptions { WriteIndented = true }), new UTF8Encoding(false));
    }

    public static T? Read<T>(string file) where T : class
    {
        try { return File.Exists(file) ? JsonSerializer.Deserialize<T>(File.ReadAllText(file), Options) : null; }
        catch (Exception e) { Log.Write($"{file}: {e.Message}"); return null; }
    }

    public static void Write<T>(string file, T value)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(file)!);
        File.WriteAllText(file, JsonSerializer.Serialize(value, Options), new UTF8Encoding(false));
    }
}
