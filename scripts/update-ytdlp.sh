#!/bin/sh
# ==============================================================================
# TuneFlow - yt-dlp Auto-Update & Maintenance Script for Docker / Podman Hosts
# ==============================================================================

set -e

echo "🔍 [TuneFlow Ops] Checking for yt-dlp updates..."

if [ -w "/usr/local/bin/yt-dlp" ]; then
    echo "⚡ Updating /usr/local/bin/yt-dlp in-place..."
    curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp" -o /usr/local/bin/yt-dlp
    chmod a+rx /usr/local/bin/yt-dlp
    echo "✅ [TuneFlow Ops] Updated successfully to version: $(yt-dlp --version)"
elif command -v yt-dlp >/dev/null 2>&1; then
    echo "⚡ Running yt-dlp -U..."
    yt-dlp -U || true
    echo "✅ [TuneFlow Ops] Current version: $(yt-dlp --version)"
else
    echo "⚠️ yt-dlp not found in PATH or permission denied."
    exit 1
fi
