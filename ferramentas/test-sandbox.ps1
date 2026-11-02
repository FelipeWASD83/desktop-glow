# Installs, reinstalls and uninstalls the whole pack inside build\sandbox, with the registry redirected to
# HKCU\Software\PacoteWindowsBonito-Sandbox (PACOTE_HOME mode: nothing is closed, opened or reloaded on the PC).
# Writes build\sandbox-report.txt. Run it from a regular terminal, not from the Claude app's shell (MSIX virtualizes HKCU).
#
# Usage: powershell -ExecutionPolicy Bypass -File ferramentas\test-sandbox.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$exe = Get-ChildItem (Join-Path $root 'dist') -Filter 'PacoteWindowsBonito-Setup-*.exe' | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
$bare = Join-Path $root 'build\ui\PacoteWindowsBonito.exe'
$box = Join-Path $root 'build\sandbox'
$report = Join-Path $root 'build\sandbox-report.txt'
$regRoot = 'HKCU:\Software\PacoteWindowsBonito-Sandbox'
$lines = New-Object System.Collections.Generic.List[string]
$failed = 0

function Check([string]$name, [bool]$ok) {
    if ($ok) { $script:lines.Add("ok    $name") } else { $script:lines.Add("FAIL  $name"); $script:failed++ }
}
function RegValue([string]$path, [string]$name) {
    $k = Get-Item -LiteralPath "$regRoot\$path" -ErrorAction SilentlyContinue
    if (-not $k) { return $null }
    return $k.GetValue($name, $null, 'DoNotExpandEnvironmentNames')
}
function Run([string]$file, [string[]]$arguments) {
    $p = Start-Process $file -ArgumentList $arguments -Wait -PassThru -WindowStyle Hidden
    return $p.ExitCode
}

if (Test-Path $box) { Remove-Item $box -Recurse -Force }
New-Item -ItemType Directory -Force (Join-Path $box 'home\.ilha') | Out-Null
if (Test-Path $regRoot) { Remove-Item $regRoot -Recurse -Force }
# settings the person already had: the install must keep "tema" and change only what the setup sets
[IO.File]::WriteAllText((Join-Path $box 'home\.ilha\config.json'), '{ "tema": "x", "colada": false }')
$env:PACOTE_HOME = $box

$options = Join-Path $root 'build\sandbox-options.json'
$o = [ordered]@{
    ilha = $true; relogio = $true; fundoVivo = $true; cursors = $true
    ilhaStartup = $true; ilhaDocked = $true
    relogioStartup = $false; relogio24h = $false; relogioWeather = $true; cityLabel = 'Recife'; latitude = -8.05389; longitude = -34.88111
    cursorScheme = 'white'; fundoVivoStartup = $true
    startMenu = $true; desktopShortcuts = $true; launchWhenDone = $true; installMissing = $true; appLanguage = 'en'
}
[IO.File]::WriteAllText($options, ($o | ConvertTo-Json))

$local = Join-Path $box 'local\Programs'
$home2 = Join-Path $box 'home'

# ---- install
Check 'install exit 0' ((Run $exe @('--install-silent', "`"$options`"")) -eq 0)
Check 'ilha files' (Test-Path "$local\Ilha\Ilha.exe")
Check 'clock files' ((Test-Path "$local\RelogioMond\iniciar.pyw") -and (Test-Path "$local\RelogioMond\app\RelogioMond.dll") -and (Test-Path "$local\RelogioMond\versao.json"))
Check 'clock without the Anurati' (-not (Get-ChildItem "$local\RelogioMond" -Recurse -Filter 'Anurati*'))
Check 'fundo vivo files' (Test-Path "$local\FundoVivo\FundoVivo.exe")
Check 'cursor files' ((Test-Path "$home2\.ilha-cursors\white\arrow.cur") -and (Test-Path "$home2\.ilha-cursors\black\busy.ani") -and (Test-Path "$home2\.ilha-cursors\manifest.json"))
Check 'cursor backup' (Test-Path "$home2\.ilha-cursors\backup.json")
$un = "$local\PacoteWindowsBonito\Uninstall.exe"
Check 'Uninstall.exe written' (Test-Path $un)
Check 'Uninstall.exe is the checked bare setup' ((Get-FileHash $un).Hash -eq (Get-FileHash $bare).Hash)
Check 'Uninstall.exe opens (Smart App Control)' ((Run $un @('--ping')) -eq 0)
Check 'Uninstall.exe has no payload' ((Run $un @('--check-payload')) -eq 4)
$state = [IO.File]::ReadAllText("$local\PacoteWindowsBonito\installed.json") | ConvertFrom-Json
Check 'installed.json lists 4' (@($state.components.PSObject.Properties).Count -eq 4)

$run = 'Software\Microsoft\Windows\CurrentVersion\Run'
Check 'Run Ilha' ((RegValue $run 'Ilha') -eq "`"$local\Ilha\Ilha.exe`"")
Check 'Run FundoVivo' ((RegValue $run 'FundoVivo') -eq "`"$local\FundoVivo\FundoVivo.exe`" --engine")
Check 'no Run RelogioMond (start with Windows off)' ($null -eq (RegValue $run 'RelogioMond'))
Check 'white arrow applied' ((RegValue 'Control Panel\Cursors' 'Arrow') -eq "$home2\.ilha-cursors\white\arrow.cur")
Check 'scheme name' ((RegValue 'Control Panel\Cursors' '') -eq 'Ilha branco')
Check 'both schemes listed' (($null -ne (RegValue 'Control Panel\Cursors\Schemes' 'Ilha preto')) -and ($null -ne (RegValue 'Control Panel\Cursors\Schemes' 'Ilha branco')))
$uk = 'Software\Microsoft\Windows\CurrentVersion\Uninstall\PacoteWindowsBonito'
Check 'Settings > Apps entry' ((RegValue $uk 'DisplayName') -eq 'Pacote Windows Bonito')
Check 'uninstall command' ((RegValue $uk 'UninstallString') -eq "`"$un`" --uninstall")

foreach ($dir in @('startmenu', 'desktop')) {
    $names = (Get-ChildItem (Join-Path $box $dir) -Filter *.lnk).Name
    Check "$dir shortcuts (3)" (@($names).Count -eq 3 -and $names -contains 'Ilha.lnk' -and $names -contains 'Fundo Vivo.lnk' -and (@($names | Where-Object { $_ -like 'Rel*Mond.lnk' }).Count -eq 1))
}
$shell = New-Object -ComObject WScript.Shell
$clockLnk = Get-ChildItem (Join-Path $box 'startmenu') -Filter 'Rel*Mond.lnk' | Select-Object -First 1
$l = $shell.CreateShortcut($clockLnk.FullName)
Check 'clock shortcut runs pythonw on iniciar.pyw' ($l.TargetPath -like '*pythonw.exe' -and $l.Arguments -eq "`"$local\RelogioMond\iniciar.pyw`"")

$ilha = [IO.File]::ReadAllText("$home2\.ilha\config.json") | ConvertFrom-Json
Check 'ilha config merged' ($ilha.tema -eq 'x' -and $ilha.colada -eq $true -and $ilha.language -eq 'en' -and $ilha.iniciarComWindows -eq $true)
$clock = [IO.File]::ReadAllText("$local\RelogioMond\dados\config.json") | ConvertFrom-Json
Check 'clock config' ($clock.formato24h -eq $false -and $clock.clima -eq $true -and [math]::Abs($clock.latitude + 8.0539) -lt 0.0001 -and $clock.idioma -eq 'en' -and $clock.iniciarComWindows -eq $false)

# ---- reinstall over it (an update): the cursor backup from the first install must stay
$backupBefore = [IO.File]::ReadAllText("$home2\.ilha-cursors\backup.json")
[IO.File]::WriteAllText("$local\RelogioMond\dados\keep.txt", 'x')
Check 'reinstall exit 0' ((Run $exe @('--install-silent', "`"$options`"")) -eq 0)
Check 'backup kept on reinstall' ([IO.File]::ReadAllText("$home2\.ilha-cursors\backup.json") -eq $backupBefore)
Check 'clock dados kept on reinstall' (Test-Path "$local\RelogioMond\dados\keep.txt")

# ---- uninstall with the copied uninstaller
Check 'uninstall exit 0' ((Run $un @('--uninstall-silent')) -eq 0)
Check 'ilha removed' (-not (Test-Path "$local\Ilha"))
Check 'fundo vivo removed' (-not (Test-Path "$local\FundoVivo"))
Check 'clock removed, dados kept' ((Test-Path "$local\RelogioMond\dados\config.json") -and -not (Test-Path "$local\RelogioMond\app"))
Check 'cursors removed' (-not (Test-Path "$home2\.ilha-cursors"))
Check 'Run entries removed' (($null -eq (RegValue $run 'Ilha')) -and ($null -eq (RegValue $run 'FundoVivo')))
Check 'pointers restored (default)' ((RegValue 'Control Panel\Cursors' 'Arrow') -eq '')
Check 'schemes unlisted' (($null -eq (RegValue 'Control Panel\Cursors\Schemes' 'Ilha preto')) -and ($null -eq (RegValue 'Control Panel\Cursors\Schemes' 'Ilha branco')))
Check 'Settings > Apps entry removed' ($null -eq (RegValue $uk 'DisplayName'))
Check 'shortcuts removed' (-not (Get-ChildItem (Join-Path $box 'startmenu') -Filter *.lnk) -and -not (Get-ChildItem (Join-Path $box 'desktop') -Filter *.lnk))
Check 'ilha settings kept' (Test-Path "$home2\.ilha\config.json")

$lines.Add($(if ($failed -eq 0) { 'all passed' } else { "$failed failed" }))
$lines.Add('')
$lines.Add('--- setup.log')
Get-Content (Join-Path $box 'PacoteWindowsBonito\setup.log') -Encoding UTF8 | ForEach-Object { $lines.Add($_) }
[IO.File]::WriteAllLines($report, $lines)
Remove-Item $regRoot -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Sandbox test: $(if ($failed -eq 0) { 'all passed' } else { "$failed failed" }) (report in $report)"
