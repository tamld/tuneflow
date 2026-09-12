#!/usr/bin/env bash
# ==============================================================================
# TuneFlow Linux Desktop Integration & Local Installer
# Installs TuneFlow into user or system desktop directories conforming to the
# XDG FreeDesktop standard for instant recognition in GNOME, KDE, Rofi, etc.
# Documentation: https://github.com/tamld/tuneflow
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SYSTEM_INSTALL=false
for arg in "$@"; do
    case "$arg" in
        --system)
            SYSTEM_INSTALL=true
            ;;
        --help|-h)
            echo "Usage: $0 [--system]"
            echo "  --system   Install system-wide into /usr/local (requires root/sudo)"
            echo "  (default)  Install for current user into ~/.local"
            exit 0
            ;;
    esac
done

if [ "$SYSTEM_INSTALL" = true ]; then
    if [ "${EUID:-$(id -u)}" -ne 0 ]; then
        echo "❌ System-wide installation requires root privileges (run with sudo)." >&2
        exit 1
    fi
    TARGET_PREFIX="/usr/local"
    INSTALL_DIR="$TARGET_PREFIX/share/tuneflow"
    BIN_DIR="$TARGET_PREFIX/bin"
    APP_DIR="$TARGET_PREFIX/share/applications"
    ICON_DIR="$TARGET_PREFIX/share/icons/hicolor/512x512/apps"
else
    TARGET_PREFIX="${HOME}/.local"
    INSTALL_DIR="$TARGET_PREFIX/share/tuneflow"
    BIN_DIR="$TARGET_PREFIX/bin"
    APP_DIR="$TARGET_PREFIX/share/applications"
    ICON_DIR="$TARGET_PREFIX/share/icons/hicolor/512x512/apps"
fi

echo "🐧 Installing TuneFlow Linux Desktop Integration..."
echo "• Target Directory: $INSTALL_DIR"
echo "• Binary Symlink  : $BIN_DIR/tuneflow"
echo "• Desktop Entry   : $APP_DIR/tuneflow.desktop"

# 1. Create directory structures
mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$APP_DIR" "$ICON_DIR"

# 2. Deploy application payload
cp -R "$REPO_ROOT/src" "$INSTALL_DIR/"
cp -R "$REPO_ROOT/public" "$INSTALL_DIR/"
cp -R "$REPO_ROOT/bin" "$INSTALL_DIR/"
cp "$REPO_ROOT/package.json" "$INSTALL_DIR/"

if [ -d "$REPO_ROOT/node_modules" ]; then
    cp -R "$REPO_ROOT/node_modules" "$INSTALL_DIR/"
fi

# 3. Create wrapper script
cat << EOF > "$BIN_DIR/tuneflow"
#!/usr/bin/env bash
DIR="$INSTALL_DIR"
NODE_BIN="\$(command -v node 2>/dev/null || true)"
if [ -z "\$NODE_BIN" ]; then
    echo "❌ Error: Node.js >= 20.0.0 is required to run TuneFlow." >&2
    exit 1
fi
exec "\$NODE_BIN" "\$DIR/bin/tuneflow.js" "\$@"
EOF
chmod +x "$BIN_DIR/tuneflow"

# 4. Deploy Icon
ICON_SRC="$REPO_ROOT/assets/branding/icon-512.png"
if [ -f "$ICON_SRC" ]; then
    cp "$ICON_SRC" "$ICON_DIR/tuneflow.png"
fi

# 5. Deploy FreeDesktop .desktop entry
DESKTOP_SRC="$REPO_ROOT/installer/linux/tuneflow.desktop"
sed "s|^Exec=.*|Exec=$BIN_DIR/tuneflow %U|" "$DESKTOP_SRC" > "$APP_DIR/tuneflow.desktop"
chmod 644 "$APP_DIR/tuneflow.desktop"

# 6. Update system caches if tools exist
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$APP_DIR" 2>/dev/null || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "$(dirname "$(dirname "$ICON_DIR")")" 2>/dev/null || true
fi

echo "✅ TuneFlow Linux Desktop integration successfully installed!"
echo "⚡ You can now launch TuneFlow from your Application Menu, Rofi, or terminal ('tuneflow')."
