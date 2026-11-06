using System.Diagnostics;
using System.IO;
using System.Text.Json.Nodes;
using System.Windows;
using System.Windows.Automation;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Data;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using DesktopGlowSetup.Core;
using DesktopGlowSetup.Ui;
using Path = System.IO.Path;
using Shapes = System.Windows.Shapes;
using Cursors = DesktopGlowSetup.Core.Cursors;

namespace DesktopGlowSetup;

public enum Mode { Install, Uninstall, Broken }

enum PageId { Welcome, Pick, Options, Final, Progress, Uninstall, Broken }

public partial class MainWindow : Window, IProgressSink
{
    readonly Payload? _payload;
    readonly Mode _mode;
    readonly InstallOptions _o = new();
    readonly InstalledState _state = StateOverride ?? InstalledState.Load();
    /// <summary>Screenshots of the uninstaller use a made-up state instead of the PC's.</summary>
    internal static InstalledState? StateOverride;
    internal static bool ShutdownOnClose = true;
    readonly Dictionary<Prerequisite, bool> _prereqs = new();
    readonly Dictionary<PageId, FrameworkElement> _pages = new();
    readonly Dictionary<ComponentId, ToggleButton> _cards = new();
    readonly Dictionary<ComponentId, ToggleButton> _removeCards = new();
    readonly Dictionary<ComponentId, FrameworkElement> _sections = new();
    readonly Dictionary<ComponentId, ProgressRow> _rows = new();
    readonly HashSet<ComponentId> _toRemove = new();
    PageId _page;
    bool _running, _finished, _failed;
    VideoPanel _video = null!;

    // pieces that change after they are built
    StackPanel _prereqChips = null!, _summary = null!, _cityResults = null!;
    TextBlock _cityStatus = null!, _fundoNote = null!, _progressTitle = null!, _progressSub = null!;
    TextBlock _isleName = null!, _isleAction = null!, _islePercent = null!;
    Image _isleIcon = null!;
    Ring _isleRing = null!;
    TextBox _cityBox = null!;
    FrameworkElement _missingRow = null!, _cityRow = null!;
    TextBlock _missingSub = null!;
    Border _barFill = null!;
    Grid _barTrack = null!;
    double _fraction;
    ComponentId? _isleComponent;

    public MainWindow(Payload? payload, Mode mode)
    {
        _payload = payload;
        _mode = mode;
        InitializeComponent();
        foreach (var p in Enum.GetValues<Prerequisite>()) _prereqs[p] = Prerequisites.IsInstalled(p);
        Prefill();

        MinButton.ToolTip = Text.T("win.minimize");
        CloseButton.ToolTip = Text.T("win.close");
        AutomationProperties.SetName(MinButton, Text.T("win.minimize"));
        AutomationProperties.SetName(CloseButton, Text.T("win.close"));
        MinButton.Click += (_, _) => WindowState = WindowState.Minimized;
        CloseButton.Click += (_, _) => Close();
        BackButton.Click += (_, _) => Back();
        NextButton.Click += (_, _) => Next();
        TopBar.MouseLeftButtonDown += (_, e) => { if (e.ButtonState == MouseButtonState.Pressed) DragMove(); };
        Card.MouseLeftButtonDown += (_, e) => { if (e.OriginalSource == Card || e.OriginalSource is Grid) DragMove(); };

        if (mode == Mode.Install)
        {
            Add(PageId.Welcome, BuildWelcome());
            Add(PageId.Pick, BuildPick());
            Add(PageId.Options, BuildOptions());
            Add(PageId.Final, BuildFinal());
            Add(PageId.Progress, BuildProgress());
            for (int i = 0; i < 5; i++) Steps.Children.Add(new Border { Height = 6, Width = 6, CornerRadius = new CornerRadius(3), Margin = new Thickness(0, 0, 6, 0), Background = Brush("Line") });
        }
        else if (mode == Mode.Uninstall)
        {
            Add(PageId.Uninstall, BuildUninstall());
            Add(PageId.Progress, BuildProgress());
        }
        else Add(PageId.Broken, BuildBroken());

        _page = mode switch { Mode.Install => PageId.Welcome, Mode.Uninstall => PageId.Uninstall, _ => PageId.Broken };
        ShowPage(_page, forward: true, animate: false);
    }

    protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
    {
        if (_running) e.Cancel = true;
        base.OnClosing(e);
    }

    /// <summary>The selected apps' videos in the screen's language; they keep playing on the "all done" screen.</summary>
    void StartVideos(bool play)
    {
        if (_payload == null) return;
        try
        {
            var videos = _payload.ExtractVideos(_o.Selected.Select(Components.Icon), Text.Lang, Path.Combine(Path.GetTempPath(), "DesktopGlow", "videos"));
            if (videos.Count == 0) return;
            _video.Visibility = Visibility.Visible;
            if (play) _video.Play(videos); else _video.ShowPoster(videos);
        }
        catch (Exception e) { Log.Write("videos: " + e.Message); }
    }

    protected override void OnClosed(EventArgs e)
    {
        _video?.Stop();
        base.OnClosed(e);
        if (ShutdownOnClose) Application.Current.Shutdown(_failed ? 1 : 0);
    }

    /// <summary>On a reinstall, start from the choices already on the PC instead of the defaults.</summary>
    void Prefill()
    {
        try
        {
            if (File.Exists(Paths.IlhaConfig) && JsonNode.Parse(File.ReadAllText(Paths.IlhaConfig)) is JsonObject ilha)
            {
                if (ilha["colada"] is JsonValue c && c.TryGetValue(out bool docked)) _o.IlhaDocked = docked;
                if (ilha["iniciarComWindows"] is JsonValue s && s.TryGetValue(out bool start)) _o.IlhaStartup = start;
                if (ilha["language"] is JsonValue l && l.TryGetValue(out string? lang) && lang is "pt" or "en" or "auto") _o.AppLanguage = lang!;
            }
            string clock = Path.Combine(Paths.Relogio, "dados", "config.json");
            if (File.Exists(clock) && JsonNode.Parse(File.ReadAllText(clock)) is JsonObject r)
            {
                if (r["formato24h"] is JsonValue f && f.TryGetValue(out bool h24)) _o.Relogio24h = h24;
                if (r["clima"] is JsonValue w && w.TryGetValue(out bool weather)) _o.RelogioWeather = weather;
                if (r["iniciarComWindows"] is JsonValue s && s.TryGetValue(out bool start)) _o.RelogioStartup = start;
                if (r["latitude"] is JsonValue la && la.TryGetValue(out double lat) && r["longitude"] is JsonValue lo && lo.TryGetValue(out double lon))
                {
                    _o.Latitude = lat;
                    _o.Longitude = lon;
                    _o.CityLabel = Geocoding.Coordinates(lat, lon);
                }
            }
            if (File.Exists(Paths.GearHubConfig) && JsonNode.Parse(File.ReadAllText(Paths.GearHubConfig)) is JsonObject gear
                && gear["startWithWindows"] is JsonValue g && g.TryGetValue(out bool gearStart))
                _o.GearHubStartup = gearStart;
            var reg = new UserRegistry();
            if (Cursors.InUse(reg, Paths.Cursors))
                _o.CursorScheme = (reg.Get(Cursors.CursorsKey, "Arrow") as string)?.Contains(@"\white\", StringComparison.OrdinalIgnoreCase) == true ? "white" : "black";
            // a reinstall keeps the choice: with apps already installed, priority is on only if one of their tasks exists
            if (_state.Components.Count > 0 && Priority.RunNames.Any(n => reg.Get(RunEntry.Key, n) is string))
                _o.Priority = Priority.RunNames.Any(Priority.Exists);
            if (reg.Get(RunEntry.Key, "FundoVivo") is string fv && !RunEntry.PointsInto(fv, Paths.FundoVivo) && _state.Has(ComponentId.FundoVivo)) _o.FundoVivoStartup = false;
        }
        catch (Exception e) { Log.Write("prefill: " + e.Message); }
    }

    // ---------------------------------------------------------------- navigation

    void Add(PageId id, FrameworkElement page)
    {
        page.Visibility = Visibility.Collapsed;
        page.RenderTransform = new TranslateTransform();
        _pages[id] = page;
        PageHost.Children.Add(page);
    }

    void ShowPage(PageId id, bool forward, bool animate = true)
    {
        var old = _pages.GetValueOrDefault(_page);
        var next = _pages[id];
        double dir = forward ? 1 : -1;
        if (old != null && old != next)
        {
            if (animate)
            {
                var fade = new DoubleAnimation(0, TimeSpan.FromMilliseconds(130));
                fade.Completed += (_, _) => { if (_page != PageFor(old)) old.Visibility = Visibility.Collapsed; };
                old.BeginAnimation(OpacityProperty, fade);
                ((TranslateTransform)old.RenderTransform).BeginAnimation(TranslateTransform.XProperty, new DoubleAnimation(-28 * dir, TimeSpan.FromMilliseconds(130)));
                old.IsHitTestVisible = false;
            }
            else old.Visibility = Visibility.Collapsed;
        }
        _page = id;
        next.Visibility = Visibility.Visible;
        next.IsHitTestVisible = true;
        if (animate)
        {
            var ease = new CubicEase { EasingMode = EasingMode.EaseOut };
            next.BeginAnimation(OpacityProperty, new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(260)) { BeginTime = TimeSpan.FromMilliseconds(60) });
            ((TranslateTransform)next.RenderTransform).BeginAnimation(TranslateTransform.XProperty,
                new DoubleAnimation(36 * dir, 0, TimeSpan.FromMilliseconds(380)) { EasingFunction = ease, BeginTime = TimeSpan.FromMilliseconds(60) });
        }
        else
        {
            next.BeginAnimation(OpacityProperty, null);
            next.Opacity = 1;
            ((TranslateTransform)next.RenderTransform).BeginAnimation(TranslateTransform.XProperty, null);
            ((TranslateTransform)next.RenderTransform).X = 0;
        }
        OnPageShown(animate);
    }

    PageId PageFor(FrameworkElement page) => _pages.First(p => p.Value == page).Key;

    void OnPageShown(bool animate)
    {
        BackButton.Visibility = Visibility.Visible;
        NextButton.IsEnabled = true;
        CloseButton.IsEnabled = !_running;
        switch (_page)
        {
            case PageId.Welcome:
                BackButton.Visibility = Visibility.Collapsed;
                NextButton.Content = Text.T("btn.start");
                IsleTo(IsleIcons(Components.All, 18, null), animate);
                break;
            case PageId.Pick:
                BackButton.Content = Text.T("btn.back");
                NextButton.Content = Text.T("btn.next");
                RefreshPick(animate);
                break;
            case PageId.Options:
                BackButton.Content = Text.T("btn.back");
                NextButton.Content = Text.T("btn.next");
                foreach (var (c, s) in _sections) s.Visibility = _o.Wants(c) ? Visibility.Visible : Visibility.Collapsed;
                _fundoNote.Text = Text.T(_o.LaunchWhenDone ? "opt.fundoNote" : "opt.fundoNoteNoLaunch");
                IsleTo(IsleIcons(_o.Selected, 18, Text.T("island.options")), animate);
                break;
            case PageId.Final:
                BackButton.Content = Text.T("btn.back");
                NextButton.Content = Text.T("btn.install");
                RefreshFinal();
                IsleTo(IsleDot(Brush("Good"), $"{Text.T("island.ready")}  ·  {Text.Size(SelectedBytes())}"), animate);
                break;
            case PageId.Uninstall:
                BackButton.Visibility = Visibility.Collapsed;
                NextButton.Content = _state.Components.Count == 0 ? Text.T("btn.close") : Text.T("btn.uninstall");
                NextButton.IsEnabled = _state.Components.Count == 0 || _toRemove.Count > 0;
                IsleTo(IsleIcons(Components.All.Where(_state.Has), 18, Text.T("island.uninstall")), animate);
                break;
            case PageId.Broken:
                BackButton.Visibility = Visibility.Collapsed;
                NextButton.Content = Text.T("btn.close");
                IsleTo(IsleDot(Brush("Warn"), Text.T("broken.title")), animate);
                break;
            case PageId.Progress:
                BackButton.Visibility = Visibility.Collapsed;
                NextButton.Content = Text.T("btn.close");
                NextButton.IsEnabled = _finished;
                break;
        }
        // step pills: the current one is a wide white pill
        int index = _page switch { PageId.Welcome => 0, PageId.Pick => 1, PageId.Options => 2, PageId.Final => 3, PageId.Progress => 4, _ => -1 };
        Steps.Visibility = _mode == Mode.Install ? Visibility.Visible : Visibility.Collapsed;
        for (int i = 0; i < Steps.Children.Count; i++)
        {
            var pill = (Border)Steps.Children[i];
            double w = i == index ? 24 : 6;
            pill.Background = i == index ? Brush("Ink") : i < index ? Brush("Ink3") : Brush("Line");
            if (animate) pill.BeginAnimation(WidthProperty, new DoubleAnimation(w, TimeSpan.FromMilliseconds(300)) { EasingFunction = new BackEase { Amplitude = 0.4, EasingMode = EasingMode.EaseOut } });
            else { pill.BeginAnimation(WidthProperty, null); pill.Width = w; }
        }
    }

    void Back()
    {
        if (_page == PageId.Progress && _finished) { OpenLog(); return; }
        var prev = _page switch { PageId.Pick => PageId.Welcome, PageId.Options => PageId.Pick, PageId.Final => PageId.Options, _ => _page };
        if (prev != _page) ShowPage(prev, forward: false);
    }

    void Next()
    {
        switch (_page)
        {
            case PageId.Welcome: ShowPage(PageId.Pick, true); break;
            case PageId.Pick: ShowPage(PageId.Options, true); break;
            case PageId.Options: ShowPage(PageId.Final, true); break;
            case PageId.Final: StartInstall(); break;
            case PageId.Uninstall:
                if (_state.Components.Count == 0) Close();
                else StartUninstall();
                break;
            default: Close(); break;
        }
    }

    // ---------------------------------------------------------------- pages

    FrameworkElement BuildWelcome()
    {
        var stack = new StackPanel { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 0, 30) };
        stack.Children.Add(new TextBlock { Text = Text.T("welcome.title"), Style = Res("H1"), FontSize = 46, HorizontalAlignment = HorizontalAlignment.Center });
        stack.Children.Add(new TextBlock
        {
            Text = Text.T("welcome.sub"), Style = Res("Sub"), FontSize = 16, TextAlignment = TextAlignment.Center,
            MaxWidth = 560, Margin = new Thickness(0, 12, 0, 40), HorizontalAlignment = HorizontalAlignment.Center,
        });
        var row = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Center };
        foreach (var c in Components.All)
        {
            var tile = new StackPanel { Width = 150, Margin = new Thickness(6, 0, 6, 0) };
            tile.Children.Add(AppIcon(c, 84));
            tile.Children.Add(new TextBlock { Text = Text.T("app." + Components.Key(c)), Style = Res("H2"), FontSize = 15, HorizontalAlignment = HorizontalAlignment.Center, TextAlignment = TextAlignment.Center, TextWrapping = TextWrapping.Wrap, Margin = new Thickness(0, 12, 0, 0) });
            var version = _payload?.Manifest.Components.GetValueOrDefault(Components.Key(c))?.Version;
            if (version != null) tile.Children.Add(new TextBlock { Text = version, Style = Res("Small"), HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 2, 0, 0) });
            row.Children.Add(tile);
        }
        stack.Children.Add(row);
        stack.Children.Add(new TextBlock
        {
            Text = Text.T("welcome.foot", _payload?.Manifest.Pack ?? ""), Style = Res("Small"),
            HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 44, 0, 0),
        });
        return stack;
    }

    FrameworkElement BuildPick()
    {
        var dock = new DockPanel();
        var head = Header(Text.T("pick.title"), Text.T("pick.sub"));
        DockPanel.SetDock(head, Dock.Top);
        dock.Children.Add(head);

        _prereqChips = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(4, 14, 0, 0) };
        DockPanel.SetDock(_prereqChips, Dock.Bottom);
        dock.Children.Add(_prereqChips);

        var grid = new UniformGrid { Columns = 2 };
        foreach (var c in Components.All)
        {
            var info = _payload?.Manifest.Components.GetValueOrDefault(Components.Key(c));
            string meta = info == null ? "" : Text.T("card.meta", Text.Size(info.Bytes), info.Version);
            string? badge = _state.Has(c) ? Text.T("card.update") : null;
            var card = ComponentCard(c, meta, badge, _o.Wants(c));
            card.Checked += (_, _) => { _o.Set(c, true); RefreshPick(true); };
            card.Unchecked += (_, _) => { _o.Set(c, false); RefreshPick(true); };
            _cards[c] = card;
            grid.Children.Add(card);
        }
        dock.Children.Add(CardScroller(grid));
        return dock;
    }

    /// <summary>
    /// Two columns of cards, and with five apps a third row: they scroll, fading out at both edges like the options.
    /// </summary>
    static ScrollViewer CardScroller(UniformGrid grid)
    {
        grid.Margin = new Thickness(-8, 4, 6, 18);
        grid.VerticalAlignment = VerticalAlignment.Top;
        var scroll = new ScrollViewer { Content = grid, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Margin = new Thickness(0, 12, -14, 0), Focusable = false };
        var fade = new LinearGradientBrush { StartPoint = new Point(0, 0), EndPoint = new Point(0, 1) };
        fade.GradientStops.Add(new GradientStop(Colors.Transparent, 0));
        fade.GradientStops.Add(new GradientStop(Colors.Black, 0.02));
        fade.GradientStops.Add(new GradientStop(Colors.Black, 0.93));
        fade.GradientStops.Add(new GradientStop(Colors.Transparent, 1));
        scroll.OpacityMask = fade;
        return scroll;
    }

    void RefreshPick(bool animate)
    {
        int n = _o.Selected.Count();
        if (_page == PageId.Pick)
        {
            NextButton.IsEnabled = n > 0;
            IsleTo(n == 0 ? IsleDot(Brush("Warn"), Text.T("pick.none")) : IsleIcons(_o.Selected, 18, Text.T("island.selected", n, Components.All.Length)), animate);
        }
        _prereqChips.Children.Clear();
        foreach (var p in _o.Selected.SelectMany(Components.Needs).Distinct())
        {
            bool ok = _prereqs[p];
            _prereqChips.Children.Add(Chip(ok ? Brush("Good") : Brush("Warn"), Text.T(ok ? "pick.ready" : "pick.willInstall", Text.T("prereq." + p))));
        }
    }

    FrameworkElement BuildOptions()
    {
        var dock = new DockPanel();
        var head = Header(Text.T("opt.title"), Text.T("opt.sub"));
        DockPanel.SetDock(head, Dock.Top);
        dock.Children.Add(head);

        var list = new StackPanel { Margin = new Thickness(0, 0, 14, 8) };

        // ilha
        var ilha = SectionFor(ComponentId.Ilha);
        ilha.Add(Row(Text.T("opt.startup"), Text.T("opt.startupSub"), Switch(_o.IlhaStartup, v => _o.IlhaStartup = v)));
        ilha.Add(Row(Text.T("opt.ilhaPos"), Text.T("opt.ilhaPosSub"),
            Segment(new[] { (Text.T("opt.floating"), "float"), (Text.T("opt.docked"), "dock") }, _o.IlhaDocked ? "dock" : "float", v => _o.IlhaDocked = v == "dock")));
        list.Children.Add(ilha.Root);

        // clock
        var clock = SectionFor(ComponentId.Relogio);
        clock.Add(Row(Text.T("opt.startup"), Text.T("opt.startupSub"), Switch(_o.RelogioStartup, v => _o.RelogioStartup = v)));
        clock.Add(Row(Text.T("opt.clock"), Text.T("opt.clockSub"),
            Segment(new[] { ("24 h", "24"), ("12 h", "12") }, _o.Relogio24h ? "24" : "12", v => _o.Relogio24h = v == "24")));
        clock.Add(Row(Text.T("opt.weather"), Text.T("opt.weatherSub"), Switch(_o.RelogioWeather, v =>
        {
            _o.RelogioWeather = v;
            _cityRow.IsEnabled = v;
            _cityRow.Opacity = v ? 1 : 0.4;
        })));
        _cityBox = new TextBox { Width = 230, Tag = Text.T("opt.cityHint") };
        _cityBox.KeyDown += (_, e) => { if (e.Key == Key.Enter) _ = SearchCity(); };
        var search = new Button { Content = Text.T("btn.search"), Padding = new Thickness(18, 8, 18, 8), Margin = new Thickness(8, 0, 0, 0), FontSize = 13 };
        search.Click += (_, _) => _ = SearchCity();
        var cityControls = new StackPanel { Orientation = Orientation.Horizontal };
        cityControls.Children.Add(WithHint(_cityBox, Text.T("opt.cityHint")));
        cityControls.Children.Add(search);
        _cityStatus = new TextBlock { Style = Res("Small"), Margin = new Thickness(0, 3, 0, 0) };
        SetCityStatus(_o.CityLabel != null ? Text.T("opt.cityPicked", _o.CityLabel) : Text.T("opt.cityDefault"), _o.CityLabel != null);
        var cityText = new StackPanel();
        cityText.Children.Add(new TextBlock { Text = Text.T("opt.city"), FontSize = 14 });
        cityText.Children.Add(_cityStatus);
        _cityResults = new StackPanel { Orientation = Orientation.Vertical, Margin = new Thickness(0, 6, 0, 0) };
        var cityBlock = new StackPanel();
        cityBlock.Children.Add(RowRaw(cityText, cityControls));
        cityBlock.Children.Add(_cityResults);
        _cityRow = cityBlock;
        _cityRow.IsEnabled = _o.RelogioWeather;
        _cityRow.Opacity = _o.RelogioWeather ? 1 : 0.4;
        clock.Add(cityBlock);
        list.Children.Add(clock.Root);

        // cursors
        var cursors = SectionFor(ComponentId.Cursors);
        var tiles = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 4, 0, 4) };
        tiles.Children.Add(SchemeTile("black", Text.T("scheme.black"), "arrow-black"));
        tiles.Children.Add(SchemeTile("white", Text.T("scheme.white"), "arrow-white"));
        tiles.Children.Add(SchemeTile("none", Text.T("scheme.none"), null));
        var schemeText = new StackPanel();
        schemeText.Children.Add(new TextBlock { Text = Text.T("opt.scheme"), FontSize = 14 });
        schemeText.Children.Add(new TextBlock { Text = Text.T("opt.schemeSub"), Style = Res("Small"), Margin = new Thickness(0, 3, 0, 10) });
        var schemeBlock = new StackPanel { Margin = new Thickness(0, 12, 0, 6) };
        schemeBlock.Children.Add(schemeText);
        schemeBlock.Children.Add(tiles);
        cursors.Add(schemeBlock);
        list.Children.Add(cursors.Root);

        // wallpaper
        var fundo = SectionFor(ComponentId.FundoVivo);
        fundo.Add(Row(Text.T("opt.startup"), Text.T("opt.startupSub"), Switch(_o.FundoVivoStartup, v => _o.FundoVivoStartup = v)));
        _fundoNote = new TextBlock { Style = Res("Small"), FontSize = 12.5, Margin = new Thickness(0, 12, 0, 6) };
        fundo.Add(_fundoNote);
        list.Children.Add(fundo.Root);

        // gear hub
        var gear = SectionFor(ComponentId.GearHub);
        gear.Add(Row(Text.T("opt.startup"), Text.T("opt.gearStartupSub"), Switch(_o.GearHubStartup, v => _o.GearHubStartup = v)));
        list.Children.Add(gear.Root);

        var scroll = new ScrollViewer { Content = list, VerticalScrollBarVisibility = ScrollBarVisibility.Auto, Margin = new Thickness(0, 18, -14, 0), Focusable = false };
        // the list fades out at both edges instead of being cut by a hard line
        var fade = new LinearGradientBrush { StartPoint = new Point(0, 0), EndPoint = new Point(0, 1) };
        fade.GradientStops.Add(new GradientStop(Colors.Transparent, 0));
        fade.GradientStops.Add(new GradientStop(Colors.Black, 0.035));
        fade.GradientStops.Add(new GradientStop(Colors.Black, 0.94));
        fade.GradientStops.Add(new GradientStop(Colors.Transparent, 1));
        scroll.OpacityMask = fade;
        list.Margin = new Thickness(0, 10, 14, 24);
        dock.Children.Add(scroll);
        return dock;
    }

    FrameworkElement SchemeTile(string value, string label, string? image)
    {
        var content = new StackPanel { Width = 118 };
        var picture = new Grid { Height = 78 };
        if (image != null)
            picture.Children.Add(new Image { Source = Bitmap(image, 128), Width = 64, Height = 64, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center });
        else
            picture.Children.Add(new TextBlock { Text = Text.T("scheme.noneSub"), Style = Res("Small"), TextAlignment = TextAlignment.Center, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(6, 0, 6, 0) });
        content.Children.Add(picture);
        content.Children.Add(new TextBlock { Text = label, FontSize = 13.5, FontWeight = FontWeights.SemiBold, HorizontalAlignment = HorizontalAlignment.Center, Margin = new Thickness(0, 8, 0, 0) });
        var tile = new RadioButton { Style = Res("Tile"), Content = content, GroupName = "scheme", IsChecked = _o.CursorScheme == value, Margin = new Thickness(0, 0, 12, 0) };
        AutomationProperties.SetName(tile, label);
        tile.Checked += (_, _) => _o.CursorScheme = value;
        return tile;
    }

    async Task SearchCity()
    {
        string q = _cityBox.Text.Trim();
        if (q.Length < 2) return;
        SetCityStatus(Text.T("opt.citySearching"), false);
        _cityResults.Children.Clear();
        try
        {
            var cities = await Geocoding.SearchAsync(q, Text.Lang);
            if (cities.Count == 0) { SetCityStatus(Text.T("opt.cityNone"), false); return; }
            SetCityStatus(_o.CityLabel != null ? Text.T("opt.cityPicked", _o.CityLabel) : Text.T("opt.cityDefault"), _o.CityLabel != null);
            var wrap = new WrapPanel();
            foreach (var city in cities)
            {
                var b = new Button { Content = city.Label, FontSize = 12.5, FontWeight = FontWeights.Normal, Padding = new Thickness(14, 6, 14, 6), Margin = new Thickness(0, 0, 8, 8) };
                b.Click += (_, _) =>
                {
                    _o.CityLabel = city.Label;
                    _o.Latitude = city.Latitude;
                    _o.Longitude = city.Longitude;
                    SetCityStatus(Text.T("opt.cityPicked", city.Label), true);
                    _cityResults.Children.Clear();
                };
                wrap.Children.Add(b);
            }
            _cityResults.Children.Add(wrap);
        }
        catch (Exception e)
        {
            Log.Write("city search: " + e.Message);
            SetCityStatus(Text.T("opt.cityError"), false);
        }
    }

    void SetCityStatus(string text, bool picked)
    {
        _cityStatus.Text = text;
        _cityStatus.Foreground = picked ? Brush("Good") : Brush("Ink3");
    }

    FrameworkElement BuildFinal()
    {
        var dock = new DockPanel();
        var head = Header(Text.T("final.title"), Text.T("final.sub"));
        DockPanel.SetDock(head, Dock.Top);
        dock.Children.Add(head);

        var grid = new Grid { Margin = new Thickness(0, 18, 0, 0) };
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1.15, GridUnitType.Star) });
        grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(18) });
        grid.ColumnDefinitions.Add(new ColumnDefinition());

        var general = new StackPanel();
        general.Children.Add(new TextBlock { Text = Text.T("final.general"), Style = Res("H2"), Margin = new Thickness(0, 4, 0, 4) });
        general.Children.Add(Row(Text.T("final.startMenu"), null, Switch(_o.StartMenu, v => _o.StartMenu = v)));
        general.Children.Add(Row(Text.T("final.desktop"), null, Switch(_o.DesktopShortcuts, v => _o.DesktopShortcuts = v)));
        general.Children.Add(Row(Text.T("final.launch"), null, Switch(_o.LaunchWhenDone, v => _o.LaunchWhenDone = v)));
        general.Children.Add(Row(Text.T("final.priority"), Text.T("final.prioritySub"), Switch(_o.Priority, v => _o.Priority = v)));
        general.Children.Add(Row(Text.T("final.lang"), Text.T("final.langSub"),
            Segment(new[] { (Text.T("lang.auto"), "auto"), ("PT", "pt"), ("EN", "en") }, _o.AppLanguage, v => _o.AppLanguage = v)));
        _missingSub = new TextBlock { Style = Res("Small"), Margin = new Thickness(0, 3, 0, 0) };
        var missingText = new StackPanel();
        missingText.Children.Add(new TextBlock { Text = Text.T("final.missing"), FontSize = 14 });
        missingText.Children.Add(_missingSub);
        _missingRow = RowRaw(missingText, Switch(_o.InstallMissing, v => _o.InstallMissing = v));
        general.Children.Add(_missingRow);
        var left = new Border { Style = Res("Section"), Child = general };
        grid.Children.Add(left);

        _summary = new StackPanel();
        var right = new Border { Style = Res("Section"), Child = _summary };
        Grid.SetColumn(right, 2);
        grid.Children.Add(right);
        dock.Children.Add(grid);
        return dock;
    }

    void RefreshFinal()
    {
        var missing = _o.Selected.SelectMany(Components.Needs).Distinct().Where(p => !_prereqs[p]).ToList();
        _missingRow.Visibility = missing.Count > 0 ? Visibility.Visible : Visibility.Collapsed;
        _missingSub.Text = Text.T("final.missingSub", string.Join(", ", missing.Select(p => Text.T("prereq." + p))));

        _summary.Children.Clear();
        _summary.Children.Add(new TextBlock { Text = Text.T("final.summary"), Style = Res("H2"), Margin = new Thickness(0, 4, 0, 10) });
        foreach (var c in _o.Selected)
        {
            var info = _payload?.Manifest.Components.GetValueOrDefault(Components.Key(c));
            var g = new Grid { Margin = new Thickness(0, 6, 0, 6) };
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            g.ColumnDefinitions.Add(new ColumnDefinition());
            g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            g.Children.Add(AppIcon(c, 32));
            var name = new StackPanel { Margin = new Thickness(12, 0, 0, 0), VerticalAlignment = VerticalAlignment.Center };
            name.Children.Add(new TextBlock { Text = Text.T("app." + Components.Key(c)), FontSize = 14, FontWeight = FontWeights.SemiBold });
            name.Children.Add(new TextBlock { Text = info?.Version ?? "", Style = Res("Small") });
            Grid.SetColumn(name, 1);
            g.Children.Add(name);
            var size = new TextBlock { Text = info == null ? "" : Text.Size(info.Bytes), Style = Res("Sub"), FontSize = 13, VerticalAlignment = VerticalAlignment.Center };
            Grid.SetColumn(size, 2);
            g.Children.Add(size);
            _summary.Children.Add(g);
        }
        _summary.Children.Add(new Border { Height = 1, Background = Brush("Line"), Margin = new Thickness(0, 10, 0, 10) });
        var total = new Grid();
        total.Children.Add(new TextBlock { Text = Text.T("final.total"), FontSize = 14, FontWeight = FontWeights.SemiBold });
        total.Children.Add(new TextBlock { Text = Text.Size(SelectedBytes()), FontSize = 14, FontWeight = FontWeights.SemiBold, HorizontalAlignment = HorizontalAlignment.Right });
        _summary.Children.Add(total);
        _summary.Children.Add(new TextBlock { Text = Text.T("final.where", Paths.Programs), Style = Res("Small"), Margin = new Thickness(0, 10, 0, 0) });
    }

    long SelectedBytes() => _o.Selected.Sum(c => _payload?.Manifest.Components.GetValueOrDefault(Components.Key(c))?.Bytes ?? 0);

    FrameworkElement BuildProgress()
    {
        var stack = new StackPanel();
        _progressTitle = new TextBlock { Style = Res("H1") };
        _progressSub = new TextBlock { Style = Res("Sub"), Margin = new Thickness(0, 6, 0, 0), MinHeight = 20 };
        stack.Children.Add(_progressTitle);
        stack.Children.Add(_progressSub);

        var rows = new StackPanel();
        foreach (var c in Components.All)
        {
            var row = new ProgressRow(this, c);
            _rows[c] = row;
            rows.Children.Add(row.Root);
        }
        // the app videos on the left, the list on the right; with no video the list takes the whole width
        var middle = new Grid { Margin = new Thickness(0, 22, 0, 0) };
        middle.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        middle.ColumnDefinitions.Add(new ColumnDefinition());
        _video = new VideoPanel { Width = 464, Height = 261, Margin = new Thickness(0, 0, 18, 0), VerticalAlignment = VerticalAlignment.Top, Visibility = Visibility.Collapsed };
        middle.Children.Add(_video);
        var list = new Border { Style = Res("Section"), Child = rows, Padding = new Thickness(22, 8, 22, 8), VerticalAlignment = VerticalAlignment.Top };
        Grid.SetColumn(list, 1);
        middle.Children.Add(list);
        stack.Children.Add(middle);

        _barTrack = new Grid { Height = 8, Margin = new Thickness(0, 22, 0, 0) };
        _barTrack.Children.Add(new Border { CornerRadius = new CornerRadius(4), Background = Brush("Well") });
        _barFill = new Border { CornerRadius = new CornerRadius(4), Background = Brush("Ink"), HorizontalAlignment = HorizontalAlignment.Left, Width = 0 };
        _barTrack.Children.Add(_barFill);
        _barTrack.SizeChanged += (_, _) => SetBar(_fraction, animate: false);
        stack.Children.Add(_barTrack);
        return stack;
    }

    FrameworkElement BuildUninstall()
    {
        var dock = new DockPanel();
        var head = Header(Text.T("uninstall.title"), _state.Components.Count == 0 ? Text.T("uninstall.nothing") : Text.T("uninstall.sub"));
        DockPanel.SetDock(head, Dock.Top);
        dock.Children.Add(head);
        var grid = new UniformGrid { Columns = 2 };
        foreach (var c in Components.All.Where(_state.Has))
        {
            _toRemove.Add(c);
            var card = ComponentCard(c, Text.T("card.installed", _state.Components[Components.Key(c)].Version), null, true);
            card.Checked += (_, _) => { _toRemove.Add(c); NextButton.IsEnabled = true; };
            card.Unchecked += (_, _) => { _toRemove.Remove(c); NextButton.IsEnabled = _toRemove.Count > 0; };
            _removeCards[c] = card;
            grid.Children.Add(card);
        }
        dock.Children.Add(CardScroller(grid));
        return dock;
    }

    FrameworkElement BuildBroken() => Header(Text.T("broken.title"), Text.T("broken.sub"));

    // ---------------------------------------------------------------- running

    void StartInstall()
    {
        if (_payload == null) return;
        _running = true;
        _progressTitle.Text = Text.T("progress.title");
        _progressSub.Text = "";
        foreach (var (c, row) in _rows) row.Set(_o.Wants(c) ? StepState.Waiting : StepState.Skipped, null, uninstall: false);
        ShowPage(PageId.Progress, true);
        IsleProgress(_o.Selected.First(), animate: true);
        StartVideos(play: true);
        var options = _o;
        var payload = _payload;
        Task.Run(() =>
        {
            var installer = new Installer(payload, options, new UserRegistry(), this);
            try { installer.Run(); }
            catch (Exception e) { Log.Write("install: " + e); installer.Errors[options.Selected.First()] = e.Message; }
            Dispatcher.BeginInvoke(() => Finish(installer.Errors.Count > 0, uninstall: false));
        });
    }

    void StartUninstall()
    {
        _running = true;
        _progressTitle.Text = Text.T("progress.uninstallTitle");
        _progressSub.Text = "";
        foreach (var (c, row) in _rows) row.Set(_toRemove.Contains(c) ? StepState.Waiting : StepState.Skipped, null, uninstall: true);
        ShowPage(PageId.Progress, true);
        var which = Components.All.Where(_toRemove.Contains).ToList();
        IsleProgress(which.First(), animate: true);
        Task.Run(() =>
        {
            var u = new Uninstaller(new UserRegistry(), this);
            try { u.Run(which); }
            catch (Exception e) { Log.Write("uninstall: " + e); u.Errors[which.First()] = e.Message; }
            Dispatcher.BeginInvoke(() => Finish(u.Errors.Count > 0, uninstall: true));
        });
    }

    void Finish(bool failed, bool uninstall, bool animate = true)
    {
        _running = false;
        _finished = true;
        _failed = failed;
        SetBar(1, animate);
        _progressTitle.Text = failed ? Text.T("done.errorTitle") : uninstall ? Text.T("uninstall.doneTitle") : Text.T("done.title");
        _progressSub.Text = failed ? Text.T("done.errorSub") : uninstall ? Text.T("uninstall.doneSub") : Text.T("done.sub");
        IsleTo(failed ? IsleDot(Brush("Warn"), Text.T("progress.doneWithErrors")) : IsleCheck(uninstall ? Text.T("progress.removed") : Text.T("progress.done")), animate, 44);
        CloseButton.IsEnabled = true;
        NextButton.IsEnabled = true;
        NextButton.Content = Text.T("btn.close");
        BackButton.Visibility = failed ? Visibility.Visible : Visibility.Collapsed;
        BackButton.Content = Text.T("btn.log");
    }

    static void OpenLog()
    {
        try { Process.Start(new ProcessStartInfo(Paths.LogFile) { UseShellExecute = true })?.Dispose(); }
        catch (Exception e) { Log.Write("open log: " + e.Message); }
    }

    public void Component(ComponentId c, StepState state, string? detail) => Dispatcher.BeginInvoke(() =>
    {
        _rows[c].Set(state, detail, uninstall: _mode == Mode.Uninstall);
        if (state == StepState.Running && _isleComponent != c) IsleProgress(c, animate: true);
    });

    public void Overall(double fraction, string text) => Dispatcher.BeginInvoke(() => ApplyOverall(fraction, text, animate: true));

    void ApplyOverall(double fraction, string text, bool animate)
    {
        _progressSub.Text = text;
        SetBar(fraction, animate);
        if (_isleRing != null) _isleRing.Value = fraction;
        if (_islePercent != null) _islePercent.Text = $"{Math.Round(fraction * 100)}";
        if (_isleAction != null)
            _isleAction.Text = _isleComponent is ComponentId c && text == Text.T("progress.installing", Text.T("app." + Components.Key(c)))
                ? Text.T(_mode == Mode.Uninstall ? "island.removing" : "island.copying") : text;
    }

    /// <summary>Puts the window in one made-up moment, with every motion finished (for --screenshot).</summary>
    internal void Scenario(string name)
    {
        void Rows(params StepState[] states)
        {
            for (int i = 0; i < Components.All.Length; i++) _rows[Components.All[i]].Set(states[i], null, _mode == Mode.Uninstall);
        }
        switch (name)
        {
            case "welcome": ShowPage(PageId.Welcome, true, false); break;
            case "pick": ShowPage(PageId.Pick, true, false); break;
            case "pick-end":
                ShowPage(PageId.Pick, true, false);
                UpdateLayout();
                FindChild<ScrollViewer>(_pages[PageId.Pick])?.ScrollToEnd();
                break;
            case "options":
            case "options-mid":
            case "options-end":
                ShowPage(PageId.Options, true, false);
                var scroll = FindChild<ScrollViewer>(_pages[PageId.Options]);
                UpdateLayout();
                if (name == "options-end") scroll?.ScrollToEnd();
                else if (name == "options-mid") scroll?.ScrollToVerticalOffset(400);
                else scroll?.ScrollToHome();
                break;
            case "final": ShowPage(PageId.Final, true, false); break;
            case "progress":
                _progressTitle.Text = Text.T("progress.title");
                Rows(StepState.Done, StepState.Running, StepState.Waiting, StepState.Waiting, StepState.Waiting);
                ShowPage(PageId.Progress, true, false);
                StartVideos(play: false);
                IsleProgress(ComponentId.Relogio, animate: false);
                ApplyOverall(0.46, Text.T("progress.installing", Text.T("app.relogio")), animate: false);
                break;
            case "done":
                Rows(StepState.Done, StepState.Done, StepState.Done, StepState.Done, StepState.Done);
                ShowPage(PageId.Progress, true, false);
                Finish(false, _mode == Mode.Uninstall, animate: false);
                break;
            case "done-error":
                Rows(StepState.Done, StepState.Failed, StepState.Done, StepState.Done, StepState.Done);
                _rows[ComponentId.Relogio].Set(StepState.Failed, Text.T("error.missing", Text.T("prereq.Python")), false);
                ShowPage(PageId.Progress, true, false);
                Finish(true, false, animate: false);
                break;
            case "uninstall": ShowPage(PageId.Uninstall, true, false); break;
            case "broken": ShowPage(PageId.Broken, true, false); break;
        }
        _running = false;
        Isle.Snap();
    }

    static T? FindChild<T>(DependencyObject root) where T : DependencyObject
    {
        for (int i = 0; i < VisualTreeHelper.GetChildrenCount(root); i++)
        {
            var child = VisualTreeHelper.GetChild(root, i);
            if (child is T t) return t;
            if (FindChild<T>(child) is T found) return found;
        }
        return null;
    }

    void SetBar(double fraction, bool animate)
    {
        _fraction = fraction;
        double w = Math.Max(0, _barTrack.ActualWidth * fraction);
        if (animate) _barFill.BeginAnimation(WidthProperty, new DoubleAnimation(w, TimeSpan.FromMilliseconds(250)));
        else { _barFill.BeginAnimation(WidthProperty, null); _barFill.Width = w; }
    }

    // ---------------------------------------------------------------- the island's contents

    void IsleTo(FrameworkElement content, bool animate, double height = 36)
    {
        content.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
        double width = Math.Max(height * 2.6, content.DesiredSize.Width + height * 0.9);
        Isle.Morph(width, height, content, animate);
        if (!ReferenceEquals(content.Tag, "progress")) _isleComponent = null;
    }

    FrameworkElement IsleIcons(IEnumerable<ComponentId> which, double size, string? text)
    {
        var row = new StackPanel { Orientation = Orientation.Horizontal };
        foreach (var c in which) row.Children.Add(AppIcon(c, size, new Thickness(0, 0, 5, 0)));
        if (text != null) row.Children.Add(new TextBlock { Text = text, Foreground = Brushes.White, FontSize = 13, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(5, 0, 0, 0) });
        return row;
    }

    FrameworkElement IsleDot(Brush color, string text)
    {
        var row = new StackPanel { Orientation = Orientation.Horizontal };
        row.Children.Add(new Ellipse { Width = 9, Height = 9, Fill = color, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 9, 0) });
        row.Children.Add(new TextBlock { Text = text, Foreground = Brushes.White, FontSize = 13, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center });
        return row;
    }

    FrameworkElement IsleCheck(string text)
    {
        var row = new StackPanel { Orientation = Orientation.Horizontal };
        var badge = new Grid { Width = 22, Height = 22, Margin = new Thickness(0, 0, 10, 0) };
        badge.Children.Add(new Ellipse { Fill = Brush("Good") });
        badge.Children.Add(new Shapes.Path { Data = Geometry.Parse("M6.5,11.5 L9.8,14.6 L15.8,7.8"), Stroke = Brushes.White, StrokeThickness = 2.2, StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round, StrokeLineJoin = PenLineJoin.Round });
        row.Children.Add(badge);
        row.Children.Add(new TextBlock { Text = text, Foreground = Brushes.White, FontSize = 14, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center });
        return row;
    }

    /// <summary>The expanded island while something installs: app icon, what it is doing, a ring with the percent.</summary>
    void IsleProgress(ComponentId c, bool animate)
    {
        _isleComponent = c;
        var g = new Grid { Width = 400, Tag = "progress" };
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        _isleIcon = AppIcon(c, 38);
        g.Children.Add(_isleIcon);
        var text = new StackPanel { VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(12, 0, 12, 0) };
        _isleName = new TextBlock { Text = Text.T("app." + Components.Key(c)), Foreground = Brushes.White, FontSize = 14, FontWeight = FontWeights.SemiBold };
        _isleAction = new TextBlock { Text = Text.T(_mode == Mode.Uninstall ? "island.removing" : "island.copying"), Foreground = Brush("Ink2"), FontSize = 12, TextTrimming = TextTrimming.CharacterEllipsis };
        text.Children.Add(_isleName);
        text.Children.Add(_isleAction);
        Grid.SetColumn(text, 1);
        g.Children.Add(text);
        var ring = new Grid { Width = 38, Height = 38 };
        _isleRing = new Ring { Thickness = 3.5, Stroke = Brush("Good"), Value = _fraction };
        _islePercent = new TextBlock { Text = $"{Math.Round(_fraction * 100)}", Foreground = Brushes.White, FontSize = 11, FontWeight = FontWeights.SemiBold, HorizontalAlignment = HorizontalAlignment.Center, VerticalAlignment = VerticalAlignment.Center };
        ring.Children.Add(_isleRing);
        ring.Children.Add(_islePercent);
        Grid.SetColumn(ring, 2);
        g.Children.Add(ring);
        Isle.Morph(440, 64, g, animate);
    }

    // ---------------------------------------------------------------- building blocks

    ToggleButton ComponentCard(ComponentId c, string meta, string? badge, bool on)
    {
        var card = new ToggleButton { Style = Res("Card"), IsChecked = on, Margin = new Thickness(8), Height = 150 };
        AutomationProperties.SetName(card, Text.T("app." + Components.Key(c)));
        var g = new Grid();
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        var icon = AppIcon(c, 64);
        icon.VerticalAlignment = VerticalAlignment.Top;
        g.Children.Add(icon);

        var text = new StackPanel { Margin = new Thickness(16, 0, 12, 0) };
        text.Children.Add(new TextBlock { Text = Text.T("app." + Components.Key(c)), Style = Res("H2"), FontSize = 18 });
        text.Children.Add(new TextBlock { Text = Text.T("desc." + Components.Key(c)), Style = Res("Sub"), FontSize = 13, Margin = new Thickness(0, 4, 0, 0) });
        text.Children.Add(new TextBlock { Text = meta, Style = Res("Small"), Margin = new Thickness(0, 8, 0, 0) });
        if (badge != null) text.Children.Add(new TextBlock { Text = badge, Style = Res("Small"), Foreground = Brush("Good"), Margin = new Thickness(0, 2, 0, 0) });
        Grid.SetColumn(text, 1);
        g.Children.Add(text);

        // the switch only shows the card's state; the whole card is what toggles
        var sw = new CheckBox { IsHitTestVisible = false, Focusable = false, VerticalAlignment = VerticalAlignment.Top };
        sw.SetBinding(ToggleButton.IsCheckedProperty, new Binding(nameof(ToggleButton.IsChecked)) { Source = card });
        Grid.SetColumn(sw, 2);
        g.Children.Add(sw);
        card.Content = g;
        return card;
    }

    sealed class Section
    {
        public readonly Border Root;
        readonly StackPanel _body;

        public Section(MainWindow w, ComponentId c)
        {
            _body = new StackPanel();
            var head = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 2, 0, 6) };
            head.Children.Add(w.AppIcon(c, 34));
            head.Children.Add(new TextBlock { Text = Text.T("app." + Components.Key(c)), Style = w.Res("H2"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(12, 0, 0, 0) });
            _body.Children.Add(head);
            Root = new Border { Style = w.Res("Section"), Child = _body, Margin = new Thickness(0, 0, 0, 14) };
        }

        public void Add(UIElement row) => _body.Children.Add(row);
    }

    Section SectionFor(ComponentId c)
    {
        var s = new Section(this, c);
        _sections[c] = s.Root;
        return s;
    }

    FrameworkElement Header(string title, string sub)
    {
        var s = new StackPanel();
        s.Children.Add(new TextBlock { Text = title, Style = Res("H1") });
        s.Children.Add(new TextBlock { Text = sub, Style = Res("Sub"), Margin = new Thickness(0, 6, 0, 0) });
        return s;
    }

    FrameworkElement Row(string title, string? sub, UIElement control)
    {
        var text = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
        text.Children.Add(new TextBlock { Text = title, FontSize = 14 });
        if (sub != null) text.Children.Add(new TextBlock { Text = sub, Style = Res("Small"), Margin = new Thickness(0, 3, 0, 0) });
        return RowRaw(text, control);
    }

    static FrameworkElement RowRaw(FrameworkElement text, UIElement control)
    {
        var g = new Grid { Margin = new Thickness(0, 10, 0, 10) };
        g.ColumnDefinitions.Add(new ColumnDefinition());
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
        text.Margin = new Thickness(text.Margin.Left, text.Margin.Top, 20, text.Margin.Bottom);
        text.VerticalAlignment = VerticalAlignment.Center;
        g.Children.Add(text);
        if (control is FrameworkElement fe) fe.VerticalAlignment = VerticalAlignment.Center;
        Grid.SetColumn(control, 1);
        g.Children.Add(control);
        return g;
    }

    static CheckBox Switch(bool value, Action<bool> changed)
    {
        var sw = new CheckBox { IsChecked = value };
        sw.Checked += (_, _) => changed(true);
        sw.Unchecked += (_, _) => changed(false);
        return sw;
    }

    static int _segmentGroups;

    Border Segment((string Label, string Value)[] items, string current, Action<string> changed)
    {
        string group = "seg" + _segmentGroups++;
        var row = new StackPanel { Orientation = Orientation.Horizontal };
        foreach (var (label, value) in items)
        {
            var rb = new RadioButton { Style = Res("Segment"), Content = label, GroupName = group, IsChecked = value == current };
            rb.Checked += (_, _) => changed(value);
            row.Children.Add(rb);
        }
        return new Border { Style = Res("SegmentBar"), Child = row };
    }

    FrameworkElement Chip(Brush dot, string text)
    {
        var row = new StackPanel { Orientation = Orientation.Horizontal };
        row.Children.Add(new Ellipse { Width = 7, Height = 7, Fill = dot, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(0, 0, 8, 0) });
        row.Children.Add(new TextBlock { Text = text, FontSize = 12.5, Foreground = Brush("Ink2"), VerticalAlignment = VerticalAlignment.Center });
        return new Border { Background = Brush("Surface2"), CornerRadius = new CornerRadius(13), Padding = new Thickness(12, 5, 14, 5), Margin = new Thickness(0, 0, 8, 0), Child = row };
    }

    /// <summary>A text box with a grey hint while it is empty.</summary>
    FrameworkElement WithHint(TextBox box, string hint)
    {
        var g = new Grid();
        var h = new TextBlock { Text = hint, Foreground = Brush("Ink3"), FontSize = 14, IsHitTestVisible = false, VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(17, 0, 0, 0) };
        box.TextChanged += (_, _) => h.Visibility = box.Text.Length == 0 ? Visibility.Visible : Visibility.Collapsed;
        g.Children.Add(box);
        g.Children.Add(h);
        return g;
    }

    internal Image AppIcon(ComponentId c, double size, Thickness? margin = null)
    {
        var img = new Image { Source = Bitmap(Components.Icon(c), (int)(size * 2)), Width = size, Height = size, Margin = margin ?? new Thickness(0) };
        RenderOptions.SetBitmapScalingMode(img, BitmapScalingMode.HighQuality);
        return img;
    }

    static readonly Dictionary<(string, int), BitmapImage> BitmapCache = new();

    internal static BitmapImage Bitmap(string name, int decode)
    {
        if (BitmapCache.TryGetValue((name, decode), out var cached)) return cached;
        var bmp = new BitmapImage();
        bmp.BeginInit();
        bmp.UriSource = new Uri($"pack://application:,,,/Assets/{name}.png");
        bmp.DecodePixelWidth = decode;
        bmp.CacheOption = BitmapCacheOption.OnLoad;
        bmp.EndInit();
        bmp.Freeze();
        return BitmapCache[(name, decode)] = bmp;
    }

    internal Style Res(string key) => (Style)FindResource(key);
    internal static Brush Brush(string key) => (Brush)Application.Current.FindResource(key);

    // ---------------------------------------------------------------- one line of the progress list

    sealed class ProgressRow
    {
        public readonly Grid Root;
        readonly Ring _ring = new() { Width = 20, Height = 20, Thickness = 2.4 };
        readonly Shapes.Path _mark = new() { Width = 20, Height = 20, StrokeThickness = 2.2, StrokeStartLineCap = PenLineCap.Round, StrokeEndLineCap = PenLineCap.Round, StrokeLineJoin = PenLineJoin.Round, Stretch = Stretch.None };
        readonly Ellipse _dot = new() { Width = 8, Height = 8, Fill = Brush("Line") };
        readonly TextBlock _state = new() { FontSize = 12.5, Foreground = Brush("Ink3"), VerticalAlignment = VerticalAlignment.Center, Margin = new Thickness(10, 0, 0, 0), MinWidth = 70, TextAlignment = TextAlignment.Right };
        readonly TextBlock _detail = new() { FontSize = 12, Foreground = Brush("Ink3"), TextTrimming = TextTrimming.CharacterEllipsis };

        public ProgressRow(MainWindow w, ComponentId c)
        {
            Root = new Grid { Margin = new Thickness(0, 9, 0, 9) };
            Root.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            Root.ColumnDefinitions.Add(new ColumnDefinition());
            Root.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            Root.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            Root.Children.Add(w.AppIcon(c, 38));
            var text = new StackPanel { Margin = new Thickness(14, 0, 8, 0), VerticalAlignment = VerticalAlignment.Center };
            text.Children.Add(new TextBlock { Text = Text.T("app." + Components.Key(c)), FontSize = 14.5, FontWeight = FontWeights.SemiBold, TextTrimming = TextTrimming.CharacterEllipsis });
            text.Children.Add(_detail);
            Grid.SetColumn(text, 1);
            Root.Children.Add(text);
            var status = new Grid { Width = 22, Height = 22, VerticalAlignment = VerticalAlignment.Center };
            status.Children.Add(_dot);
            status.Children.Add(_ring);
            status.Children.Add(_mark);
            Grid.SetColumn(status, 2);
            Root.Children.Add(status);
            Grid.SetColumn(_state, 3);
            Root.Children.Add(_state);
            Set(StepState.Waiting, null, false);
        }

        public void Set(StepState state, string? detail, bool uninstall)
        {
            Root.Visibility = state == StepState.Skipped ? Visibility.Collapsed : Visibility.Visible;
            _dot.Visibility = state == StepState.Waiting ? Visibility.Visible : Visibility.Collapsed;
            _ring.Visibility = state == StepState.Running ? Visibility.Visible : Visibility.Collapsed;
            _ring.Indeterminate = state == StepState.Running;
            _mark.Visibility = state is StepState.Done or StepState.Failed ? Visibility.Visible : Visibility.Collapsed;
            if (state == StepState.Done) { _mark.Data = Geometry.Parse("M4,10.5 L8.3,14.6 L16.5,5.8"); _mark.Stroke = Brush("Good"); }
            if (state == StepState.Failed) { _mark.Data = Geometry.Parse("M5,5 L15,15 M15,5 L5,15"); _mark.Stroke = Brush("Bad"); }
            _state.Text = state switch
            {
                StepState.Waiting => Text.T("state.waiting"),
                StepState.Running => Text.T(uninstall ? "state.removing" : "state.running"),
                StepState.Done => Text.T(uninstall ? "state.removed" : "state.done"),
                StepState.Failed => Text.T("error.short"),
                _ => "",
            };
            _state.Foreground = state switch { StepState.Done => Brush("Good"), StepState.Failed => Brush("Bad"), StepState.Running => Brush("Ink"), _ => Brush("Ink3") };
            _detail.Text = detail ?? "";
            _detail.Foreground = state == StepState.Failed ? Brush("Bad") : Brush("Ink3");
            _detail.Visibility = string.IsNullOrEmpty(detail) ? Visibility.Collapsed : Visibility.Visible;
        }
    }
}
