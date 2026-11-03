using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using DesktopGlowSetup.Core;

namespace DesktopGlowSetup.Ui;

/// <summary>
/// The app videos playing on the progress screen, one after the other in a loop, muted until the sound pill is
/// clicked. WPF plays them through the system's Windows Media Player; where it cannot (an N edition of Windows), the
/// poster of each video stays in its place.
/// </summary>
public sealed class VideoPanel : Grid
{
    readonly MediaElement _player = new() { LoadedBehavior = MediaState.Manual, UnloadedBehavior = MediaState.Stop, Stretch = Stretch.UniformToFill, IsMuted = true };
    readonly Image _poster = new() { Stretch = Stretch.UniformToFill };
    readonly Button _sound;
    readonly System.Windows.Shapes.Path _soundGlyph;
    List<(string Video, string Poster)> _list = new();
    int _index;
    bool _failed;

    public VideoPanel()
    {
        Background = Brushes.Black;
        Children.Add(_poster);
        Children.Add(_player);
        _player.MediaEnded += (_, _) => Next();
        _player.MediaOpened += (_, _) =>
        {
            _poster.Visibility = Visibility.Hidden;
            Log.Write($"video playing: {Path.GetFileName(_list[_index].Video)} ({_player.NaturalVideoWidth}x{_player.NaturalVideoHeight})");
        };
        _player.MediaFailed += (_, e) =>
        {
            Log.Write("video: " + e.ErrorException?.Message);
            _failed = true;
            _player.Visibility = Visibility.Collapsed;
            _poster.Visibility = Visibility.Visible;
        };

        _soundGlyph = new System.Windows.Shapes.Path { Stroke = Brushes.White, StrokeThickness = 1.6, StrokeLineJoin = PenLineJoin.Round, StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round, Width = 18, Height = 14, Stretch = Stretch.None };
        _sound = new Button
        {
            Width = 34,
            Height = 34,
            Padding = new Thickness(0),
            Background = new SolidColorBrush(Color.FromArgb(0xB0, 0, 0, 0)),
            HorizontalAlignment = HorizontalAlignment.Right,
            VerticalAlignment = VerticalAlignment.Bottom,
            Margin = new Thickness(0, 0, 12, 12),
            Content = _soundGlyph,
            Cursor = System.Windows.Input.Cursors.Hand,
        };
        _sound.Click += (_, _) =>
        {
            _player.IsMuted = !_player.IsMuted;
            DrawSoundGlyph();
        };
        System.Windows.Automation.AutomationProperties.SetName(_sound, Text.T("video.sound"));
        DrawSoundGlyph();
        Children.Add(_sound);

        SizeChanged += (_, _) => Clip = new RectangleGeometry(new Rect(0, 0, ActualWidth, ActualHeight), 22, 22);
    }

    public bool HasVideos => _list.Count > 0;

    public void Play(List<(string Video, string Poster)> list)
    {
        _list = list;
        _index = 0;
        Show();
    }

    /// <summary>The first poster only, with no playback (for --screenshot: a playing video does not render offscreen).</summary>
    public void ShowPoster(List<(string Video, string Poster)> list)
    {
        _list = list;
        _failed = true;
        _index = 0;
        Show();
    }

    void Next()
    {
        if (_list.Count == 0) return;
        _index = (_index + 1) % _list.Count;
        Show();
    }

    void Show()
    {
        if (_list.Count == 0) return;
        var (video, poster) = _list[_index];
        try
        {
            if (File.Exists(poster))
            {
                var bmp = new BitmapImage();
                bmp.BeginInit();
                bmp.UriSource = new Uri(poster);
                bmp.CacheOption = BitmapCacheOption.OnLoad;
                bmp.EndInit();
                _poster.Source = bmp;
            }
        }
        catch (Exception e) { Log.Write("poster: " + e.Message); }
        _poster.Visibility = Visibility.Visible;
        _sound.Visibility = _failed ? Visibility.Collapsed : Visibility.Visible;
        if (_failed) return;
        _player.Visibility = Visibility.Visible;
        _player.Source = new Uri(video);
        _player.Position = TimeSpan.Zero;
        _player.Play();
    }

    public void Stop()
    {
        _player.Stop();
        _player.Close();
    }

    void DrawSoundGlyph()
    {
        // a speaker, with waves when the sound is on and a cross when it is off
        string speaker = "M1,5 L4,5 L8,1.5 L8,12.5 L4,9 L1,9 Z";
        _soundGlyph.Data = Geometry.Parse(_player.IsMuted ? speaker + " M11,4.5 L16,9.5 M16,4.5 L11,9.5" : speaker + " M11,4.5 Q13,7 11,9.5 M13.5,2.5 Q17,7 13.5,11.5");
    }
}
