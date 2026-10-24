<#
.SYNOPSIS
  TuneFlow Gold-Standard Windows Installer Live E2E Verification Gate (SPEC-0010 / SPEC-0017)
.DESCRIPTION
  Executes 4 mechanical verification gates against the built Windows distribution and Inno Setup installer:
    Gate 1: Unpacked Bundle & Installer Artifact Hygiene (flat node_modules, zero .pnpm/puppeteer, standalone sidecars + SHA256SUMS.json)
    Gate 2: Silent Zero-Admin Installation (/VERYSILENT) into an isolated temp directory outside the git workspace + Windows Registry contract audit
    Gate 3: Live Installed Runtime Execution (isolated PATH without host Chocolatey/Scoop) -> CLI `--doctor` + HTTP `/api/health`, `/api/system/doctor`, and `/?desktop=1` UI verification
    Gate 4: Silent Uninstallation (`unins000.exe /VERYSILENT`) + clean removal verification
#>

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$pkg = Get-Content -Raw -Path (Join-Path $RepoRoot "package.json") | ConvertFrom-Json
$version = $pkg.version

$unpackedDir = Join-Path $RepoRoot "dist\win-unpacked"
$installerDir = Join-Path $RepoRoot "dist\installer"
$setupExe = Join-Path $installerDir "TuneFlow-Setup-$version.exe"
$portableZip = Join-Path $installerDir "TuneFlow-Portable-$version-win64.zip"

Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  TuneFlow Windows Installer Live E2E Verification Gate (v$version)" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan

# ==============================================================================
# GATE 1: Artifact & Unpacked Bundle Hygiene Audit
# ==============================================================================
Write-Host "`n==> [Gate 1/4] Auditing unpacked bundle & installer artifact hygiene..." -ForegroundColor Cyan

if (-not (Test-Path $setupExe)) {
  throw "GATE 1 FAILED: Installer executable missing at $setupExe"
}
$setupSizeMB = [math]::Round((Get-Item $setupExe).Length / 1MB, 2)
if ($setupSizeMB -lt 15) {
  throw "GATE 1 FAILED: Installer $setupExe is suspiciously small ($setupSizeMB MB < 15 MB)"
}
Write-Host "   [PASS] TuneFlow-Setup-$version.exe exists ($setupSizeMB MB)" -ForegroundColor Green

if (-not (Test-Path $portableZip)) {
  throw "GATE 1 FAILED: Portable archive missing at $portableZip"
}
Write-Host "   [PASS] TuneFlow-Portable-$version-win64.zip exists" -ForegroundColor Green

if (Test-Path (Join-Path $unpackedDir "node_modules\.pnpm")) {
  throw "GATE 1 FAILED: pnpm symlink directory (.pnpm) detected in dist\win-unpacked\node_modules"
}
if (Test-Path (Join-Path $unpackedDir "node_modules\puppeteer")) {
  throw "GATE 1 FAILED: devDependency 'puppeteer' detected in dist\win-unpacked\node_modules"
}
Write-Host "   [PASS] Flat production node_modules verified (0 .pnpm symlinks, 0 puppeteer bloat)" -ForegroundColor Green

foreach ($reqFile in @("TuneFlow.exe", "node.exe", "bin\tuneflow.js", "bin\yt-dlp.exe", "bin\ffmpeg.exe", "bin\SHA256SUMS.json")) {
  $fullPath = Join-Path $unpackedDir $reqFile
  if (-not (Test-Path $fullPath)) {
    throw "GATE 1 FAILED: Required file missing in unpacked bundle: $reqFile"
  }
}
if ((Get-Item (Join-Path $unpackedDir "bin\yt-dlp.exe")).Length -lt 1MB) {
  throw "GATE 1 FAILED: Bundled bin\yt-dlp.exe is smaller than 1 MB (shim detected)"
}
if ((Get-Item (Join-Path $unpackedDir "bin\ffmpeg.exe")).Length -lt 5MB) {
  throw "GATE 1 FAILED: Bundled bin\ffmpeg.exe is smaller than 5 MB (shim detected)"
}
Write-Host "   [PASS] Standalone sidecars (yt-dlp.exe, ffmpeg.exe) and SHA256SUMS.json verified" -ForegroundColor Green

# ==============================================================================
# GATE 2: Silent Zero-Admin Installation & Windows Registry Contract Audit
# ==============================================================================
$installDir = Join-Path $env:TEMP "TuneFlow-E2E-Installed-$PID"
if (Test-Path $installDir) {
  Remove-Item -Recurse -Force $installDir
}

Write-Host "`n==> [Gate 2/4] Running silent Zero-Admin installation into $installDir..." -ForegroundColor Cyan
$installProc = Start-Process -FilePath $setupExe -ArgumentList @(
  "/VERYSILENT",
  "/SUPPRESSMSGBOXES",
  "/NORESTART",
  "/SP-",
  ("/DIR=" + $installDir)
) -Wait -PassThru

if ($installProc.ExitCode -ne 0) {
  throw "GATE 2 FAILED: TuneFlow-Setup-$version.exe exited with code $($installProc.ExitCode)"
}

foreach ($installedFile in @("TuneFlow.exe", "node.exe", "bin\tuneflow.js", "bin\yt-dlp.exe", "bin\ffmpeg.exe", "bin\SHA256SUMS.json", "unins000.exe")) {
  $targetPath = Join-Path $installDir $installedFile
  if (-not (Test-Path $targetPath)) {
    throw "GATE 2 FAILED: Installed file missing after silent setup: $targetPath"
  }
}
Write-Host "   [PASS] Silent installation succeeded with all runtime & sidecar binaries present" -ForegroundColor Green

$appPathReg = "HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\TuneFlow.exe"
$protocolReg = "HKCU:\Software\Classes\tuneflow"
if (-not (Test-Path $appPathReg)) {
  throw "GATE 2 FAILED: Registry key missing: $appPathReg"
}
if (-not (Test-Path $protocolReg)) {
  throw "GATE 2 FAILED: Registry key missing: $protocolReg"
}
Write-Host "   [PASS] Windows Registry contracts (App Paths & tuneflow:// URL Protocol) verified" -ForegroundColor Green

# ==============================================================================
# GATE 3: Isolated Installed Runtime + Sidecar Doctor + Live HTTP E2E
# ==============================================================================
Write-Host "`n==> [Gate 3/4] Verifying installed runtime & sidecars in isolated environment..." -ForegroundColor Cyan

$origPath = $env:PATH
$daemonProc = $null
try {
  # Strip host Chocolatey/Scoop from PATH so installed app MUST use its own bundled node.exe, yt-dlp.exe & ffmpeg.exe
  $env:PATH = "$installDir;$installDir\bin;C:\Windows\System32;C:\Windows;C:\Windows\System32\Wbem"

  Push-Location $installDir
  try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $doctorLines = & "$installDir\node.exe" "$installDir\bin\tuneflow.js" --doctor
    if ($LASTEXITCODE -ne 0) {
      throw "GATE 3 FAILED: Installed CLI `--doctor` exited with code $LASTEXITCODE"
    }
    $doctorRaw = ($doctorLines -join "`n").Trim()
    $doctorJson = $doctorRaw | ConvertFrom-Json
    if (-not $doctorJson.ok) {
      throw "GATE 3 FAILED: Installed CLI `--doctor` reported ok=false: $doctorRaw"
    }
    if (-not $doctorJson.checks.ytdlp.ok -or $doctorJson.checks.ytdlp.status -ne "operational") {
      throw "GATE 3 FAILED: Installed yt-dlp.exe sidecar not operational: $($doctorJson.checks.ytdlp | ConvertTo-Json -Compress)"
    }
    if (-not $doctorJson.checks.ffmpeg.ok -or $doctorJson.checks.ffmpeg.status -ne "operational") {
      throw "GATE 3 FAILED: Installed ffmpeg.exe sidecar not operational: $($doctorJson.checks.ffmpeg | ConvertTo-Json -Compress)"
    }
    Write-Host "   [PASS] Installed CLI `--doctor` verified: yt-dlp=$($doctorJson.checks.ytdlp.version), ffmpeg=$($doctorJson.checks.ffmpeg.version)" -ForegroundColor Green

    $cliVersionRaw = (& "$installDir\node.exe" "$installDir\bin\tuneflow.js" --version | Out-String).Trim()
    if ($cliVersionRaw -ne "v$version") {
      throw "GATE 3 FAILED: Installed CLI `--version` mismatch: expected v$version, got $cliVersionRaw"
    }
    Write-Host "   [PASS] Installed CLI `--version` verified ($cliVersionRaw)" -ForegroundColor Green

    # Start installed daemon on port 3099 and probe live HTTP endpoints
    $testPort = 3099
    $installedCli = Join-Path $installDir "bin\tuneflow.js"
    $daemonOutLog = Join-Path $installDir "daemon-out.log"
    $daemonErrLog = Join-Path $installDir "daemon-err.log"
    $daemonProc = Start-Process -FilePath (Join-Path $installDir "node.exe") `
      -ArgumentList @("`"$installedCli`"", "--daemon", "--no-browser", "--port", "$testPort") `
      -WorkingDirectory $installDir `
      -RedirectStandardOutput $daemonOutLog `
      -RedirectStandardError $daemonErrLog `
      -WindowStyle Hidden `
      -PassThru

    $healthOk = $false
    $healthBody = $null
    for ($i = 0; $i -lt 40; $i++) {
      if ($daemonProc.HasExited) {
        $errDump = if (Test-Path $daemonErrLog) { Get-Content $daemonErrLog -Raw } else { "" }
        throw "GATE 3 FAILED: Installed daemon process exited prematurely with code $($daemonProc.ExitCode). Stderr: $errDump"
      }
      try {
        $healthBody = Invoke-RestMethod -Uri "http://127.0.0.1:$testPort/api/health" -TimeoutSec 2
        if ($healthBody -and ($healthBody.ok -eq $true -or $healthBody.status -eq "healthy")) {
          $healthOk = $true
          break
        }
      } catch {
        # Ignore transient connection errors while server boots
      }
      Start-Sleep -Milliseconds 300
    }
    if (-not $healthOk) {
      $outDump = if (Test-Path $daemonOutLog) { Get-Content $daemonOutLog -Raw } else { "" }
      $errDump = if (Test-Path $daemonErrLog) { Get-Content $daemonErrLog -Raw } else { "" }
      throw "GATE 3 FAILED: Installed daemon did not respond healthy on http://127.0.0.1:$testPort/api/health. Out: $outDump | Err: $errDump"
    }
    Write-Host "   [PASS] Live HTTP /api/health verified (status=$($healthBody.status), ok=$($healthBody.ok))" -ForegroundColor Green

    $httpDoctor = Invoke-RestMethod -Uri "http://127.0.0.1:$testPort/api/system/doctor" -TimeoutSec 10
    if (-not $httpDoctor.ok -or -not $httpDoctor.checks.ytdlp.ok -or -not $httpDoctor.checks.ffmpeg.ok) {
      throw "GATE 3 FAILED: Live HTTP /api/system/doctor failed sidecar check: $($httpDoctor | ConvertTo-Json -Compress)"
    }
    Write-Host "   [PASS] Live HTTP /api/system/doctor verified (status=$($httpDoctor.status))" -ForegroundColor Green

    $desktopHtml = (Invoke-WebRequest -Uri "http://127.0.0.1:$testPort/?desktop=1" -UseBasicParsing -TimeoutSec 5).Content
    if ($desktopHtml -notmatch 'id="meta-theme-color"' -or $desktopHtml -notmatch '/fonts/be-vietnam-pro\.css') {
      throw "GATE 3 FAILED: Desktop App Shell HTML missing required meta-theme-color or Be Vietnam Pro font link"
    }
    Write-Host "   [PASS] Live Desktop App Shell UI (/?desktop=1) verified" -ForegroundColor Green
  } finally {
    Pop-Location
  }
} finally {
  $env:PATH = $origPath
  if ($daemonProc -and -not $daemonProc.HasExited) {
    try { Stop-Process -Id $daemonProc.Id -Force -ErrorAction SilentlyContinue } catch {}
  }
}

# ==============================================================================
# GATE 4: Silent Uninstaller & Registry Cleanup Verification
# ==============================================================================
Write-Host "`n==> [Gate 4/4] Running silent uninstaller & verifying clean removal..." -ForegroundColor Cyan
$uninsExe = Join-Path $installDir "unins000.exe"
$uninsProc = Start-Process -FilePath $uninsExe -ArgumentList @(
  "/VERYSILENT",
  "/SUPPRESSMSGBOXES",
  "/NORESTART"
) -Wait -PassThru

if ($uninsProc.ExitCode -ne 0) {
  throw "GATE 4 FAILED: Uninstaller exited with code $($uninsProc.ExitCode)"
}

# Allow Windows filesystem a brief moment to release uninstaller handle
Start-Sleep -Seconds 1
if (Test-Path (Join-Path $installDir "TuneFlow.exe")) {
  throw "GATE 4 FAILED: TuneFlow.exe still exists after silent uninstall"
}
if (Test-Path $appPathReg) {
  throw "GATE 4 FAILED: Registry key still exists after uninstall: $appPathReg"
}
if (Test-Path $protocolReg) {
  throw "GATE 4 FAILED: Registry key still exists after uninstall: $protocolReg"
}
if (Test-Path $installDir) {
  Remove-Item -Recurse -Force $installDir -ErrorAction SilentlyContinue
}
Write-Host "   [PASS] Silent uninstallation & registry cleanup verified" -ForegroundColor Green

Write-Host "`n================================================================================" -ForegroundColor Green
Write-Host "  ALL 4 WINDOWS INSTALLER E2E GATES PASSED SUCCESSFULLY (TuneFlow v$version)" -ForegroundColor Green
Write-Host "================================================================================" -ForegroundColor Green
