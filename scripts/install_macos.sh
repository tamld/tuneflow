#!/usr/bin/env bash
# ==============================================================================
# TuneFlow macOS Local Applications Installer
# Compiles/assembles TuneFlow.app and registers it into /Applications for
# native discovery via Finder, Spotlight (Cmd+Space), and Raycast.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🍏 TuneFlow macOS Application Installer"
echo "========================================"

# Run package script with --install flag forwarded
exec "$REPO_ROOT/scripts/package_macos.sh" --install "$@"
