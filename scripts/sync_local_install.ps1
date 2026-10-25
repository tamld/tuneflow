$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$pkg = Get-Content -Raw -Path (Join-Path $RepoRoot "package.json") | ConvertFrom-Json
$version = $pkg.version
$installDir = Join-Path $env:LOCALAPPDATA "Programs\TuneFlow"

Write-Host "==> [1/4] Stopping running TuneFlow desktop instances..." -ForegroundColor Cyan
Get-Process -Name "TuneFlow" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like "*tuneflow.js*" } | ForEach-Object {
  Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Milliseconds 600

if (-not (Test-Path $installDir)) {
  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
}

Write-Host "==> [2/4] Syncing source, public assets, and sidecars to $installDir..." -ForegroundColor Cyan
Copy-Item -Recurse -Force (Join-Path $RepoRoot "src") $installDir
Copy-Item -Recurse -Force (Join-Path $RepoRoot "public") $installDir
Copy-Item -Recurse -Force (Join-Path $RepoRoot "bin") $installDir
Copy-Item -Force (Join-Path $RepoRoot "package.json") (Join-Path $installDir "package.json")

node (Join-Path $RepoRoot "scripts\bundle-sidecars.js") --target (Join-Path $installDir "bin") --include-ffmpeg

$unpackedExe = Join-Path $RepoRoot "dist\win-unpacked\TuneFlow.exe"
if (Test-Path $unpackedExe) {
  Copy-Item -Force $unpackedExe (Join-Path $installDir "TuneFlow.exe")
}

$setupExe = Join-Path $RepoRoot "dist\installer\TuneFlow-Setup-$version.exe"
$desktopExe = Join-Path ([Environment]::GetFolderPath("Desktop")) "TuneFlow-Setup-$version.exe"
if (Test-Path $setupExe) {
  Write-Host "==> [3/4] Updating Desktop installer ($desktopExe)..." -ForegroundColor Cyan
  Copy-Item -Force $setupExe $desktopExe
}

$installedExe = Join-Path $installDir "TuneFlow.exe"
if (Test-Path $installedExe) {
  Write-Host "==> [4/4] Launching $installedExe..." -ForegroundColor Green
  Start-Process -FilePath $installedExe
}
