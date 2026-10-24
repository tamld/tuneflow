$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$pkg = Get-Content -Raw -Path (Join-Path $RepoRoot "package.json") | ConvertFrom-Json
$version = $pkg.version

Write-Host "==> [1/5] Preparing clean Windows distribution tree (TuneFlow v$version)..." -ForegroundColor Cyan
$unpackedDir = Join-Path $RepoRoot "dist\win-unpacked"
$installerDir = Join-Path $RepoRoot "dist\installer"

if (Test-Path $unpackedDir) { Remove-Item -Recurse -Force $unpackedDir }
if (-not (Test-Path $installerDir)) { New-Item -ItemType Directory -Force -Path $installerDir | Out-Null }
New-Item -ItemType Directory -Force -Path $unpackedDir | Out-Null

# Copy core runtime folders (excluding raw POSIX sidecars)
Copy-Item -Recurse -Force (Join-Path $RepoRoot "src") (Join-Path $unpackedDir "src")
Copy-Item -Recurse -Force (Join-Path $RepoRoot "public") (Join-Path $unpackedDir "public")
New-Item -ItemType Directory -Force -Path (Join-Path $unpackedDir "bin") | Out-Null
Copy-Item -Force (Join-Path $RepoRoot "bin\tuneflow.js") (Join-Path $unpackedDir "bin\tuneflow.js")
Copy-Item -Force (Join-Path $RepoRoot "package.json") (Join-Path $unpackedDir "package.json")

Write-Host "==> [1.5/5] Provisioning Windows x64 sidecars (yt-dlp.exe & ffmpeg.exe) & SHA256SUMS.json..." -ForegroundColor Cyan
$targetBinDir = Join-Path $unpackedDir "bin"
$ytdlpDest = Join-Path $targetBinDir "yt-dlp.exe"
$ffmpegDest = Join-Path $targetBinDir "ffmpeg.exe"

# 1.5a: Resolve or download standalone yt-dlp.exe (>= 1 MB, avoiding tiny shim wrappers)
$ytdlpCandidates = @(
  (Join-Path $RepoRoot "bin\yt-dlp.exe"),
  "$env:USERPROFILE\scoop\apps\yt-dlp\current\yt-dlp.exe"
)
if (Test-Path "C:\ProgramData\chocolatey\lib") {
  $chocoYtdlp = Get-ChildItem -Path "C:\ProgramData\chocolatey\lib\yt-dlp*" -Recurse -Filter "yt-dlp.exe" -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -ge 1MB } | Select-Object -First 1
  if ($chocoYtdlp) { $ytdlpCandidates += $chocoYtdlp.FullName }
}
$cmdYtdlp = Get-Command yt-dlp.exe -ErrorAction SilentlyContinue
if ($cmdYtdlp -and (Test-Path $cmdYtdlp.Source) -and ((Get-Item $cmdYtdlp.Source).Length -ge 1MB)) {
  $ytdlpCandidates += $cmdYtdlp.Source
}

$resolvedYtdlp = $ytdlpCandidates | Where-Object { $_ -and (Test-Path $_) -and ((Get-Item $_).Length -ge 1MB) } | Select-Object -First 1
if ($resolvedYtdlp) {
  Copy-Item -Force $resolvedYtdlp $ytdlpDest
  Write-Host "   Copied local standalone yt-dlp.exe from: $resolvedYtdlp" -ForegroundColor Green
} else {
  Write-Host "   Downloading official standalone yt-dlp.exe from GitHub Releases..." -ForegroundColor Yellow
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $ytdlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
  Invoke-WebRequest -Uri $ytdlpUrl -OutFile $ytdlpDest -UseBasicParsing
  if (-not (Test-Path $ytdlpDest) -or ((Get-Item $ytdlpDest).Length -lt 1MB)) {
    throw "Downloaded yt-dlp.exe is missing or smaller than 1 MB"
  }
  Write-Host "   Downloaded yt-dlp.exe ($([math]::Round((Get-Item $ytdlpDest).Length / 1MB, 2)) MB)" -ForegroundColor Green
}

# 1.5b: Resolve standalone ffmpeg.exe (>= 5 MB, avoiding 100 KB Chocolatey/Scoop shims)
$ffmpegCandidates = @(
  (Join-Path $RepoRoot "bin\ffmpeg.exe"),
  "$env:USERPROFILE\scoop\apps\ffmpeg\current\bin\ffmpeg.exe"
)
if (Test-Path "C:\ProgramData\chocolatey\lib") {
  $chocoFfmpeg = Get-ChildItem -Path "C:\ProgramData\chocolatey\lib\ffmpeg*" -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -ge 5MB } | Select-Object -First 1
  if ($chocoFfmpeg) { $ffmpegCandidates += $chocoFfmpeg.FullName }
}
$cmdFfmpeg = Get-Command ffmpeg.exe -ErrorAction SilentlyContinue
if ($cmdFfmpeg -and (Test-Path $cmdFfmpeg.Source) -and ((Get-Item $cmdFfmpeg.Source).Length -ge 5MB)) {
  $ffmpegCandidates += $cmdFfmpeg.Source
}

$resolvedFfmpeg = $ffmpegCandidates | Where-Object { $_ -and (Test-Path $_) -and ((Get-Item $_).Length -ge 5MB) } | Select-Object -First 1
if (-not $resolvedFfmpeg) {
  Write-Host "   Installing ffmpeg via Chocolatey to provision standalone ffmpeg.exe..." -ForegroundColor Yellow
  choco install ffmpeg --no-progress -y
  if (Test-Path "C:\ProgramData\chocolatey\lib") {
    $chocoFfmpeg = Get-ChildItem -Path "C:\ProgramData\chocolatey\lib\ffmpeg*" -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue |
      Where-Object { $_.Length -ge 5MB } | Select-Object -First 1
    if ($chocoFfmpeg) { $resolvedFfmpeg = $chocoFfmpeg.FullName }
  }
}
if (-not $resolvedFfmpeg -or -not (Test-Path $resolvedFfmpeg)) {
  throw "Could not resolve standalone ffmpeg.exe (>= 5 MB) for Windows bundle"
}
Copy-Item -Force $resolvedFfmpeg $ffmpegDest
Write-Host "   Bundled standalone ffmpeg.exe from: $resolvedFfmpeg ($([math]::Round((Get-Item $ffmpegDest).Length / 1MB, 2)) MB)" -ForegroundColor Green

# 1.5c: Generate SHA256SUMS.json for all bundled sidecars
node (Join-Path $RepoRoot "scripts\bundle-sidecars.js") --target $targetBinDir --include-ffmpeg
if ($LASTEXITCODE -ne 0) {
  throw "Failed to bundle sidecar binaries and generate SHA256SUMS.json"
}

Write-Host "==> [2/5] Bundling flat production node_modules (zero devDependencies, zero symlinks)..." -ForegroundColor Cyan
node (Join-Path $RepoRoot "scripts\bundle-prod-deps.js")
if ($LASTEXITCODE -ne 0) {
  throw "Failed to bundle production node_modules"
}
if (Test-Path (Join-Path $unpackedDir "node_modules\.pnpm")) {
  throw "SECURITY/PACKAGING GATE FAILED: pnpm symlink directory (.pnpm) leaked into dist\win-unpacked\node_modules"
}
if (Test-Path (Join-Path $unpackedDir "node_modules\puppeteer")) {
  throw "SECURITY/PACKAGING GATE FAILED: devDependency 'puppeteer' leaked into dist\win-unpacked\node_modules"
}

Write-Host "==> [3/5] Bundling standalone Node.js runtime & compiling TuneFlow.exe GUI launcher..." -ForegroundColor Cyan
$nodeExe = (Get-Command node).Source
Copy-Item -Force $nodeExe (Join-Path $unpackedDir "node.exe")

$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $cscPath)) {
  throw "Microsoft .NET C# compiler not found at $cscPath"
}

$iconPath = Join-Path $RepoRoot "public\icons\favicon.ico"
$launcherCs = Join-Path $RepoRoot "installer\windows\TuneFlowLauncher.cs"
$launcherOut = Join-Path $unpackedDir "TuneFlow.exe"

& $cscPath /nologo /target:winexe "/win32icon:$iconPath" /r:System.Windows.Forms.dll /r:System.Drawing.dll "/out:$launcherOut" $launcherCs
if ($LASTEXITCODE -ne 0) {
  throw "Failed to compile TuneFlow.exe from TuneFlowLauncher.cs"
}

# Smoke-test bundled runtime version
$smokeVer = & (Join-Path $unpackedDir "node.exe") (Join-Path $unpackedDir "bin\tuneflow.js") --version
if ($LASTEXITCODE -ne 0) {
  throw "Unpacked runtime --version smoke test failed"
}
Write-Host "   Smoke-tested unpacked runtime: TuneFlow $smokeVer" -ForegroundColor Green

Write-Host "==> [4/5] Compiling native Inno Setup 6 installer (installer\windows\setup.iss) & Portable ZIP..." -ForegroundColor Cyan
$portableZip = Join-Path $installerDir "TuneFlow-Portable-$version-win64.zip"
if (Test-Path $portableZip) { Remove-Item -Force $portableZip }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($unpackedDir, $portableZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$isccCandidates = @(
  "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
  "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
  "C:\Program Files\Inno Setup 6\ISCC.exe"
)
$isccPath = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $isccPath) {
  $cmd = Get-Command ISCC.exe -ErrorAction SilentlyContinue
  if ($cmd) { $isccPath = $cmd.Source }
}
if (-not $isccPath) {
  Write-Host "   Inno Setup 6 not found; installing via Chocolatey..." -ForegroundColor Yellow
  choco install innosetup --no-progress -y
  $isccPath = $isccCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $isccPath) {
  throw "Inno Setup 6 (ISCC.exe) not found. Install via: winget install --id JRSoftware.InnoSetup -e"
}

Write-Host "   Using Inno Setup Compiler: $isccPath"
& $isccPath (Join-Path $RepoRoot "installer\windows\setup.iss")
if ($LASTEXITCODE -ne 0) {
  throw "ISCC.exe failed to compile installer\windows\setup.iss"
}

Write-Host "==> [5/5] Generating SHA256SUMS-windows.txt..." -ForegroundColor Cyan
$checksumFile = Join-Path $installerDir "SHA256SUMS-windows.txt"
Get-ChildItem -Path $installerDir -File | Where-Object { $_.Extension -in ".exe", ".zip" } | ForEach-Object {
  $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
  "$hash  $($_.Name)"
} | Set-Content -Path $checksumFile -Encoding utf8

Write-Host "`nWindows Packaging Complete!" -ForegroundColor Green
Get-ChildItem -Path $installerDir | Select-Object Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB, 2)}}, FullName | Format-Table -AutoSize
