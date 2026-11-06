# Builds the setup: gathers the five apps into one payload zip, compiles the setup window and glues the zip to it.
# Output: dist\DesktopGlow-Setup.exe (the name the site links to; the version is inside it), SHA256.txt next to it.
#
# Usage: powershell -ExecutionPolicy Bypass -File ferramentas\build.ps1 [-Rebuild ilha,relogio,cursors,fundovivo,gearhub] [-Attempts 15]
#
# Each app comes from its own release package, the zip its ferramentas\publicar-versao.ps1 -SoGerar writes (the same
# zip its in-app updater downloads from GitHub). They are cached in build\sources\<app> until the version changes or
# -Rebuild names the app. The fundo-vivo is the exception: its package is read from fundo-vivo\build\release and only
# built with -Rebuild fundovivo, because its build swaps fundo-vivo\app and closes the Fundo Vivo running from there.
#
# Smart App Control judges each new binary by its hash and sometimes refuses one that just came out of the compiler.
# Each attempt gets a random stamp in the version (SourceRevisionId), which changes the hash; the bare setup is run
# with --ping (that exact file becomes Uninstall.exe) and the glued one with --check-payload. If Windows refuses
# either, another stamp is drawn.
param([string[]]$Rebuild = @(), [int]$Attempts = 15)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$base = Split-Path -Parent $root
$build = Join-Path $root 'build'
$payload = Join-Path $build 'payload'
$dist = Join-Path $root 'dist'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$utf8 = New-Object Text.UTF8Encoding($false)

function Run([string]$exe, [string[]]$arguments) {
    $ErrorActionPreference = 'Continue'
    $text = & $exe @arguments 2>&1 | ForEach-Object { "$_" }
    return [pscustomobject]@{ code = $LASTEXITCODE; output = (($text -join "`n").Trim()) }
}

function Csproj-Version([string]$path) {
    $xml = [IO.File]::ReadAllText($path)
    if ($xml -notmatch '<Version>\s*([0-9]+\.[0-9]+\.[0-9]+)\s*</Version>') { throw "No <Version> in $path" }
    return $Matches[1]
}

function Changelog-Version([string]$path) {
    foreach ($line in [IO.File]::ReadAllLines($path)) { if ($line -match '^## ([0-9]+\.[0-9]+\.[0-9]+)') { return $Matches[1] } }
    throw "No version heading in $path"
}

# The shared release format: versao.json with "versao" and "repositorio" at the project root. It must agree with the
# version the project keeps elsewhere (csproj / changelog) when there is one.
function App-Version([string]$dir, [string]$other) {
    $file = Join-Path $dir 'versao.json'
    if (-not (Test-Path $file)) { return $other }
    $v = ([IO.File]::ReadAllText($file) | ConvertFrom-Json).versao
    if ($other -and $v -ne $other) { throw "$(Split-Path -Leaf $dir): versao.json says $v but the project says $other." }
    return $v
}

function Expand-Clean([string]$zip, [string]$dest) {
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    [IO.Compression.ZipFile]::ExtractToDirectory($zip, $dest)
}

function Folder-Bytes([string]$dir) { return [long]((Get-ChildItem $dir -Recurse -File | Measure-Object Length -Sum).Sum) }

function Exit-Code([string]$exe, [string]$arguments) {
    try {
        $p = Start-Process $exe -ArgumentList $arguments -PassThru -Wait -WindowStyle Hidden -ErrorAction Stop
        return $p.ExitCode
    } catch { return 'blocked' }
}

$packVersion = Csproj-Version (Join-Path $root 'src\Setup\Setup.csproj')
Write-Host "Desktop Glow $packVersion"
if (Test-Path $payload) { Remove-Item $payload -Recurse -Force }
New-Item -ItemType Directory -Force $payload | Out-Null
$components = [ordered]@{}

# ---- the five apps, each from its own release package (publicar-versao.ps1 -SoGerar, the format the clave started)
function Release-Zip([string]$name, [string]$dir, [string]$zipName, [string]$version) {
    $work = Join-Path $build "sources\$name"
    $zip = Join-Path $work $zipName
    if ($Rebuild -contains $name -or -not (Test-Path $zip)) {
        Write-Host "${name} ${version}: building its release package..."
        New-Item -ItemType Directory -Force $work | Out-Null
        # Out-Host: what the script prints would otherwise become part of this function's return value
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $dir 'ferramentas\publicar-versao.ps1') -SoGerar $work | Out-Host
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $zip)) { throw "The $name package failed (see above)." }
    }
    return $zip
}

# Unpacks a release zip into payload\<name>. A zip with everything inside one folder (relogio-mond/, ilha-cursors/)
# loses that folder; $inner picks a subfolder of it instead.
function Expand-Package([string]$zip, [string]$name, [string]$inner = '') {
    $tmp = Join-Path $build "unpack\$name"
    Expand-Clean $zip $tmp
    $top = @(Get-ChildItem $tmp)
    $from = if ($top.Count -eq 1 -and $top[0].PSIsContainer) { $top[0].FullName } else { $tmp }
    if ($inner) { $from = Join-Path $from $inner }
    $dest = Join-Path $payload $name
    Copy-Item $from $dest -Recurse
    Remove-Item $tmp -Recurse -Force
    return $dest
}

# ilha: the public build, without the private modules; Ilha-X.Y.Z.zip with the files at the root
$ilhaDir = Join-Path $base 'ilha'
$ilhaVersion = App-Version $ilhaDir (Csproj-Version (Join-Path $ilhaDir 'src\Ilha\Ilha.csproj'))
$dest = Expand-Package (Release-Zip 'ilha' $ilhaDir "Ilha-$ilhaVersion.zip" $ilhaVersion) 'ilha'
foreach ($f in @('Ilha.exe', 'icone.ico', 'pacote.json')) { if (-not (Test-Path (Join-Path $dest $f))) { throw "ilha package without $f" } }
$components['ilha'] = [ordered]@{ version = $ilhaVersion; bytes = (Folder-Bytes $dest) }

# fundo vivo: never rebuilt on its own (only with -Rebuild fundovivo), because its build swaps fundo-vivo\app and
# closes the Fundo Vivo running from there; its -SoGerar writes to fundo-vivo\build\release
$fvDir = Join-Path $base 'fundo-vivo'
$fvVersion = App-Version $fvDir (Csproj-Version (Join-Path $fvDir 'src\FundoVivo\FundoVivo.csproj'))
$fvZip = Join-Path $fvDir "build\release\fundo-vivo-$fvVersion.zip"
if ($Rebuild -contains 'fundovivo') {
    Write-Host "Fundo Vivo ${fvVersion}: building the package (this closes a Fundo Vivo running from fundo-vivo\app)..."
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $fvDir 'ferramentas\publicar-versao.ps1') -SoGerar
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $fvZip)) { throw 'The Fundo Vivo package failed (see above).' }
}
if (-not (Test-Path $fvZip)) {
    $older = Get-ChildItem (Join-Path $fvDir 'build\release') -Filter 'fundo-vivo-*.zip' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $older) { throw "No Fundo Vivo package. Run fundo-vivo\ferramentas\publicar-versao.ps1 -SoGerar (or this script with -Rebuild fundovivo)." }
    Write-Warning "Fundo Vivo: the project is at $fvVersion but the newest package is $($older.BaseName); using it."
    $fvZip = $older.FullName
    $fvVersion = $older.BaseName -replace '^fundo-vivo-', ''
}
$dest = Expand-Package $fvZip 'fundovivo'
if (-not (Test-Path (Join-Path $dest 'FundoVivo.exe'))) { throw 'Fundo Vivo package without FundoVivo.exe' }
$components['fundovivo'] = [ordered]@{ version = $fvVersion; bytes = (Folder-Bytes $dest) }

# relogio mond: compiled from its last commit (work not committed yet stays out) with the stamp loop of its own
# script; never the Anurati font, which each PC downloads for itself
$rDir = Join-Path $base 'relogio-mond'
$rVersion = App-Version $rDir ''
$dest = Expand-Package (Release-Zip 'relogio' $rDir "relogio-mond-$rVersion.zip" $rVersion) 'relogio'
foreach ($f in @('app\RelogioMond.dll', 'iniciar.pyw', 'icone\icone.ico')) { if (-not (Test-Path (Join-Path $dest $f))) { throw "relogio package without $f" } }
if (Get-ChildItem $dest -Recurse -Filter 'Anurati*') { throw 'The Anurati font must not go into the package.' }
$components['relogio'] = [ordered]@{ version = $rVersion; bytes = (Folder-Bytes $dest) }

# cursors: its package needs build\ generated for the current version
$cDir = Join-Path $base 'ilha-cursors'
$cVersion = App-Version $cDir (Changelog-Version (Join-Path $cDir 'CHANGELOG.md'))
$cManifest = Join-Path $cDir 'build\manifest.json'
$cHave = if (Test-Path $cManifest) { ([IO.File]::ReadAllText($cManifest) | ConvertFrom-Json).version } else { '' }
if ($cHave -ne $cVersion) {
    Write-Host "Cursors: build is $cHave, the project says $cVersion; running generate.py..."
    Push-Location $cDir
    try { & python generate.py; if ($LASTEXITCODE -ne 0) { throw 'generate.py failed.' } } finally { Pop-Location }
    $Rebuild += 'cursors'
}
$dest = Expand-Package (Release-Zip 'cursors' $cDir "ilha-cursors-$cVersion.zip" $cVersion) 'cursors' 'build'
foreach ($f in @('manifest.json', 'black', 'white')) { if (-not (Test-Path (Join-Path $dest $f))) { throw "cursors package without $f" } }
$components['cursors'] = [ordered]@{ version = $cVersion; bytes = (Folder-Bytes $dest) }

# gear hub: compiled from its last commit by its own script (stamp loop and --ping); GearHub-X.Y.Z.zip with the files
# at the root. Framework-dependent .NET 10, so it needs the desktop runtime the setup installs through winget.
$gDir = Join-Path $base 'gear-hub'
$gVersion = App-Version $gDir (Csproj-Version (Join-Path $gDir 'src\GearHub\GearHub.csproj'))
$gChangelog = Changelog-Version (Join-Path $gDir 'CHANGELOG.md')
if ($gChangelog -ne $gVersion) { throw "gear-hub: CHANGELOG.md is at $gChangelog but versao.json says $gVersion." }
$dest = Expand-Package (Release-Zip 'gearhub' $gDir "GearHub-$gVersion.zip" $gVersion) 'gearhub'
foreach ($f in @('GearHub.exe', 'GearHub.dll', 'icone.ico', 'versao.json')) { if (-not (Test-Path (Join-Path $dest $f))) { throw "gear hub package without $f" } }
$components['gearhub'] = [ordered]@{ version = $gVersion; bytes = (Folder-Bytes $dest) }

# ---- the app videos the progress screen plays (video\ferramentas\todos.py writes them)
$vSrc = Join-Path $root 'video\saida\setup'
$vFiles = @(Get-ChildItem $vSrc -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -in '.mp4', '.jpg' })
if ($vFiles.Count -gt 0) {
    $vDest = Join-Path $payload 'videos'
    New-Item -ItemType Directory -Force $vDest | Out-Null
    $vFiles | Copy-Item -Destination $vDest
    Write-Host ("Videos: {0} files, {1:N1} MB" -f $vFiles.Count, (($vFiles | Measure-Object Length -Sum).Sum / 1MB))
    # the names are Components.Icon in the setup; an app without its video is just skipped on the progress screen
    foreach ($v in @('ilha', 'relogio', 'fundovivo', 'cursores', 'gearhub')) {
        foreach ($lang in @('pt', 'en')) {
            if (-not (Test-Path (Join-Path $vSrc "$v-$lang.mp4"))) { Write-Warning "No setup video $v-$lang.mp4: the progress screen plays the others." }
        }
    }
} else {
    Write-Warning 'No setup videos in video\saida\setup: the progress screen will show the list only. Run python video\ferramentas\todos.py first.'
}

# ---- manifest and zip
$manifest = [ordered]@{ pack = $packVersion; components = $components } | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText((Join-Path $payload 'manifest.json'), $manifest, $utf8)
$zip = Join-Path $build 'payload.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
# entry by entry: ZipFile.CreateFromDirectory in Windows PowerShell 5.1 writes the names with backslashes
$archive = [IO.Compression.ZipFile]::Open($zip, 'Create')
try {
    $prefixLength = (Resolve-Path $payload).Path.TrimEnd('\').Length + 1
    foreach ($file in Get-ChildItem $payload -Recurse -File) {
        $name = $file.FullName.Substring($prefixLength).Replace('\', '/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $file.FullName, $name, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $archive.Dispose() }
Write-Host ("Payload: {0:N1} MB  (ilha {1}, fundo vivo {2}, relogio {3}, cursors {4}, gear hub {5})" -f ((Get-Item $zip).Length / 1MB), $ilhaVersion, $fvVersion, $rVersion, $cVersion, $gVersion)

# ---- setup window, stamped until Windows accepts it, then glued
$project = Join-Path $root 'src\Setup\Setup.csproj'
$ui = Join-Path $build 'ui'
New-Item -ItemType Directory -Force $dist | Out-Null
$final = Join-Path $dist "DesktopGlow-Setup.exe"
$ok = $false
for ($i = 1; $i -le $Attempts; $i++) {
    $stamp = -join ((1..(Get-Random -Minimum 24 -Maximum 200)) | ForEach-Object { [char](Get-Random -Minimum 97 -Maximum 123) })
    if (Test-Path $ui) { Remove-Item $ui -Recurse -Force }
    $r = Run dotnet @('publish', $project, '-c', 'Release', '-o', $ui, '-nologo', '-v', 'q', "-p:SourceRevisionId=$stamp")
    if ($r.code -ne 0) { Write-Host $r.output; throw 'The setup did not compile.' }
    $exe = Join-Path $ui 'DesktopGlow.exe'
    $code = Exit-Code $exe '--ping'
    if ($code -ne 0) { Write-Host "Attempt ${i}: Windows refused the bare setup ($code); new stamp."; continue }

    $out = [IO.File]::Open($final, 'Create')
    try {
        $in = [IO.File]::OpenRead($exe); $in.CopyTo($out); $in.Close()
        $z = [IO.File]::OpenRead($zip); $len = $z.Length; $z.CopyTo($out); $z.Close()
        $out.Write([BitConverter]::GetBytes([long]$len), 0, 8)
        $out.Write([Text.Encoding]::ASCII.GetBytes('GLOWPAY1'), 0, 8)
    } finally { $out.Close() }

    $code = Exit-Code $final '--check-payload'
    if ($code -eq 0) { Write-Host "Attempt ${i}: Windows accepted both."; $ok = $true; break }
    Write-Host "Attempt ${i}: the glued setup did not pass ($code); new stamp."
}
if (-not $ok) { throw "Windows refused all $Attempts attempts. See the CodeIntegrity log in Event Viewer." }

$report = Join-Path $build 'selftest.txt'
$code = Exit-Code $final "--self-test `"$report`""
Get-Content $report | ForEach-Object { Write-Host "  $_" }
if ($code -ne 0) { throw 'The self test failed.' }

$hash = (Get-FileHash $final -Algorithm SHA256).Hash.ToLowerInvariant()
[IO.File]::WriteAllText((Join-Path $dist 'SHA256.txt'), "$hash  $(Split-Path -Leaf $final)`n", $utf8)
Write-Host ("Ready: {0} ({1:N1} MB)" -f $final, ((Get-Item $final).Length / 1MB))
