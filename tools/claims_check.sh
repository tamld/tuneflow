#!/usr/bin/env bash
#
# claims_check.sh — TuneFlow Claims Registry Validator (#143)
#
# Validates that every evidence.test and evidence.source path registered
# in docs/claims.yml exists on disk.
# Exits 0 on clean pass; exits 1 on any missing evidence file.
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLAIMS_FILE="$ROOT_DIR/docs/claims.yml"

while [ $# -gt 0 ]; do
    case "$1" in
        --claims-file|--file)
            if [ $# -lt 2 ]; then
                echo "error: $1 requires a file argument" >&2
                exit 1
            fi
            CLAIMS_FILE="$2"
            shift 2
            ;;
        --root-dir|--root)
            if [ $# -lt 2 ]; then
                echo "error: $1 requires a directory argument" >&2
                exit 1
            fi
            ROOT_DIR="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [--claims-file <path>] [--root-dir <path>]"
            exit 0
            ;;
        *)
            echo "unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

if [ ! -f "$CLAIMS_FILE" ]; then
    echo "::error::Claims registry file not found: $CLAIMS_FILE"
    exit 1
fi

FAIL=0
CHECKED=0

while IFS= read -r rel_path; do
    [ -z "$rel_path" ] && continue
    CHECKED=$((CHECKED + 1))
    resolved="$ROOT_DIR/$rel_path"
    if [ ! -e "$resolved" ]; then
        echo "::error::claims check: missing evidence file '$rel_path' (resolved: $resolved)"
        FAIL=$((FAIL + 1))
    else
        echo "  [OK] $rel_path"
    fi
done < <(awk -F': *' '/^[[:space:]]*(test|source):/ {
    val = $2
    gsub(/["'\''\r]/, "", val)
    sub(/[[:space:]]+$/, "", val)
    print val
}' "$CLAIMS_FILE")

if [ "$CHECKED" -eq 0 ]; then
    echo "::error::No evidence entries (test / source) discovered in $CLAIMS_FILE"
    exit 1
fi

if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "CLAIMS REGISTRY GATE: FAILED ($FAIL missing file(s) out of $CHECKED examined; file: $CLAIMS_FILE)."
    exit 1
fi

echo "CLAIMS REGISTRY GATE: OK ($CHECKED evidence path(s) verified; file: $CLAIMS_FILE)."
exit 0
