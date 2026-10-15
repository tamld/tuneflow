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

Write-Host "==> [4/5] Creating Portable ZIP & compiling TuneFlow-Setup-$version.exe..." -ForegroundColor Cyan
$portableZip = Join-Path $installerDir "TuneFlow-Portable-$version-win64.zip"
$payloadZip = Join-Path $RepoRoot "dist\payload.zip"
if (Test-Path $portableZip) { Remove-Item -Force $portableZip }
if (Test-Path $payloadZip) { Remove-Item -Force $payloadZip }

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($unpackedDir, $payloadZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Copy-Item -Force $payloadZip $portableZip

$setupOut = Join-Path $installerDir "TuneFlow-Setup-$version.exe"
if (Test-Path $setupOut) { Remove-Item -Force $setupOut }

$isccPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (Test-Path $isccPath) {
  Write-Host "   Found Inno Setup 6, compiling installer\windows\setup.iss..."
  & $isccPath (Join-Path $RepoRoot "installer\windows\setup.iss")
} else {
  Write-Host "   Compiling self-contained WinForms Setup Wizard (TuneFlowSetupWizard.cs)..."
  $wizardCs = Join-Path $RepoRoot "installer\windows\TuneFlowSetupWizard.cs"
  & $cscPath /nologo /target:winexe "/win32icon:$iconPath" `
    /r:System.Windows.Forms.dll `
    /r:System.Drawing.dll `
    /r:System.IO.Compression.dll `
    /r:System.IO.Compression.FileSystem.dll `
    "/res:$payloadZip,TuneFlow.Payload.zip" `
    "/out:$setupOut" `
    $wizardCs
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to compile TuneFlow-Setup-$version.exe"
  }
}

if (Test-Path $payloadZip) { Remove-Item -Force $payloadZip }

Write-Host "==> [5/5] Generating SHA256SUMS-windows.txt..." -ForegroundColor Cyan
$checksumFile = Join-Path $installerDir "SHA256SUMS-windows.txt"
Get-ChildItem -Path $installerDir -File | Where-Object { $_.Extension -in ".exe", ".zip" } | ForEach-Object {
  $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLower()
  "$hash  $($_.Name)"
} | Set-Content -Path $checksumFile -Encoding utf8

Write-Host "`n✅ Windows Packaging Complete!" -ForegroundColor Green
Get-ChildItem -Path $installerDir | Select-Object Name, @{N='SizeMB';E={[math]::Round($_.Length/1MB, 2)}}, FullName | Format-Table -AutoSize
