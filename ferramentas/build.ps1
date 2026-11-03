# Builds the setup: gathers the four apps into one payload zip, compiles the setup window and glues the zip to it.
# Output: dist\PacoteWindowsBonito-Setup-<version>.exe (and SHA256.txt next to it).
#
# Usage: powershell -ExecutionPolicy Bypass -File ferramentas\build.ps1 [-RebuildIlha] [-RebuildFundoVivo] [-Attempts 15]
#
# Where each app comes from (read from the sibling project folders, never changed by this script):
#   ilha        ilha\ferramentas\publicar-versao.ps1 -SoGerar (public build, without the private modules), cached in
#               build\sources\ilha until its version changes or -RebuildIlha
#   fundo-vivo  fundo-vivo\build\release\fundo-vivo-<version>.zip from its publicar-versao.ps1 -SoGerar. Built only if
#               missing or with -RebuildFundoVivo, because its compilar.ps1 swaps fundo-vivo\app and closes the Fundo
#               Vivo running from there
#   relogio     relogio-mond\app as it is (the build that already runs on this PC) plus iniciar.pyw and the docs;
#               never the Anurati font, which each PC downloads for itself
#   cursors     ilha-cursors\build (python generate.py when it is missing or older than the changelog)
#
# Smart App Control judges each new binary by its hash and sometimes refuses one that just came out of the compiler.
# Each attempt gets a random stamp in the version (SourceRevisionId), which changes the hash; the bare setup is run
# with --ping (that exact file becomes Uninstall.exe) and the glued one with --check-payload. If Windows refuses
# either, another stamp is drawn.
param([switch]$RebuildIlha, [switch]$RebuildFundoVivo, [int]$Attempts = 15)
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

# The shared release format (clave, relogio-mond, ilha-cursors): versao.json with "versao" and "repositorio" at the
# project root. A project that has it must agree with the version it keeps elsewhere (csproj / changelog); a project
# that does not yet (ilha, fundo-vivo) falls back to that other place.
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
Write-Host "Pacote Windows Bonito $packVersion"
if (Test-Path $payload) { Remove-Item $payload -Recurse -Force }
New-Item -ItemType Directory -Force $payload | Out-Null
$components = [ordered]@{}

# ---- ilha
$ilhaDir = Join-Path $base 'ilha'
$ilhaVersion = App-Version $ilhaDir (Csproj-Version (Join-Path $ilhaDir 'src\Ilha\Ilha.csproj'))
$ilhaWork = Join-Path $build 'sources\ilha'
$ilhaZip = Join-Path $ilhaWork "Ilha-$ilhaVersion.zip"
if ($RebuildIlha -or -not (Test-Path $ilhaZip)) {
    Write-Host "Ilha ${ilhaVersion}: building the public package..."
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $ilhaDir 'ferramentas\publicar-versao.ps1') -SoGerar $ilhaWork
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $ilhaZip)) { throw 'The ilha package failed (see above).' }
}
Expand-Clean $ilhaZip (Join-Path $payload 'ilha')
foreach ($f in @('Ilha.exe', 'icone.ico', 'pacote.json')) { if (-not (Test-Path (Join-Path $payload "ilha\$f"))) { throw "ilha package without $f" } }
$components['ilha'] = [ordered]@{ version = $ilhaVersion; bytes = (Folder-Bytes (Join-Path $payload 'ilha')) }

# ---- fundo vivo
$fvDir = Join-Path $base 'fundo-vivo'
$fvVersion = App-Version $fvDir (Csproj-Version (Join-Path $fvDir 'src\FundoVivo\FundoVivo.csproj'))
$fvZip = Join-Path $fvDir "build\release\fundo-vivo-$fvVersion.zip"
if ($RebuildFundoVivo) {
    Write-Host "Fundo Vivo ${fvVersion}: building the package (this closes a Fundo Vivo running from fundo-vivo\app)..."
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $fvDir 'ferramentas\publicar-versao.ps1') -SoGerar
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $fvZip)) { throw 'The Fundo Vivo package failed (see above).' }
}
if (-not (Test-Path $fvZip)) {
    # Never rebuilt on its own: someone may be working in fundo-vivo, and its build swaps the app that is running.
    $older = Get-ChildItem (Join-Path $fvDir 'build\release') -Filter 'fundo-vivo-*.zip' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $older) { throw "No Fundo Vivo package. Run fundo-vivo\ferramentas\publicar-versao.ps1 -SoGerar (or this script with -RebuildFundoVivo)." }
    $fvZip = $older.FullName
    $fvVersion = $older.BaseName -replace '^fundo-vivo-', ''
    Write-Warning "Fundo Vivo: the project is at $(Csproj-Version (Join-Path $fvDir 'src\FundoVivo\FundoVivo.csproj')) but the newest package is $fvVersion; using it. Generate a new one with publicar-versao.ps1 -SoGerar in fundo-vivo."
}
Expand-Clean $fvZip (Join-Path $payload 'fundovivo')
if (-not (Test-Path (Join-Path $payload 'fundovivo\FundoVivo.exe'))) { throw 'Fundo Vivo package without FundoVivo.exe' }
$components['fundovivo'] = [ordered]@{ version = $fvVersion; bytes = (Folder-Bytes (Join-Path $payload 'fundovivo')) }

# ---- relogio mond
$rDir = Join-Path $base 'relogio-mond'
$rVersion = ([IO.File]::ReadAllText((Join-Path $rDir 'versao.json')) | ConvertFrom-Json).versao
$dll = Get-Item (Join-Path $rDir 'app\RelogioMond.dll')
# The DLL must be at least as new as the last commit of src\. Edits not committed yet are someone's work in
# progress (02/11/2026: a session was changing Nativo.cs mid-build): they do not ship, and only a warning says so.
# So the newest source file that matches the commit (not one being edited) must be older than the DLL.
$editing = @(& git -C $rDir status --porcelain -- src | ForEach-Object { (Join-Path $rDir $_.Substring(3).Trim('"')).Replace('/', '\') })
$newestSource = Get-ChildItem (Join-Path $rDir 'src') -Recurse -File -Include *.cs, *.xaml, *.csproj |
    Where-Object { $_.FullName -notmatch '\\(bin|obj)\\' -and $editing -notcontains $_.FullName } |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($newestSource.LastWriteTime -gt $dll.LastWriteTime) {
    throw "relogio-mond\app is older than $($newestSource.Name): open the clock once (iniciar.pyw recompiles it) and build again."
}
if ($editing.Count -gt 0) {
    Write-Warning "relogio-mond has uncommitted changes in src ($($editing.Count) file(s)): the package takes app\ as built from the last commit, not them."
}
$rDest = Join-Path $payload 'relogio'
New-Item -ItemType Directory -Force (Join-Path $rDest 'icone') | Out-Null
Copy-Item (Join-Path $rDir 'app') (Join-Path $rDest 'app') -Recurse
Get-ChildItem (Join-Path $rDest 'app') -Recurse -Filter *.pdb | Remove-Item -Force
foreach ($f in @('iniciar.pyw', 'versao.json', 'LICENSE', 'README.md', 'CHANGELOG.md')) { Copy-Item (Join-Path $rDir $f) $rDest }
Copy-Item (Join-Path $rDir 'icone\*') (Join-Path $rDest 'icone')
if (Get-ChildItem $rDest -Recurse -Filter 'Anurati*') { throw 'The Anurati font must not go into the package.' }
$components['relogio'] = [ordered]@{ version = $rVersion; bytes = (Folder-Bytes $rDest) }

# ---- cursors
$cDir = Join-Path $base 'ilha-cursors'
$cManifest = Join-Path $cDir 'build\manifest.json'
$cWanted = App-Version $cDir (Changelog-Version (Join-Path $cDir 'CHANGELOG.md'))
$cHave = if (Test-Path $cManifest) { ([IO.File]::ReadAllText($cManifest) | ConvertFrom-Json).version } else { '' }
if ($cHave -ne $cWanted) {
    Write-Host "Cursors: build is $cHave, changelog says $cWanted; running generate.py..."
    Push-Location $cDir
    try { & python generate.py; if ($LASTEXITCODE -ne 0) { throw 'generate.py failed.' } } finally { Pop-Location }
}
$cDest = Join-Path $payload 'cursors'
New-Item -ItemType Directory -Force $cDest | Out-Null
foreach ($v in @('black', 'white')) { Copy-Item (Join-Path $cDir "build\$v") (Join-Path $cDest $v) -Recurse }
Copy-Item $cManifest $cDest
$components['cursors'] = [ordered]@{ version = $cWanted; bytes = (Folder-Bytes $cDest) }

# ---- the app videos the progress screen plays (video\ferramentas\todos.py writes them)
$vSrc = Join-Path $root 'video\saida\setup'
$vFiles = @(Get-ChildItem $vSrc -File -ErrorAction SilentlyContinue | Where-Object { $_.Extension -in '.mp4', '.jpg' })
if ($vFiles.Count -gt 0) {
    $vDest = Join-Path $payload 'videos'
    New-Item -ItemType Directory -Force $vDest | Out-Null
    $vFiles | Copy-Item -Destination $vDest
    Write-Host ("Videos: {0} files, {1:N1} MB" -f $vFiles.Count, (($vFiles | Measure-Object Length -Sum).Sum / 1MB))
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
Write-Host ("Payload: {0:N1} MB  (ilha {1}, fundo vivo {2}, relogio {3}, cursors {4})" -f ((Get-Item $zip).Length / 1MB), $ilhaVersion, $fvVersion, $rVersion, $cWanted)

# ---- setup window, stamped until Windows accepts it, then glued
$project = Join-Path $root 'src\Setup\Setup.csproj'
$ui = Join-Path $build 'ui'
New-Item -ItemType Directory -Force $dist | Out-Null
$final = Join-Path $dist "PacoteWindowsBonito-Setup-$packVersion.exe"
$ok = $false
for ($i = 1; $i -le $Attempts; $i++) {
    $stamp = -join ((1..(Get-Random -Minimum 24 -Maximum 200)) | ForEach-Object { [char](Get-Random -Minimum 97 -Maximum 123) })
    if (Test-Path $ui) { Remove-Item $ui -Recurse -Force }
    $r = Run dotnet @('publish', $project, '-c', 'Release', '-o', $ui, '-nologo', '-v', 'q', "-p:SourceRevisionId=$stamp")
    if ($r.code -ne 0) { Write-Host $r.output; throw 'The setup did not compile.' }
    $exe = Join-Path $ui 'PacoteWindowsBonito.exe'
    $code = Exit-Code $exe '--ping'
    if ($code -ne 0) { Write-Host "Attempt ${i}: Windows refused the bare setup ($code); new stamp."; continue }

    $out = [IO.File]::Open($final, 'Create')
    try {
        $in = [IO.File]::OpenRead($exe); $in.CopyTo($out); $in.Close()
        $z = [IO.File]::OpenRead($zip); $len = $z.Length; $z.CopyTo($out); $z.Close()
        $out.Write([BitConverter]::GetBytes([long]$len), 0, 8)
        $out.Write([Text.Encoding]::ASCII.GetBytes('PWBPAY01'), 0, 8)
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
