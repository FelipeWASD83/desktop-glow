using System.Globalization;
using System.Net.Http;
using System.Text.Json;

namespace DesktopGlowSetup.Core;

public sealed record City(string Name, string Region, string Country, double Latitude, double Longitude)
{
    public string Label => string.Join(", ", new[] { Name, Region, Country }.Where(s => !string.IsNullOrWhiteSpace(s)).Distinct());
}

/// <summary>City search for the clock's weather, on Open-Meteo (the same service the clock already uses).</summary>
public static class Geocoding
{
    static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(10) };

    public static async Task<List<City>> SearchAsync(string query, string language)
    {
        string url = "https://geocoding-api.open-meteo.com/v1/search?count=6&format=json"
            + "&language=" + Uri.EscapeDataString(language) + "&name=" + Uri.EscapeDataString(query.Trim());
        using var doc = JsonDocument.Parse(await Http.GetStringAsync(url));
        var cities = new List<City>();
        if (!doc.RootElement.TryGetProperty("results", out var results)) return cities;
        foreach (var r in results.EnumerateArray())
        {
            string S(string name) => r.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() ?? "" : "";
            if (!r.TryGetProperty("latitude", out var lat) || !r.TryGetProperty("longitude", out var lon)) continue;
            cities.Add(new City(S("name"), S("admin1"), S("country"), lat.GetDouble(), lon.GetDouble()));
        }
        return cities;
    }

    public static string Coordinates(double lat, double lon) =>
        string.Format(CultureInfo.InvariantCulture, "{0:0.00}, {1:0.00}", lat, lon);
}
