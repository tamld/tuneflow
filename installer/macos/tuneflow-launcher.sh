#!/bin/bash
set -e

# ==============================================================================
# TuneFlow macOS Application Bundle Launcher
# ==============================================================================

DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$DIR/../Resources/app" && pwd)"
cd "$APP_DIR"

# Resolve Node.js binary (Apple Silicon Homebrew, Intel Homebrew, or system PATH)
NODE_CMD=""
if [ -x "/opt/homebrew/bin/node" ]; then
    NODE_CMD="/opt/homebrew/bin/node"
elif [ -x "/usr/local/bin/node" ]; then
    NODE_CMD="/usr/local/bin/node"
elif command -v node >/dev/null 2>&1; then
    NODE_CMD="$(command -v node)"
fi

if [ -z "$NODE_CMD" ]; then
    osascript -e 'display alert "Node.js Required" message "TuneFlow requires Node.js >= 20.0.0 to run. Please install Node.js (from https://nodejs.org or via brew install node) and relaunch TuneFlow." as critical'
    exit 1
fi

# Execute TuneFlow Desktop Runner
exec "$NODE_CMD" "$APP_DIR/bin/tuneflow.js" "$@"
