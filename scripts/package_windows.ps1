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

# Copy core runtime folders
Copy-Item -Recurse -Force (Join-Path $RepoRoot "src") (Join-Path $unpackedDir "src")
Copy-Item -Recurse -Force (Join-Path $RepoRoot "public") (Join-Path $unpackedDir "public")
Copy-Item -Recurse -Force (Join-Path $RepoRoot "bin") (Join-Path $unpackedDir "bin")
Copy-Item -Force (Join-Path $RepoRoot "package.json") (Join-Path $unpackedDir "package.json")

Write-Host "==> [1.5/5] Bundling self-contained sidecar binaries & SHA256SUMS.json..." -ForegroundColor Cyan
node (Join-Path $RepoRoot "scripts\bundle-sidecars.js") --target (Join-Path $unpackedDir "bin")
if ($LASTEXITCODE -ne 0) {
  throw "Failed to bundle sidecar binaries"
}

Write-Host "==> [2/5] Bundling flat production node_modules (zero devDependencies, zero symlinks)..." -ForegroundColor Cyan
node (Join-Path $RepoRoot "scripts\bundle-prod-deps.js")
if ($LASTEXITCODE -ne 0) {
  throw "Failed to bundle production node_modules"
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

# Smoke-test bundled runtime
$smokeVer = & (Join-Path $unpackedDir "node.exe") (Join-Path $unpackedDir "bin\tuneflow.js") --version
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
