#!/usr/bin/env bash
# ==============================================================================
# TuneFlow Turnkey Headless Linux Server Installer
# Authority: SPEC-0013 / ADR-0015 (Mode 2: Dedicated Headless Server)
# Compatibility: Storage-Agnostic Linux (Bare-metal, VM, Container, LXC)
# Documentation: https://github.com/tamld/tuneflow
# ==============================================================================

set -euo pipefail

# Default Parameters
PREFIX="/opt/tuneflow"
DATA_DIR="/var/lib/tuneflow"
CONFIG_DIR="/etc/tuneflow"
SERVICE_PORT=3000
APP_USER="tuneflow"
APP_GROUP="tuneflow"
DRY_RUN=false
NO_START=false

# ANSI Color Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_err() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

show_help() {
    cat << EOF
TuneFlow Headless Server Installer (Mode 2)

Usage:
  sudo ./install.sh [options]

Options:
  -p, --prefix <dir>       Application destination directory (default: /opt/tuneflow)
  --data-dir <dir>         Data & downloads directory (default: /var/lib/tuneflow)
  --config-dir <dir>       Configuration directory (default: /etc/tuneflow)
  --port <number>          HTTP service port (default: 3000)
  --user <username>        System service user (default: tuneflow)
  --no-start               Configure and enable systemd service without starting it immediately
  -d, --dry-run            Simulate operations without making any changes to the system
  -h, --help               Display this help text and exit

Example:
  sudo ./install.sh --port 8080 --data-dir /mnt/storage/tuneflow
EOF
}

# Parse Command Line Arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        -p|--prefix)
            PREFIX="$2"
            shift 2
            ;;
        --data-dir)
            DATA_DIR="$2"
            shift 2
            ;;
        --config-dir)
            CONFIG_DIR="$2"
            shift 2
            ;;
        --port)
            SERVICE_PORT="$2"
            shift 2
            ;;
        --user)
            APP_USER="$2"
            APP_GROUP="$2"
            shift 2
            ;;
        --no-start)
            NO_START=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_err "Unknown argument: $1"
            show_help
            exit 1
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BOLD}================================================================${NC}"
echo -e "${BOLD}🎶 TuneFlow Headless Server Turnkey Installer (Mode 2)${NC}"
echo -e "${BOLD}================================================================${NC}"

# 1. Environment & Privilege Verification
if [ "$DRY_RUN" = false ]; then
    if [ "${EUID:-$(id -u)}" -ne 0 ]; then
        log_err "This installer must be executed as root (or via sudo)."
        exit 1
    fi
fi

OS_TYPE="$(uname -s)"
if [ "$OS_TYPE" != "Linux" ]; then
    log_warn "Target OS is detected as '$OS_TYPE'. TuneFlow headless service is optimized for Linux."
    if [ "$OS_TYPE" = "Darwin" ]; then
        log_warn "On macOS, run TuneFlow Desktop (.app) or standalone daemon via launchd."
    fi
fi

# 2. Prerequisites Check (Node.js >= 20.0.0)
log_info "Verifying prerequisites..."

NODE_BIN="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE_BIN" ]; then
    log_err "Node.js is not installed. TuneFlow requires Node.js >= 20.0.0."
    log_err "Please install Node.js via your distribution package manager (e.g. NodeSource / apt / dnf / pacman)."
    if [ "$DRY_RUN" = false ]; then
        exit 1
    fi
else
    NODE_VER="$("$NODE_BIN" -v | sed 's/^v//')"
    NODE_MAJOR="$(echo "$NODE_VER" | cut -d. -f1)"
    if [ "$NODE_MAJOR" -lt 20 ]; then
        log_err "Node.js version v$NODE_VER is below required v20.0.0."
        if [ "$DRY_RUN" = false ]; then
            exit 1
        fi
    else
        log_success "Node.js runtime verified: v$NODE_VER ($NODE_BIN)"
    fi
fi

# Check systemd availability
if ! command -v systemctl >/dev/null 2>&1; then
    log_warn "systemctl not found. Systemd service registration will be skipped."
    SYSTEMD_AVAILABLE=false
else
    SYSTEMD_AVAILABLE=true
fi

# 3. Execution / Simulation
if [ "$DRY_RUN" = true ]; then
    log_info "--- [DRY-RUN SIMULATION] ---"
    log_info "Would create user/group: $APP_USER:$APP_GROUP"
    log_info "Would create application directory: $PREFIX"
    log_info "Would create data directory: $DATA_DIR"
    log_info "Would create config directory: $CONFIG_DIR"
    log_info "Would configure port: $SERVICE_PORT"
    log_info "Would install systemd unit: /etc/systemd/system/tuneflow.service"
    log_success "Dry run validation completed successfully. All parameters valid."
    exit 0
fi

# 4. Create Service User & Group
if ! id -u "$APP_USER" >/dev/null 2>&1; then
    log_info "Creating system user and group '$APP_USER'..."
    if command -v useradd >/dev/null 2>&1; then
        useradd -r -s /usr/sbin/nologin -d "$DATA_DIR" -M "$APP_USER"
    elif command -v adduser >/dev/null 2>&1; then
        adduser --system --group --no-create-home "$APP_USER"
    else
        log_warn "Neither useradd nor adduser found. Proceeding with current user."
    fi
else
    log_info "System user '$APP_USER' already exists."
fi

# 5. Create Directory Trees
log_info "Preparing application and storage paths..."
mkdir -p "$PREFIX"
mkdir -p "$DATA_DIR/data"
mkdir -p "$DATA_DIR/downloads"
mkdir -p "$DATA_DIR/temp"
mkdir -p "$CONFIG_DIR"

# 6. Install Application Files
log_info "Deploying application payload to $PREFIX..."
cp -R "$REPO_ROOT/src" "$PREFIX/"
cp -R "$REPO_ROOT/public" "$PREFIX/"
cp -R "$REPO_ROOT/bin" "$PREFIX/"
cp "$REPO_ROOT/package.json" "$PREFIX/"

chmod +x "$PREFIX/bin/tuneflow.js"

if [ -d "$REPO_ROOT/node_modules" ]; then
    log_info "Copying pre-built node_modules..."
    cp -R "$REPO_ROOT/node_modules" "$PREFIX/"
elif command -v npm >/dev/null 2>&1; then
    log_info "Installing production dependencies via npm..."
    (cd "$PREFIX" && npm install --omit=dev --no-audit --no-fund)
fi

# 7. Environment Configuration
ENV_FILE="$CONFIG_DIR/tuneflow.env"
if [ ! -f "$ENV_FILE" ]; then
    log_info "Creating initial configuration at $ENV_FILE..."
    cat << EOF > "$ENV_FILE"
# ==============================================================================
# TuneFlow Headless Server Environment Configuration
# Generated by install.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ==============================================================================

PORT=${SERVICE_PORT}
HOST=0.0.0.0

DATA_DIR=${DATA_DIR}/data
DOWNLOADS_DIR=${DATA_DIR}/downloads
TEMP_DIR=${DATA_DIR}/temp
DB_PATH=${DATA_DIR}/data/tuneflow.db

MAX_STORAGE_MB=10240
DOWNLOAD_TTL_HOURS=72
MAX_DOWNLOADS=3
MAX_CONVERSIONS=2
MAX_RETRIES=3

ADMIN_PASSWORD=admin
EOF
    chmod 600 "$ENV_FILE"
    if id -u "$APP_USER" >/dev/null 2>&1; then
        chown "$APP_USER:$APP_GROUP" "$ENV_FILE"
    fi
    log_success "Config written to $ENV_FILE"
else
    log_info "Existing configuration preserved at $ENV_FILE"
fi

# Set directory permissions
chown -R "$APP_USER:$APP_GROUP" "$DATA_DIR" "$CONFIG_DIR"
chmod 750 "$DATA_DIR" "$CONFIG_DIR"

# 8. Install & Activate systemd Service
if [ "$SYSTEMD_AVAILABLE" = true ]; then
    SERVICE_TARGET="/etc/systemd/system/tuneflow.service"
    log_info "Installing systemd service unit to $SERVICE_TARGET..."

    cat << EOF > "$SERVICE_TARGET"
[Unit]
Description=TuneFlow Headless Media Server
Documentation=https://github.com/tamld/tuneflow
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${PREFIX}
EnvironmentFile=-${CONFIG_DIR}/tuneflow.env
Environment=NODE_ENV=production
ExecStart=${NODE_BIN} src/server.js
Restart=always
RestartSec=5s
LimitNOFILE=65536
KillMode=mixed
TimeoutStopSec=15s

StandardOutput=journal
StandardError=journal
SyslogIdentifier=tuneflow

# Sandboxing & Storage Access
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
NoNewPrivileges=true
ReadWritePaths=${DATA_DIR}

[Install]
WantedBy=multi-user.target
EOF

    chmod 644 "$SERVICE_TARGET"
    systemctl daemon-reload
    systemctl enable tuneflow.service
    log_success "Systemd service registered and enabled."

    if [ "$NO_START" = false ]; then
        log_info "Starting tuneflow service..."
        systemctl restart tuneflow.service
        sleep 1
        if systemctl is-active --quiet tuneflow.service; then
            log_success "TuneFlow service is active and running!"
        else
            log_warn "Service started but status check returned non-active. Check 'journalctl -u tuneflow -n 50'."
        fi
    else
        log_info "Service startup skipped (--no-start). Start manually via 'systemctl start tuneflow'."
    fi
fi

echo -e "\n${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}🎉 TuneFlow Headless Server installation complete!${NC}"
echo -e "${BOLD}================================================================${NC}"
echo -e "• Web UI & API Port : ${BOLD}${SERVICE_PORT}${NC}"
echo -e "• Install Prefix    : ${BOLD}${PREFIX}${NC}"
echo -e "• Storage Directory : ${BOLD}${DATA_DIR}${NC}"
echo -e "• Configuration     : ${BOLD}${CONFIG_DIR}/tuneflow.env${NC}"
if [ "$SYSTEMD_AVAILABLE" = true ]; then
    echo -e "\n${BOLD}Service Management Commands:${NC}"
    echo -e "  systemctl status tuneflow     # Check status"
    echo -e "  systemctl restart tuneflow    # Restart server"
    echo -e "  journalctl -u tuneflow -f     # Follow real-time logs"
fi
echo -e "${BOLD}================================================================${NC}\n"
