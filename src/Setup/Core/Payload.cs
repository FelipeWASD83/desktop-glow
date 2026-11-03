using System.IO.Compression;
using System.Text;
using System.Text.Json;

namespace PacoteSetup.Core;

public sealed class PayloadComponent
{
    public string Version { get; set; } = "";
    public long Bytes { get; set; }
}

public sealed class PayloadManifest
{
    public string Pack { get; set; } = "";
    public Dictionary<string, PayloadComponent> Components { get; set; } = new();
}

/// <summary>
/// The four apps travel as one zip glued after the end of the setup's own executable:
/// [setup exe][zip][zip length, 8 bytes][magic, 8 bytes]. The bytes before the zip are exactly the executable that
/// ferramentas\build.ps1 checked against Smart App Control, and that is what becomes Uninstall.exe.
/// </summary>
public sealed class Payload
{
    public const string Magic = "PWBPAY01";
    const int TrailerSize = 16;

    public string File { get; }
    public long ExeLength { get; }
    public long ZipLength { get; }
    public PayloadManifest Manifest { get; }

    Payload(string file, long exeLength, long zipLength, PayloadManifest manifest)
    {
        File = file;
        ExeLength = exeLength;
        ZipLength = zipLength;
        Manifest = manifest;
    }

    /// <summary>The payload of this file, or null when it has none (the uninstaller, a bare build).</summary>
    public static Payload? Open(string file)
    {
        try
        {
            using var fs = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.Read);
            if (fs.Length < TrailerSize) return null;
            fs.Seek(-TrailerSize, SeekOrigin.End);
            var trailer = new byte[TrailerSize];
            fs.ReadExactly(trailer);
            if (Encoding.ASCII.GetString(trailer, 8, 8) != Magic) return null;
            long zipLength = BitConverter.ToInt64(trailer, 0);
            long exeLength = fs.Length - TrailerSize - zipLength;
            if (zipLength <= 0 || exeLength <= 0) return null;

            using var zip = new ZipArchive(new SubStream(fs, exeLength, zipLength, leaveOpen: true), ZipArchiveMode.Read);
            var entry = zip.GetEntry("manifest.json");
            if (entry == null) return null;
            using var s = entry.Open();
            var manifest = JsonSerializer.Deserialize<PayloadManifest>(s, Json.Options);
            return manifest == null ? null : new Payload(file, exeLength, zipLength, manifest);
        }
        catch (Exception e)
        {
            Log.Write("payload: " + e.Message);
            return null;
        }
    }

    public ZipArchive OpenZip()
    {
        var fs = new FileStream(File, FileMode.Open, FileAccess.Read, FileShare.Read);
        return new ZipArchive(new SubStream(fs, ExeLength, ZipLength, leaveOpen: false), ZipArchiveMode.Read);
    }

    /// <summary>
    /// The app videos of the setup (videos/&lt;app&gt;-&lt;lang&gt;.mp4 and .jpg in the zip) for these apps and language,
    /// written to a temp folder; apps whose video is missing are skipped.
    /// </summary>
    public List<(string Video, string Poster)> ExtractVideos(IEnumerable<string> apps, string language, string folder)
    {
        var found = new List<(string, string)>();
        Directory.CreateDirectory(folder);
        using var zip = OpenZip();
        foreach (string app in apps)
        {
            var video = zip.GetEntry($"videos/{app}-{language}.mp4") ?? zip.GetEntry($"videos\\{app}-{language}.mp4");
            if (video == null) continue;
            var poster = zip.GetEntry($"videos/{app}-{language}.jpg") ?? zip.GetEntry($"videos\\{app}-{language}.jpg");
            string mp4 = Path.Combine(folder, $"{app}-{language}.mp4"), jpg = Path.Combine(folder, $"{app}-{language}.jpg");
            if (!System.IO.File.Exists(mp4) || new FileInfo(mp4).Length != video.Length) video.ExtractToFile(mp4, overwrite: true);
            if (poster != null && (!System.IO.File.Exists(jpg) || new FileInfo(jpg).Length != poster.Length)) poster.ExtractToFile(jpg, overwrite: true);
            found.Add((mp4, jpg));
        }
        return found;
    }

    /// <summary>Writes the executable part alone, the same bytes Smart App Control already accepted.</summary>
    public void WriteExecutable(string target)
    {
        using var src = new FileStream(File, FileMode.Open, FileAccess.Read, FileShare.Read);
        using var dst = new FileStream(target, FileMode.Create, FileAccess.Write);
        CopyBytes(src, dst, ExeLength);
    }

    /// <summary>Glues a zip to an executable (used by the tests; the build does the same in PowerShell).</summary>
    public static void Combine(string exe, string zip, string output)
    {
        using var dst = new FileStream(output, FileMode.Create, FileAccess.Write);
        using (var e = System.IO.File.OpenRead(exe)) e.CopyTo(dst);
        long zipLength;
        using (var z = System.IO.File.OpenRead(zip)) { zipLength = z.Length; z.CopyTo(dst); }
        dst.Write(BitConverter.GetBytes(zipLength));
        dst.Write(Encoding.ASCII.GetBytes(Magic));
    }

    static void CopyBytes(Stream src, Stream dst, long count)
    {
        var buffer = new byte[1 << 20];
        while (count > 0)
        {
            int n = src.Read(buffer, 0, (int)Math.Min(buffer.Length, count));
            if (n <= 0) throw new EndOfStreamException();
            dst.Write(buffer, 0, n);
            count -= n;
        }
    }
}

/// <summary>A read-only window over part of another stream; ZipArchive needs it seekable.</summary>
public sealed class SubStream : Stream
{
    readonly Stream _inner;
    readonly long _start, _length;
    readonly bool _leaveOpen;
    long _position;

    public SubStream(Stream inner, long start, long length, bool leaveOpen)
    {
        _inner = inner;
        _start = start;
        _length = length;
        _leaveOpen = leaveOpen;
    }

    public override bool CanRead => true;
    public override bool CanSeek => true;
    public override bool CanWrite => false;
    public override long Length => _length;
    public override long Position { get => _position; set => _position = Math.Clamp(value, 0, _length); }

    public override int Read(byte[] buffer, int offset, int count)
    {
        long left = _length - _position;
        if (left <= 0) return 0;
        _inner.Position = _start + _position;
        int n = _inner.Read(buffer, offset, (int)Math.Min(count, left));
        _position += n;
        return n;
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        Position = origin switch
        {
            SeekOrigin.Begin => offset,
            SeekOrigin.Current => _position + offset,
            _ => _length + offset,
        };
        return _position;
    }

    public override void Flush() { }
    public override void SetLength(long value) => throw new NotSupportedException();
    public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();

    protected override void Dispose(bool disposing)
    {
        if (disposing && !_leaveOpen) _inner.Dispose();
        base.Dispose(disposing);
    }
}
