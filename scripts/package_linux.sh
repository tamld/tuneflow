#!/bin/bash
set -euo pipefail

# ==============================================================================
# TuneFlow Linux Packaging & Portable Distribution Suite
# Authority: SPEC-0010 (REQ-DSK-04: Linux Tri-Format Distribution)
# ==============================================================================

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

VERSION="$(node -p "require('./package.json').version")"
ARCH="$(uname -m)"
if [ "$ARCH" = "x86_64" ]; then
    ARCH_TAG="x64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    ARCH_TAG="arm64"
else
    ARCH_TAG="$ARCH"
fi

echo "📦 Packaging TuneFlow v${VERSION} for Linux (${ARCH_TAG})..."

DIST_DIR="$REPO_ROOT/dist"
LINUX_UNPACKED="$DIST_DIR/linux-unpacked/TuneFlow"
INSTALLER_DIR="$DIST_DIR/installer"

rm -rf "$LINUX_UNPACKED"
mkdir -p "$LINUX_UNPACKED/bin" "$INSTALLER_DIR"

# 1. Launcher script for Linux
cat << 'EOF' > "$LINUX_UNPACKED/bin/tuneflow"
#!/bin/bash
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR"

NODE_CMD="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_CMD" ]; then
    echo "❌ Error: Node.js >= 20.0.0 is required to run TuneFlow."
    echo "Please install Node.js: https://nodejs.org"
    exit 1
fi

exec "$NODE_CMD" "$DIR/bin/tuneflow.js" "$@"
EOF
chmod +x "$LINUX_UNPACKED/bin/tuneflow"

# 2. Copy application payload
cp "$REPO_ROOT/package.json" "$LINUX_UNPACKED/"
cp -R "$REPO_ROOT/src" "$LINUX_UNPACKED/"
cp -R "$REPO_ROOT/public" "$LINUX_UNPACKED/"
cp "$REPO_ROOT/bin/tuneflow.js" "$LINUX_UNPACKED/bin/"
chmod +x "$LINUX_UNPACKED/bin/tuneflow.js"

# 3. Copy FreeDesktop desktop entry and icon
mkdir -p "$LINUX_UNPACKED/share/applications" "$LINUX_UNPACKED/share/icons/hicolor/512x512/apps"
cp "$REPO_ROOT/installer/linux/tuneflow.desktop" "$LINUX_UNPACKED/share/applications/"
cp "$REPO_ROOT/assets/branding/icon-512.png" "$LINUX_UNPACKED/share/icons/hicolor/512x512/apps/tuneflow.png"

# 4. Create Desktop tar.gz archive
TAR_FILE="$INSTALLER_DIR/TuneFlow-${VERSION}-linux-${ARCH_TAG}.tar.gz"
echo "📦 Creating portable desktop tar.gz archive..."
tar -czf "$TAR_FILE" -C "$DIST_DIR/linux-unpacked" TuneFlow
echo "✅ Linux portable tarball built: $TAR_FILE ($(du -h "$TAR_FILE" | cut -f1))"

# 5. Package Headless Linux Server Archive (SPEC-0010 / REQ-SRV-01)
SERVER_UNPACKED="$DIST_DIR/linux-unpacked/TuneFlow-Server"
rm -rf "$SERVER_UNPACKED"
mkdir -p "$SERVER_UNPACKED/bin" "$SERVER_UNPACKED/installer/server"

cp "$REPO_ROOT/package.json" "$SERVER_UNPACKED/"
cp -R "$REPO_ROOT/src" "$SERVER_UNPACKED/"
cp -R "$REPO_ROOT/public" "$SERVER_UNPACKED/"
cp "$REPO_ROOT/bin/tuneflow.js" "$SERVER_UNPACKED/bin/"
chmod +x "$SERVER_UNPACKED/bin/tuneflow.js"
cp "$REPO_ROOT/installer/server/install.sh" "$SERVER_UNPACKED/installer/server/"
cp "$REPO_ROOT/installer/server/tuneflow.service" "$SERVER_UNPACKED/installer/server/"
cp "$REPO_ROOT/installer/server/tuneflow.env.example" "$SERVER_UNPACKED/installer/server/"
chmod +x "$SERVER_UNPACKED/installer/server/install.sh"

SERVER_TAR="$INSTALLER_DIR/TuneFlow-${VERSION}-headless-server.tar.gz"
echo "📦 Creating headless server tar.gz archive..."
tar -czf "$SERVER_TAR" -C "$DIST_DIR/linux-unpacked" TuneFlow-Server
echo "✅ Headless server tarball built: $SERVER_TAR ($(du -h "$SERVER_TAR" | cut -f1))"

# 6. Compute SHA-256 Checksums
cd "$INSTALLER_DIR"
SUMS_FILE="SHA256SUMS-linux-${ARCH_TAG}.txt"
rm -f "$SUMS_FILE"
if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "TuneFlow-${VERSION}-linux-${ARCH_TAG}.tar.gz" >> "$SUMS_FILE"
    sha256sum "TuneFlow-${VERSION}-headless-server.tar.gz" >> "$SUMS_FILE"
elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "TuneFlow-${VERSION}-linux-${ARCH_TAG}.tar.gz" >> "$SUMS_FILE"
    shasum -a 256 "TuneFlow-${VERSION}-headless-server.tar.gz" >> "$SUMS_FILE"
fi

echo "🎉 Linux packaging complete!"
cat "$SUMS_FILE"

