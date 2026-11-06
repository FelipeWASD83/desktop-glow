# Clicks through the real setup window with UI Automation: window outside every monitor, DESKTOPGLOW_HOME sandbox in
# build\sandbox-ui, registry under HKCU\Software\DesktopGlow-Sandbox. Turns the Fundo Vivo card off, picks the
# white cursors, installs, and checks what landed. Then the same for the uninstaller window.
# Run it from a regular terminal (not the Claude app's shell).
#
# Usage: powershell -ExecutionPolicy Bypass -File ferramentas\test-ui.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$root = Split-Path -Parent $PSScriptRoot
$exe = Get-ChildItem (Join-Path $root 'dist') -Filter 'DesktopGlow-Setup*.exe' | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
$box = Join-Path $root 'build\sandbox-ui'
$regRoot = 'HKCU:\Software\DesktopGlow-Sandbox'
if (Test-Path $box) { Remove-Item $box -Recurse -Force }
if (Test-Path $regRoot) { Remove-Item $regRoot -Recurse -Force }
$env:DESKTOPGLOW_HOME = $box
$A = [Windows.Automation.AutomationElement]
$T = [Windows.Automation.TreeScope]
$failed = 0

function Check([string]$name, [bool]$ok) {
    if ($ok) { Write-Host "ok    $name" } else { Write-Host "FAIL  $name"; $script:failed++ }
}

function Find-Window([int]$processId) {
    for ($i = 0; $i -lt 100; $i++) {
        $cond = New-Object Windows.Automation.PropertyCondition($A::ProcessIdProperty, $processId)
        $w = $A::RootElement.FindFirst($T::Children, $cond)
        if ($w) { return $w }
        Start-Sleep -Milliseconds 200
    }
    throw 'setup window did not appear'
}

function Find-Named($win, [string]$name, $type, [int]$timeoutMs = 10000) {
    $until = (Get-Date).AddMilliseconds($timeoutMs)
    while ((Get-Date) -lt $until) {
        $c1 = New-Object Windows.Automation.PropertyCondition($A::NameProperty, $name)
        $c2 = New-Object Windows.Automation.PropertyCondition($A::ControlTypeProperty, $type)
        $el = $win.FindFirst($T::Descendants, (New-Object Windows.Automation.AndCondition($c1, $c2)))
        if ($el -and $el.Current.IsEnabled -and -not $el.Current.IsOffscreen) { return $el }
        if ($el -and $el.Current.IsEnabled) { return $el }
        Start-Sleep -Milliseconds 150
    }
    throw "no enabled '$name'"
}

function Click($win, [string]$name, [int]$timeoutMs = 10000) {
    $b = Find-Named $win $name ([Windows.Automation.ControlType]::Button) $timeoutMs
    $b.GetCurrentPattern([Windows.Automation.InvokePattern]::Pattern).Invoke()
    Start-Sleep -Milliseconds 600   # the page transition
}

# Portuguese labels without typing accents in this file (PowerShell 5.1 reads it as ANSI)
$start = 'Come' + [char]0xE7 + 'ar'
$fundoTitle = 'Fundo Vivo'

$p = Start-Process $exe -ArgumentList '--offscreen', '--lang', 'pt' -PassThru
$win = Find-Window $p.Id
Click $win $start
# the cards are toggle buttons named after their app (WPF reports them as Button)
$fv = Find-Named $win $fundoTitle ([Windows.Automation.ControlType]::Button)
# the cards slide in after the page: a toggle sent during that animation was lost once (03/11/2026)
$toggle = $fv.GetCurrentPattern([Windows.Automation.TogglePattern]::Pattern)
for ($i = 0; $i -lt 10 -and $toggle.Current.ToggleState -ne 'Off'; $i++) {
    Start-Sleep -Milliseconds 400
    if ($toggle.Current.ToggleState -ne 'Off') { $toggle.Toggle() }
}
Start-Sleep -Milliseconds 300
Check 'Fundo Vivo card off' ($fv.GetCurrentPattern([Windows.Automation.TogglePattern]::Pattern).Current.ToggleState -eq 'Off')
Click $win 'Continuar'
$tile = Find-Named $win 'Branco' ([Windows.Automation.ControlType]::RadioButton)
$tile.GetCurrentPattern([Windows.Automation.SelectionItemPattern]::Pattern).Select()
Click $win 'Continuar'
Click $win 'Instalar'
Click $win 'Fechar' 90000
$p.WaitForExit(10000) | Out-Null
Check 'window closed with exit 0' ($p.HasExited -and $p.ExitCode -eq 0)

$local = Join-Path $box 'local\Programs'
Check 'ilha installed' (Test-Path "$local\Ilha\Ilha.exe")
Check 'clock installed' (Test-Path "$local\RelogioMond\iniciar.pyw")
Check 'Fundo Vivo NOT installed (card off)' (-not (Test-Path "$local\FundoVivo"))
Check 'cursors installed' (Test-Path "$box\home\.ilha-cursors\white\arrow.cur")
Check 'gear hub installed' (Test-Path "$local\GearHub\GearHub.exe")
$arrow = (Get-Item -LiteralPath "$regRoot\Control Panel\Cursors").GetValue('Arrow', $null, 'DoNotExpandEnvironmentNames')
Check 'white scheme applied' ($arrow -like '*\white\arrow.cur')

# ---- the uninstaller window
$un = "$local\DesktopGlow\Uninstall.exe"
$p = Start-Process $un -ArgumentList '--uninstall', '--offscreen', '--lang', 'pt' -PassThru
$win = Find-Window $p.Id
Click $win 'Desinstalar'
Click $win 'Fechar' 60000
$p.WaitForExit(10000) | Out-Null
Check 'uninstaller closed with exit 0' ($p.HasExited -and $p.ExitCode -eq 0)
Check 'everything removed' (-not (Test-Path "$local\Ilha") -and -not (Test-Path "$local\RelogioMond\app") -and -not (Test-Path "$box\home\.ilha-cursors") -and -not (Test-Path "$local\GearHub"))

Remove-Item $regRoot -Recurse -Force -ErrorAction SilentlyContinue
# the sandbox logon tasks are real tasks: never leave one behind for the next sign-in
$ErrorActionPreference = 'Continue'  # schtasks says "not found" on stderr
foreach ($n in @('Ilha', 'Relogio Mond', 'Fundo Vivo', 'Gear Hub')) { schtasks /delete /tn "Desktop Glow Sandbox - $n" /f 2>$null | Out-Null }
Write-Host $(if ($failed -eq 0) { 'UI test: all passed' } else { "UI test: $failed failed" })
