#!/bin/bash
set -euo pipefail

# ==============================================================================
# TuneFlow macOS Packaging & DMG Distribution Suite
# Authority: SPEC-0010 (REQ-DSK-03: Turn-key macOS Drag-to-Applications DMG)
# ==============================================================================

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

VERSION="$(node -p "require('./package.json').version")"
ARCH="$(uname -m)"

echo "📦 Packaging TuneFlow v${VERSION} for macOS (${ARCH})..."

DIST_DIR="$REPO_ROOT/dist"
MACOS_APP="$DIST_DIR/macos/TuneFlow.app"
DMG_STAGING="$DIST_DIR/dmg-staging"
INSTALLER_DIR="$DIST_DIR/installer"

rm -rf "$MACOS_APP" "$DMG_STAGING"
mkdir -p "$DIST_DIR/macos" "$DMG_STAGING" "$INSTALLER_DIR"

# 1. Ensure assets/branding/icon.icns exists
ICNS_PATH="$REPO_ROOT/assets/branding/icon.icns"
if [ ! -f "$ICNS_PATH" ]; then
    echo "🎨 Generating icon.icns from assets/branding/icon-512.png..."
    TMP_ICONSET="$(mktemp -d)/icon.iconset"
    mkdir -p "$TMP_ICONSET"
    SRC_IMG="$REPO_ROOT/assets/branding/icon-512.png"

    sips -z 16 16     "$SRC_IMG" --out "$TMP_ICONSET/icon_16x16.png" >/dev/null
    sips -z 32 32     "$SRC_IMG" --out "$TMP_ICONSET/icon_16x16@2x.png" >/dev/null
    sips -z 32 32     "$SRC_IMG" --out "$TMP_ICONSET/icon_32x32.png" >/dev/null
    sips -z 64 64     "$SRC_IMG" --out "$TMP_ICONSET/icon_32x32@2x.png" >/dev/null
    sips -z 128 128   "$SRC_IMG" --out "$TMP_ICONSET/icon_128x128.png" >/dev/null
    sips -z 256 256   "$SRC_IMG" --out "$TMP_ICONSET/icon_128x128@2x.png" >/dev/null
    sips -z 256 256   "$SRC_IMG" --out "$TMP_ICONSET/icon_256x256.png" >/dev/null
    sips -z 512 512   "$SRC_IMG" --out "$TMP_ICONSET/icon_256x256@2x.png" >/dev/null
    sips -z 512 512   "$SRC_IMG" --out "$TMP_ICONSET/icon_512x512.png" >/dev/null
    cp "$SRC_IMG" "$TMP_ICONSET/icon_512x512@2x.png"

    iconutil -c icns "$TMP_ICONSET" -o "$ICNS_PATH"
    rm -rf "$(dirname "$TMP_ICONSET")"
    echo "✅ Created $ICNS_PATH"
fi

# 2. Assemble TuneFlow.app bundle
echo "🔨 Building TuneFlow.app bundle..."
mkdir -p "$MACOS_APP/Contents/MacOS"
mkdir -p "$MACOS_APP/Contents/Resources/app"

# Info.plist & PkgInfo
cp "$REPO_ROOT/installer/macos/Info.plist" "$MACOS_APP/Contents/Info.plist"
echo -n "APPL????" > "$MACOS_APP/Contents/PkgInfo"

# Executable bootstrap: compile native Swift Cocoa window if swiftc is available, else fallback to launcher script
if command -v swiftc >/dev/null 2>&1 && [ -f "$REPO_ROOT/src/desktop/macos/main.swift" ]; then
    echo "⚡ Compiling native macOS Cocoa WebKit binary via swiftc..."
    swiftc -O "$REPO_ROOT/src/desktop/macos/main.swift" -framework Cocoa -framework WebKit -o "$MACOS_APP/Contents/MacOS/TuneFlow"
else
    cp "$REPO_ROOT/installer/macos/tuneflow-launcher.sh" "$MACOS_APP/Contents/MacOS/TuneFlow"
    chmod +x "$MACOS_APP/Contents/MacOS/TuneFlow"
fi

# Icon
cp "$ICNS_PATH" "$MACOS_APP/Contents/Resources/icon.icns"

# Application Payload
cp "$REPO_ROOT/package.json" "$MACOS_APP/Contents/Resources/app/"
cp -R "$REPO_ROOT/src" "$MACOS_APP/Contents/Resources/app/"
cp -R "$REPO_ROOT/public" "$MACOS_APP/Contents/Resources/app/"
cp -R "$REPO_ROOT/bin" "$MACOS_APP/Contents/Resources/app/"
chmod +x "$MACOS_APP/Contents/Resources/app/bin/tuneflow.js"
if [ -d "$REPO_ROOT/node_modules" ]; then
    cp -R "$REPO_ROOT/node_modules" "$MACOS_APP/Contents/Resources/app/"
fi

echo "✅ TuneFlow.app successfully assembled at: $MACOS_APP"

# 3. Create DMG Staging Directory
echo "📀 Preparing DMG drag-to-Applications layout..."
cp -R "$MACOS_APP" "$DMG_STAGING/TuneFlow.app"
ln -s /Applications "$DMG_STAGING/Applications"

# 4. Create DMG via hdiutil
DMG_FILE="$INSTALLER_DIR/TuneFlow-${VERSION}-macos-${ARCH}.dmg"
rm -f "$DMG_FILE"

echo "💿 Creating compressed UDZO disk image..."
hdiutil create \
    -volname "TuneFlow" \
    -srcfolder "$DMG_STAGING" \
    -ov \
    -format UDZO \
    "$DMG_FILE"

rm -rf "$DMG_STAGING"
echo "✅ DMG built: $DMG_FILE ($(du -h "$DMG_FILE" | cut -f1))"

# 5. Create Portable tar.gz archive
TAR_FILE="$INSTALLER_DIR/TuneFlow-${VERSION}-macos-${ARCH}.tar.gz"
echo "📦 Creating portable tar.gz bundle..."
tar -czf "$TAR_FILE" -C "$DIST_DIR/macos" TuneFlow.app
echo "✅ Tarball built: $TAR_FILE ($(du -h "$TAR_FILE" | cut -f1))"

# 6. Generate SHA-256 Manifest
echo "🔒 Computing SHA-256 checksums..."
cd "$INSTALLER_DIR"
shasum -a 256 "TuneFlow-${VERSION}-macos-${ARCH}.dmg" > "SHA256SUMS-macos-${ARCH}.txt"
shasum -a 256 "TuneFlow-${VERSION}-macos-${ARCH}.tar.gz" >> "SHA256SUMS-macos-${ARCH}.txt"

echo "🎉 macOS packaging complete!"
cat "SHA256SUMS-macos-${ARCH}.txt"
