# Installs, reinstalls and uninstalls the whole pack inside build\sandbox, with the registry redirected to
# HKCU\Software\DesktopGlow-Sandbox (DESKTOPGLOW_HOME mode: nothing is closed, opened or reloaded on the PC).
# Writes build\sandbox-report.txt. Run it from a regular terminal, not from the Claude app's shell (MSIX virtualizes HKCU).
#
# Usage: powershell -ExecutionPolicy Bypass -File ferramentas\test-sandbox.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$exe = Get-ChildItem (Join-Path $root 'dist') -Filter 'DesktopGlow-Setup*.exe' | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName
$bare = Join-Path $root 'build\ui\DesktopGlow.exe'
$box = Join-Path $root 'build\sandbox'
$report = Join-Path $root 'build\sandbox-report.txt'
$regRoot = 'HKCU:\Software\DesktopGlow-Sandbox'
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
$env:DESKTOPGLOW_HOME = $box

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

# ---- an install from the time the pack was called Pacote Windows Bonito (until 1.2.2): state, Settings entry, task
New-Item -ItemType Directory -Force "$local\PacoteWindowsBonito" | Out-Null
[IO.File]::WriteAllText("$local\PacoteWindowsBonito\installed.json", '{ "pack": "1.2.2", "components": { "ilha": { "version": "4.0.1", "folder": "' + "$local\Ilha".Replace('\', '\\') + '" } } }')
[IO.File]::WriteAllText("$local\PacoteWindowsBonito\Uninstall.exe", 'old')
$oldKey = "$regRoot\Software\Microsoft\Windows\CurrentVersion\Uninstall\PacoteWindowsBonito"
New-Item -Path $oldKey -Force | Out-Null
Set-ItemProperty -Path $oldKey -Name DisplayName -Value 'Pacote Windows Bonito'
$ErrorActionPreference = 'Continue'
schtasks /create /tn 'PWB-Sandbox Ilha' /tr 'cmd.exe /c exit' /sc once /st 23:59 /f 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'

# ---- install
Check 'install exit 0' ((Run $exe @('--install-silent', "`"$options`"", '--lang', 'pt')) -eq 0)
Check 'ilha files' (Test-Path "$local\Ilha\Ilha.exe")
Check 'clock files' ((Test-Path "$local\RelogioMond\iniciar.pyw") -and (Test-Path "$local\RelogioMond\app\RelogioMond.dll") -and (Test-Path "$local\RelogioMond\versao.json"))
Check 'clock without the Anurati' (-not (Get-ChildItem "$local\RelogioMond" -Recurse -Filter 'Anurati*'))
Check 'fundo vivo files' (Test-Path "$local\FundoVivo\FundoVivo.exe")
Check 'cursor files' ((Test-Path "$home2\.ilha-cursors\white\arrow.cur") -and (Test-Path "$home2\.ilha-cursors\black\busy.ani") -and (Test-Path "$home2\.ilha-cursors\manifest.json"))
Check 'cursor backup' (Test-Path "$home2\.ilha-cursors\backup.json")
$un = "$local\DesktopGlow\Uninstall.exe"
Check 'Uninstall.exe written' (Test-Path $un)
Check 'Uninstall.exe is the checked bare setup' ((Get-FileHash $un).Hash -eq (Get-FileHash $bare).Hash)
Check 'Uninstall.exe opens (Smart App Control)' ((Run $un @('--ping')) -eq 0)
Check 'Uninstall.exe has no payload' ((Run $un @('--check-payload')) -eq 4)
$state = [IO.File]::ReadAllText("$local\DesktopGlow\installed.json") | ConvertFrom-Json
Check 'installed.json lists 4' (@($state.components.PSObject.Properties).Count -eq 4)
Check 'legacy: old folder removed' (-not (Test-Path "$local\PacoteWindowsBonito"))
Check 'legacy: old Settings > Apps entry removed' (-not (Test-Path $oldKey))

$run = 'Software\Microsoft\Windows\CurrentVersion\Run'
Check 'Run Ilha' ((RegValue $run 'Ilha') -eq "`"$local\Ilha\Ilha.exe`"")
Check 'Run FundoVivo' ((RegValue $run 'FundoVivo') -eq "`"$local\FundoVivo\FundoVivo.exe`" --engine")
Check 'no Run RelogioMond (start with Windows off)' ($null -eq (RegValue $run 'RelogioMond'))
function TaskExists([string]$name) {
    # "not found" comes on stderr, which 'Stop' would turn into a fatal error in PowerShell 5.1
    $ErrorActionPreference = 'Continue'
    schtasks /query /tn "Desktop Glow Sandbox - $name" 2>&1 | Out-Null
    return $LASTEXITCODE -eq 0
}
Check 'priority tasks for the apps that start with Windows' ((TaskExists 'Ilha') -and (TaskExists 'Fundo Vivo'))
Check 'no priority task for the clock (start with Windows off)' (-not (TaskExists 'Relogio Mond'))
$ErrorActionPreference = 'Continue'
schtasks /query /tn 'PWB-Sandbox Ilha' 2>&1 | Out-Null
Check 'legacy: old priority task removed' ($LASTEXITCODE -ne 0)
$ErrorActionPreference = 'Stop'
$ErrorActionPreference = 'Continue'
$taskXml = (schtasks /query /tn 'Desktop Glow Sandbox - Ilha' /xml 2>&1) -join "`n"
$ErrorActionPreference = 'Stop'
Check 'priority task: above normal, at logon, the installed exe' ($taskXml -match '<Priority>2</Priority>' -and $taskXml -match '<LogonTrigger>' -and $taskXml -match [regex]::Escape("$local\Ilha\Ilha.exe"))
Check 'white arrow applied' ((RegValue 'Control Panel\Cursors' 'Arrow') -eq "$home2\.ilha-cursors\white\arrow.cur")
Check 'scheme name' ((RegValue 'Control Panel\Cursors' '') -eq 'Ilha branco')
Check 'both schemes listed' (($null -ne (RegValue 'Control Panel\Cursors\Schemes' 'Ilha preto')) -and ($null -ne (RegValue 'Control Panel\Cursors\Schemes' 'Ilha branco')))
$uk = 'Software\Microsoft\Windows\CurrentVersion\Uninstall\DesktopGlow'
Check 'Settings > Apps entry' ((RegValue $uk 'DisplayName') -eq 'Desktop Glow')
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

# ---- reinstall over it (an update), in English: the cursor backup from the first install must stay, and the
# shortcuts take the English names in place of the Portuguese ones
$backupBefore = [IO.File]::ReadAllText("$home2\.ilha-cursors\backup.json")
[IO.File]::WriteAllText("$local\RelogioMond\dados\keep.txt", 'x')
Check 'reinstall exit 0' ((Run $exe @('--install-silent', "`"$options`"", '--lang', 'en')) -eq 0)
$names = (Get-ChildItem (Join-Path $box 'startmenu') -Filter *.lnk).Name
Check 'English shortcuts replace the Portuguese ones' (@($names).Count -eq 3 -and $names -contains 'Island.lnk' -and $names -contains 'Mond Clock.lnk' -and $names -contains 'Living Wallpaper.lnk')
Check 'backup kept on reinstall' ([IO.File]::ReadAllText("$home2\.ilha-cursors\backup.json") -eq $backupBefore)
Check 'clock dados kept on reinstall' (Test-Path "$local\RelogioMond\dados\keep.txt")

# ---- uninstall with the copied uninstaller
Check 'uninstall exit 0' ((Run $un @('--uninstall-silent')) -eq 0)
Check 'ilha removed' (-not (Test-Path "$local\Ilha"))
Check 'fundo vivo removed' (-not (Test-Path "$local\FundoVivo"))
Check 'clock removed, dados kept' ((Test-Path "$local\RelogioMond\dados\config.json") -and -not (Test-Path "$local\RelogioMond\app"))
Check 'cursors removed' (-not (Test-Path "$home2\.ilha-cursors"))
Check 'priority tasks removed' (-not (TaskExists 'Ilha') -and -not (TaskExists 'Fundo Vivo'))
Check 'Run entries removed' (($null -eq (RegValue $run 'Ilha')) -and ($null -eq (RegValue $run 'FundoVivo')))
Check 'pointers restored (default)' ((RegValue 'Control Panel\Cursors' 'Arrow') -eq '')
Check 'schemes unlisted' (($null -eq (RegValue 'Control Panel\Cursors\Schemes' 'Ilha preto')) -and ($null -eq (RegValue 'Control Panel\Cursors\Schemes' 'Ilha branco')))
Check 'Settings > Apps entry removed' ($null -eq (RegValue $uk 'DisplayName'))
Check 'shortcuts removed' (-not (Get-ChildItem (Join-Path $box 'startmenu') -Filter *.lnk) -and -not (Get-ChildItem (Join-Path $box 'desktop') -Filter *.lnk))
Check 'ilha settings kept' (Test-Path "$home2\.ilha\config.json")

$lines.Add($(if ($failed -eq 0) { 'all passed' } else { "$failed failed" }))
$lines.Add('')
$lines.Add('--- setup.log')
Get-Content (Join-Path $box 'DesktopGlow\setup.log') -Encoding UTF8 | ForEach-Object { $lines.Add($_) }
[IO.File]::WriteAllLines($report, $lines)
Remove-Item $regRoot -Recurse -Force -ErrorAction SilentlyContinue
$ErrorActionPreference = 'Continue'  # schtasks says "not found" on stderr
foreach ($n in @('Ilha', 'Relogio Mond', 'Fundo Vivo')) {
    schtasks /delete /tn "Desktop Glow Sandbox - $n" /f 2>$null | Out-Null
    schtasks /delete /tn "PWB-Sandbox $n" /f 2>$null | Out-Null
}
Write-Host "Sandbox test: $(if ($failed -eq 0) { 'all passed' } else { "$failed failed" }) (report in $report)"
