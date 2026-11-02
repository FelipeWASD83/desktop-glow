namespace PacoteSetup.Core;

public static class Log
{
    static readonly object Gate = new();

    public static void Write(string text)
    {
        lock (Gate)
        {
            try
            {
                Directory.CreateDirectory(Path.GetDirectoryName(Paths.LogFile)!);
                File.AppendAllText(Paths.LogFile, $"{DateTime.Now:yyyy-MM-dd HH:mm:ss}  {text}{Environment.NewLine}");
            }
            catch { }
        }
    }
}
