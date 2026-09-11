# 🛡️ TuneFlow Superpowers Mandatory Steps & Quality Invariants

> **Document Type:** Project-Specific Superpowers Operational Governance  
> **Target Project:** TuneFlow (YouTube to MP3/MP4 Elder-Friendly Player)  
> **Authority:** Approved by IT Administrator (anh Tâm)  
> **Traceability:** Issue #115, RM-26, RM-27, RM-29, RM-30  
> **Epistemic Status:** PROVEN (Backed by Automated Unit & Integration Tests)

---

## 📌 1. Root Cause Analysis (RCA): GHA Remote CI Failure (2026-09-11)

On 2026-09-11, GHA CI run `#34573593674` failed on `ubuntu-latest` despite tests passing on local Windows.
An exhaustive post-mortem revealed three distinct cross-platform failure vectors:

1. **Path Separator Mismatch (`tests/portable-binary-security.test.js`)**:
   - *Cause*: `resolveStoragePaths('win32')` called `path.join()`. On POSIX runners (Ubuntu), `path` defaults to `path.posix`, joining Windows drive paths with `/` (`C:\Users\User\AppData\Local/TuneFlow/data`), causing strict equality assertions expecting `\` to fail.
   - *Fix*: Enforced `path.win32` for Windows targets and `path.posix` for POSIX targets in both runtime and test assertions.

2. **Heavy Python Dependency in Headless CI (`scripts/generate_icons.py`)**:
   - *Cause*: `generate_icons.py` unconditionally imported `PIL.Image` at module root. Minimal Node.js CI containers lacking Pillow immediately crashed on `generate_icons.py --check`.
   - *Fix*: Lazy-loaded Pillow only inside the generation routine. `--check` operates purely via standard 6-byte ICO binary header parsing.

3. **Rigid Dependency Regex (`tests/ci-cd-unified-pipeline.test.js`)**:
   - *Cause*: Test asserted exact regex `/needs:\s*\[container-image,\s*apk-build\]/`. Adding `windows-desktop-build` broke the strict pattern.
   - *Fix*: Refactored to flexible multi-stage regex `/needs:\s*\[.*container-image.*apk-build.*\]/`.

---

## ⚖️ 2. The 8 Mandatory Steps for TuneFlow Superpowers

```
┌────────────────────────────────────────────────────────┐
│             PHASE 1: SPEC & DoR (writing-plans)        │
│  1. Epistemic Check: PROVEN vs GAP distinction        │
│  2. Roadmap Binding: Traceability RM-xx tagging        │
├────────────────────────────────────────────────────────┤
│             PHASE 2: DEFENSIVE IMPLEMENTATION (TDD)    │
│  3. CAS Hash Gate: Fail-Closed SHA-256 for binaries    │
│  4. Atomic Swap: Windows rename-to-.old lock evasion   │
│  5. Zero-Dropper: No %TEMP% extraction (Anti-AV)       │
├────────────────────────────────────────────────────────┤
│             PHASE 3: PRE-PUSH & DoD VERIFICATION       │
│  6. Icon SSoT Sync: Multi-size 7-layer ICO gate        │
│  7. File-First Git CLI: gh_safe_post.py mandatory      │
├────────────────────────────────────────────────────────┤
│             PHASE 4: MULTI-ARTIFACT RELEASE (GHA)      │
│  8. Tri-Artifact Release: Docker + APK + EXE (ISCC)    │
└────────────────────────────────────────────────────────┘
```

### Step 1: Epistemic Truth Invariant (No False Claims)
- Before claiming any capability or asset exists, run verification commands (`Test-Path`, `node --test`).
- If an asset is planned but unwritten, label it explicitly as `[GAP / PLANNED]`. Never claim unproven work.

### Step 2: Roadmap Traceability Binding
- Every new specification, pull request, and commit must trace back to a specific requirement in `docs/ROADMAP.md` (`RM-01` .. `RM-30`).

### Step 3: Content-Addressable Storage (CAS) Hash Checker Gate
- Any execution of `yt-dlp` or `ffmpeg` must verify SHA-256 baseline against `bin/SHA256SUMS.json` via `src/security/binary_guard.js`.
- Execution must scrub environment variables (`NODE_OPTIONS`, `PYTHONPATH`) and fail-closed on mismatch.

### Step 4: Windows File Lock Evasion (Atomic Swap)
- Any update or executable mutation on Windows must execute `atomicSwapExecutable()` (rename active `.exe` to `.old` before staging new binary).

### Step 5: Anti-AV Heuristic Defense (Zero-Dropper & Zero-Hijack)
- Zero extraction into `%TEMP%` to avoid heuristic quarantine (`Trojan:Win32/Wacatac`, `Heur.Boring`).
- Zero tampering with OS Certificate Stores (`Cert:\CurrentUser\Root`).
- Inno Setup must remain User-Level (`PrivilegesRequired=lowest`).

### Step 6: Multi-Resolution Icon SSoT Synchronization
- Any branding change must execute `python scripts/generate_icons.py`.
- Must verify `public/icons/favicon.ico` contains all 7 standard layers (`16x16`, `24x24`, `32x32`, `48x48`, `64x64`, `128x128`, `256x256`).

### Step 7: File-First GitHub CLI Invariant (`scripts/gh_safe_post.py`)
- Never pass multi-line or backtick-containing Markdown via PowerShell string arguments (`--body "..."`).
- Always use `scripts/gh_safe_post.py` with `--body-file` to eliminate shell escape corruption.

### Step 8: Multi-Artifact Release Gate
- Official releases (`v*.*.*`) must compile and attach all three distribution pillars:
  1. Multi-Arch Docker Container (`linux/amd64`, `linux/arm64`)
  2. Android Mobile & TV Leanback APKs
  3. Windows Desktop Setup Wizard (`TuneFlow-Setup-vX.Y.Z.exe`)
- Must consolidate and attach cryptographic `SHA256SUMS.txt`.

---

## 🔄 3. Anti-Stale Documentation Protocol

To guarantee that documentation never lags behind production code:

1. **DoD Synchronization**: When a pull request merges, its corresponding specification DoD checklist (`docs/spec/SPEC-*.md`) must be updated from `[ ]` to `[x]`.
2. **Roadmap State Audit**: `docs/ROADMAP.md` must be checked on every release to reflect accurate version tags, PR numbers, and traceability rows.
3. **Verification Command**: Run `node --test tests/*.test.js` and verify zero skipped or failing test suites across both POSIX and Windows.
