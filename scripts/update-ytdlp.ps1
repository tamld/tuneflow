# ==============================================================================
# TuneFlow - yt-dlp Auto-Update & Maintenance Script for Windows Homelab
# ==============================================================================

Write-Host "🔍 [TuneFlow Ops] Checking for yt-dlp updates..." -ForegroundColor Cyan

$ytdlp = Get-Command yt-dlp -ErrorAction SilentlyContinue

if ($ytdlp) {
    Write-Host "⚡ Executing yt-dlp -U..." -ForegroundColor Yellow
    & yt-dlp -U
    $ver = (& yt-dlp --version)
    Write-Host "✅ [TuneFlow Ops] Current yt-dlp version: $ver" -ForegroundColor Green
} else {
    Write-Host "⚠️ yt-dlp not found in system PATH. Attempting winget or direct curl..." -ForegroundColor Red
}
