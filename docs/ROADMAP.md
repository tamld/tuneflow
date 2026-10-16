# TuneFlow Master Engineering Roadmap (v1.0.0 → v3.0.0)

> **Core Objective**: Build an elegant, elderly-friendly YouTube to audio (320kbps MP3 / MP4) streamer and downloader tailored for **elderly family members** with 1-touch discovery, packaged into lightweight multi-arch containers running 24/7 on **homelab servers (Docker / Podman / Compose)** and **cross-platform native desktop packages (Windows, macOS, Linux)**; with an SGH-grade **Defense-in-Depth** security envelope, **Hash Checker CAS**, **Mobile PWA**, **Android TV D-Pad Leanback**, and **Automated CI/CD Distribution**.

---

## 🔍 Sources of Truth

TuneFlow enforces a strict truth-baseline hierarchy across code, package definitions, and published release artifacts:
1. **GitHub Releases (`gh release list`)**: Canonical record of published, downloadable binary distributions. The latest published release tag is **`v2.5.0`** (covering Phases 1–13).
2. **Package Version ([package.json](../package.json))**: Single source of truth for runtime application versioning (`"version": "2.5.0"`).
3. **Claims Registry ([docs/claims.yml](claims.yml))**: Machine-verifiable claims registry linking architectural claims directly to active unit tests and implementation source files.

---

## 🗺️ Roadmap Phase Breakdown

Each phase is designed independently with a complete quality assurance dossier:  
**`PRD` (Product Requirements) ➔ `SRS` (Software Specs) ➔ `FSM` (State Machines) ➔ `ADR` (Architecture Decisions) ➔ `DoR` (Definition of Ready) ➔ `DoD` (Definition of Done) ➔ `AC` (Acceptance Criteria)**.

```
┌──────────┬──────────────────────────────────────────┬─────────────────────────┬───────────────────────────────────────────────────────────────┐
│ Phase    │ Focus / Feature Scope                    │ Code Milestone (Master) │ Published Release (v2.5.0 latest on GitHub Releases)          │
├──────────┼──────────────────────────────────────────┼─────────────────────────┼───────────────────────────────────────────────────────────────┤
│ Phase 1  │ Core Engine & Elderly UI Baseline        │ v1.0.0                  │ ✅ Published (v1.0.0)                                         │
│ Phase 2  │ Container Engine, Multi-Arch & GHCR CI/CD│ v1.1.1                  │ ✅ Published (v1.1.0)                                         │
│ Phase 3  │ Playlist Downloads, Batch Queue & SHA-256│ v1.2.0                  │ ✅ Published (v1.2.0)                                         │
│ Phase 4  │ Elderly Persona Curation & Zero-Login    │ v1.3.0                  │ ✅ Published (v1.3.0)                                         │
│ Phase 5  │ Hybrid Client-Server Compute & Streaming │ v1.4.0                  │ ✅ Code-complete (Published in v2.2.0 roll-up)                  │
│ Phase 6  │ Browser Extension MV3 & Legal Compliance │ v2.0.0                  │ ✅ Code-complete (Published in v2.2.0 roll-up)                  │
│ Phase 7  │ Android TV D-Pad Leanback & Mobile Audio │ v2.1.0                  │ ✅ Code-complete (Published in v2.2.0 roll-up)                  │
│ Phase 8  │ Offline PWA Shell, Voice Search & LAN QR │ v2.2.0                  │ ✅ Published (v2.2.0)                                         │
│ Phase 9  │ SQLite RBAC, Domain Policy & Cooldown    │ v2.3.0                  │ ✅ Published (v2.3.0)                                         │
│ Phase 10 │ Active Sessions, Favorites & Encrypted DB│ v2.4.0                  │ ✅ Code-complete (Published in v2.4.2 roll-up)                  │
│ Phase 11 │ Mobile PWA, iOS PiP & Unified CI/CD      │ v2.4.2                  │ ✅ Published (v2.4.2)                                         │
│ Phase 12 │ Schema Migrations & Session Maintenance  │ v2.4.3                  │ ✅ Published (v2.4.3)                                         │
│ Phase 13 │ Portable Binary & Hash Checker Security  │ v2.5.0                  │ ✅ Published (v2.5.0 — Latest GitHub Release Tag)             │
│ Phase 14 │ Two-Tier Self-Update & WinGet Packaging │ v2.6.0                  │ Code-complete on master (Unreleased — latest release tag v2.5.0)│
│ Phase 15 │ Tri-Mode Deployment & Decoupled Client   │ v2.7.0                  │ Code-complete on master (Unreleased — latest release tag v2.5.0)│
│ Phase 16 │ Native Desktop GUI Shell with Tauri v2   │ v3.0.0                  │ Code-complete on master (Unreleased — latest release tag v2.5.0)│
│ Phase 17 │ Desktop In-App Update & Multi-Arch Dist  │ v3.1.0                  │ Code-complete on master (Unreleased — latest release tag v2.5.0)│
│ Phase 18 │ Filial Physical Bridge & TV Casting      │ v3.2.0                  │ Code-complete on master (Unreleased — latest release tag v2.5.0)│
│ Phase 19 │ 1-Click Zero-Friction Community Ship     │ v3.3.0                  │ Code-complete on master (Unreleased — latest release tag v2.5.0)│
│ Phase 20 │ 3-Zone Desktop Shell, Doctor & Sidecars  │ v2.5.0+                 │ Code-complete on master (SPEC-0016, SPEC-0017, ADR-0019/0020)  │
└──────────┴──────────────────────────────────────────┴─────────────────────────┴───────────────────────────────────────────────────────────────┘
```

---

## 📌 Phase Engineering Specifications

### Phase 1: Core Engine & Single-Track UX (v1.0.0 - Baseline)
- **Focus**: Node.js 22 LTS backend, `yt-dlp` and `ffmpeg` wrappers, SilverMelody high-contrast WCAG AAA interface, ad-free in-app preview player, direct client delivery via HTTP attachment headers.
- **SSoT Deliverables**: `docs/PRD.md`, `docs/SRS.md`, `docs/FSM.md`, `docs/adr/ADR-0001` through `ADR-0006`, `docs/DoD.md`, `docs/DoR.md`, `docs/AC.md`.
- **Verification**: 24/24 unit/integration tests passing, closed issues #1 (TTL Cleanup), #2 (Deduplication), #3 (Sanitizer).

---

### Phase 2: Container Engine, Multi-Arch GHCR & Homelab Deployment (v1.1.1)
- **Scope**:
  - Build ultra-lightweight Alpine Linux OCI container ($\le 120\text{MB}$), supporting Docker and Podman.
  - Configure GitHub Actions CI/CD to compile and push multi-arch images (`linux/amd64`, `linux/arm64`) to **GitHub Container Registry (`ghcr.io/tamld/tuneflow`)**.
  - Provide turnkey `compose.yaml` with reverse-proxy recipes (Traefik, Nginx, Caddy, Cloudflare Tunnel).
  - Healthcheck endpoint `/api/health` monitoring active child processes and runtime memory.
- **Deliverables**: `docs/prd/PRD-Phase2-Container-GHCR.md`, `docs/srs/SRS-Phase2-Container-GHCR.md`, `docs/adr/ADR-0007-multi-arch-ghcr-and-container-deployment.md`.

---

### Phase 3: Playlist Ingestion, Batch Selection Queue & Integrity Checksums (v1.2.0)
- **Scope**:
  - YouTube playlist metadata extraction (titles, thumbnails, duration).
  - Batch selection interface with "Select All" and manual track picker.
  - Bounded download queue limiting concurrency to `MAX_CONCURRENT_DOWNLOADS = 2` to preserve server CPU/RAM.
  - Resume-safe `.part` download handling for intermittent network connections.
  - SHA-256 checksum manifest generation verifying audio integrity before client delivery.
- **Deliverables**: `docs/prd/PRD-Phase3-Playlist-Batch-Engine.md`, `docs/srs/SRS-Phase3-Playlist-Batch-Engine.md`, `docs/adr/ADR-0008-playlist-parsing-and-checksum-verification.md`.

---

### Phase 4: Persona Curation & Zero-Login Personalization (v1.3.0)
- **Scope**:
  - Pre-curated discovery channels:
    - 🌸 **Mother's Favorites**: Meditation, peaceful sleep music, traditional folk, spa relaxation.
    - ☕ **Father's Favorites**: Golden Oldies, nostalgic bolero, pre-1975 classics, news audio.
    - 🎵 **Quick Filters**: High-contrast toggle between vocal and instrumental tracks.
  - **Zero-Login Personalization**: Storing favorites directly in browser `localStorage`, eliminating password barriers for elderly users.
- **Deliverables**: `docs/prd/PRD-Phase4-Elderly-Persona-Curation.md`, `docs/srs/SRS-Phase4-Elderly-Persona-Curation.md`, `docs/adr/ADR-0009-elderly-persona-taxonomy-and-zero-login-storage.md`.

---

### Phase 5: Hybrid Client-Server Compute & Zero-Disk Streaming (v1.4.0)
- **Scope**:
  - Zero-disk streaming pipe: Express proxies audio chunks directly to client via `ReadableStream` and byte ranges without persistent server disk retention.
  - Web Audio API / WASM client offloading: Audio equalization, trimming, and ID3 tagging executed on client CPU.
- **Deliverables**: `docs/prd/PRD-Phase5-Hybrid-Compute-Streaming.md`, `docs/srs/SRS-Phase5-Hybrid-Compute-Streaming.md`, `docs/adr/ADR-0010-hybrid-client-server-compute-and-wasm-offloading.md`.

---

### Phase 6: Browser Extension MV3 & Legal Compliance (v2.0.0)
- **Scope**:
  - Manifest V3 browser extension displaying a 1-click "Download to TuneFlow" button on YouTube desktop pages.
  - Formal Legal Compliance and Fair Use charter establishing personal/homelab operational boundaries.
- **Deliverables**: `docs/prd/PRD-Phase6-Browser-Extension-Legal.md`, `docs/srs/SRS-Phase6-Browser-Extension-Legal.md`, `docs/adr/ADR-0011-browser-extension-mv3-and-legal-compliance-architecture.md`.

---

### Phase 7: Android TV D-Pad Spatial Navigation & Ambient Mode (v2.1.0)
- **Scope**:
  - 10-foot Leanback spatial navigation (`tv-leanback.js`) supporting standard TV remote keys (`Arrow Keys`, `Enter`, `Back`).
  - WCAG 2.2 AAA high-contrast focus rings (`.focused-tv` with 4px gold border and 24px glow) visible from 3 meters away.
  - Fullscreen ambient playback overlay with 320px album artwork and large typography.
- **Deliverables**: `docs/spec/SPEC-0007-android-tv-and-mobile-client.md`, `docs/adr/ADR-0012-android-mobile-and-tv-leanback-architecture.md`.

---

### Phase 8: Offline PWA Shell, Voice Search & LAN QR Pairing (v2.2.0)
- **Scope**:
  - Web App Manifest (`public/manifest.webmanifest`) and Cache-first Service Worker (`public/sw.js`) enabling offline app shell loading.
  - Vietnamese voice search (`#btn-voice-search`) leveraging Web Speech API with pulsing visual cues.
  - Local LAN discovery endpoint (`/api/system/network`) providing QR pairing payloads for mobile devices.
- **Deliverables**: `docs/spec/SPEC-0007-android-tv-and-mobile-client.md`.

---

### Phase 9: SQLite RBAC, Domain Policy & Cooldown Limits (v2.3.0)
- **Scope**:
  - Native `node:sqlite` persistence engine with WAL mode and foreign key integrity.
  - Three-tier RBAC (`admin`, `user`, `guest`) enforced via `requirePermission(perm)` middleware.
  - 30-minute cumulative preview limit for guests with 60-minute automated cooldown.
  - Exponential 2x sleep timer (15m, 30m, 1h, 2h, 4h) with 30s gentle audio fade-out.
- **Deliverables**: `docs/superpowers/plans/2026-09-09-rbac-auth-guest-cooldown.md`, Issues #49, #50, #52.

---

### Phase 10: Active Sessions, Playlist Filters & AES-256-GCM Encryption (v2.4.0)
- **Scope**:
  - Playlist search and multi-criteria sorting (`relevance`, `views`, `date`) via unified query API.
  - Admin session manager with group revocation (`guests`, `users`, `all_except_me`, `revoke-all`).
  - User password self-service (`/api/auth/change-password`) and bidirectional favorites synchronization.
  - AES-256-GCM authenticated encryption at rest for client IP addresses and session tokens in `tuneflow.db`.
- **Deliverables**: PR #83, PR #85, PR #86 (Issues #80, #81, #84).

---

### Phase 11: Mobile PWA, iOS PiP & Unified Remote CI/CD (v2.4.2)
- **Scope**:
  - Safe-area insets (`env(safe-area-inset-*)`) and 2-tier CSS Grid bottom player for iOS notches and dynamic islands (Issue #87).
  - iOS Web Audio bypass to native `<audio>` element to preserve background audio on screen lock, paired with dynamic Canvas 512x512 stream PiP (Issue #88).
  - Unified 3-stage remote release pipeline in `.github/workflows/release.yml` compiling multi-arch containers and real signed Android Mobile & TV APKs (Issue #90).
- **Deliverables**: `docs/spec/SPEC-0009-ios-pwa-and-unified-release-pipeline.md`, PR #89, PR #91.

---

### Phase 12: Production Hardening, SQLite Migrations & Maintenance (v2.4.3)
- **Scope**:
  - Unreferenced hourly maintenance worker (`src/engine/maintenance.js`) pruning expired sessions (Issue #103).
  - Lightweight transactional schema migration engine (`src/db/migrations.js`) via `PRAGMA user_version` (Issue #105).
  - Objective multi-host deployment docs and Gradle 8.6 native APK compilation alignment (Issue #101).
  - Version synchronization across package, manifest, build.gradle, and sw.js (Issue #107).
- **Deliverables**: PR #104, PR #106, PR #108.

---

### Phase 13: Cross-Platform Portable Binary, Wizards & AV Defense (v2.5.0)
- **Scope**:
  - Zero-Install portable folder bundle and Inno Setup 6 zero-admin user-level wizard (`installer/windows/setup.iss`).
  - Pre-flight Content-Addressable Storage (CAS) Hash Checker verifying SHA-256 baseline before child process execution (`src/security/binary_guard.js`).
  - Dual-mode storage resolver (`.portable` local retention vs OS standard `%LOCALAPPDATA%` / `Library` / XDG) with cross-platform deterministic paths (`path.win32` / `path.posix`).
  - Multi-resolution icon generation suite (`scripts/generate_icons.py`) and SSoT branding repository (`assets/branding/`).
  - GHA release workflow with Windows Inno Setup build matrix and consolidated SHA256 checksums.
- **Deliverables**: SPEC-0010, ADR-0014, PR #110, PR #112, PR #114, PR #116.

---

### Phase 14: Cryptographic Two-Tier Self-Update & WinGet Distribution (Milestone v2.6.0 — Code-complete on master, Unreleased — latest release tag v2.5.0)
- **Scope**:
  - Tier 1: Independent background auto-update for `yt-dlp` upon cipher 403 error.
  - Tier 2: Ed25519 cryptographic signature verification for core updates paired with Windows Atomic Swap (`.old` rename).
  - Official submission to `microsoft/winget-pkgs` and `Scoop` for trusted, SmartScreen-free 1-command installation.
- **Deliverables**: Manifests for WinGet / Scoop, update API enhancements.

---

### Phase 15: Tri-Mode Deployment & Decoupled Client-Server Topology (Milestone v2.7.0 — Code-complete on master, Unreleased — latest release tag v2.5.0)
- **Scope**:
  - Tri-Mode Deployment: Mode 1 (Full Standalone + Native Window), Mode 2 (Dedicated Headless Server), Mode 3 (Dedicated Thin Client).
  - Storage-Agnostic Headless Linux Server: turnkey installer (`installer/server/install.sh`), systemd service unit (`tuneflow.service`), and POSIX environment template (`tuneflow.env.example`).
  - Decoupled Native Desktop Client: Swift Cocoa AppKit shell (`main.swift`), multi-host config (`client-config.json`), Preferences dialog (`Cmd + ,`), and zero-node thin packaging (`--thin-client`).
  - Connection State Machine (FSM): automatic reconnect with exponential backoff, latency degradation detection (>500ms), and fallback to standalone.
- **SSoT Deliverables**: `docs/spec/SPEC-0013-tri-mode-deployment-and-remote-client-architecture.md`, `docs/adr/ADR-0015-tri-mode-deployment-and-decoupled-client-topology.md`.
- **Verification**: 17/17 tests in `tests/tri-mode-connectivity-matrix.test.js`, 16/16 tests in `tests/headless-server-and-launcher.test.js`, 8/8 tests in `tests/remote-client-switcher.test.js` (total test suite reaches 434/434 passed 100% green).

---

### Phase 16: Native Desktop GUI Shell with Tauri v2 (Milestone v3.0.0 — Code-complete on master, Unreleased — latest release tag v2.5.0)
- **Scope**:
  - Ultra-lightweight Rust shell (~15MB memory footprint, zero Node runtime) with native System Tray integration.
  - Native Webview window management (macOS WKWebView, Windows WebView2, Linux WebKitGTK) with frameless SilverMelody UI.
  - Safe bidirectional IPC bridge commands (`connect_server`, `get_client_config`, `save_client_config`, `open_downloads_folder`, `minimize_to_tray`).
  - Native packaging & distribution matrix: Windows MSI installer, macOS DMG with notarization hooks, Linux AppImage/Deb.
- **SSoT Deliverables**: `docs/spec/SPEC-0014-tauri-desktop-gui-shell.md`, `docs/adr/ADR-0016-tauri-desktop-shell-and-ipc-bridge.md`.
- **Verification**: 14/14 tests in `tests/tauri-architecture-matrix.test.js`, 3/3 Rust unit tests (`cargo test --manifest-path src-tauri/Cargo.toml`), total test suite reaches 449/449 passed 100% green.

---

### Phase 17: Desktop In-App Auto-Update & Self-Healing Distribution (Milestone v3.1.0 — Code-complete on master, Unreleased — latest release tag v2.5.0)
- **Scope**:
  - In-App Auto-Update with Ed25519 signature verification against tamper and DNS poisoning.
  - Active System Diagnostics (`get_system_diagnostics`) for filesystem writability and network latency.
  - Autonomous Self-Healing IPC (`self_heal_connectivity`) with automatic failover to Local Standalone (`127.0.0.1:3000`).
  - Multi-Arch packaging pipeline definitions (macOS Universal, Windows NSIS/MSI, Linux AppImage/deb).
- **SSoT Deliverables**: `docs/spec/SPEC-0015-desktop-auto-update-and-multi-arch-distribution.md`, `docs/adr/ADR-0017-tauri-updater-and-self-healing-distribution.md`.
- **Verification**: 11/11 tests in `tests/phase17-desktop-updater-and-distribution.test.js`, 6/6 Rust unit tests (`cargo test --manifest-path src-tauri/Cargo.toml`), total test suite reaches 466/466 passed 100% green.

---

### Phase 18: Filial Physical Bridge & Living Room Casting Ecosystem (Milestone v3.2.0 — Code-complete on master, Unreleased — latest release tag v2.5.0)
- **Scope**:
  - **TuneFlow Connect (Gap 5 & Issue #134)**: 100% self-hosted local LAN device pairing and casting protocol. Android TV acts as a receiver with 4-digit PIN code (`8888`), eliminating remote control typing fatigue for seniors. Mobile devices cast tracks and manage playback with low-latency SSE delivery.
  - **Physical USB/SD Card Exporter (Gap 1 & Issue #135)**: Bridges the digital-to-hardware gap for parents' portable FM radios, Craven boxes, chanting players, and automobile stereos. Automatically applies 3-digit zero-padded indexing (`001 - Artist - Title.mp3`), purges macOS `.DS_Store` / `._*` AppleDouble shadow files from FAT32 filesystems, writes standard `playlist.m3u`, and generates client-side batch ZIP packages.
  - **Autonomous Engine Self-Healing & Empathetic Fallback (Gaps 2, 3, 4 & Issue #136)**: Engine health monitor detecting YouTube cipher updates and HTTP 429 challenges with automated `yt-dlp -U` self-healing daemon. Replaces intimidating developer stack traces with warm, comforting filial Vietnamese banners and 1-click fallback to the offline downloaded library. Honest architectural documentation for OS Gatekeeper and iOS WebKit sandbox constraints.
- **Verification**: 26/26 tests passing in `tests/connect.test.js`, `tests/usb-exporter.test.js`, `tests/engine-health.test.js`, and `tests/connect-usb-health-api.test.js`.

---

### Phase 19: 1-Click Zero-Friction Community Ship (Milestone v3.3.0 — Code-complete on master, Unreleased — latest release tag v2.5.0)
- **Scope**:
  - **CasaOS & ZimaOS AppStore 1-Click Manifest (`docker-compose.casaos.yml`)**: Native `x-casaos` manifest integration with high-contrast icon, category metadata ("Media / Music"), and non-destructive volume mappings (`./downloads` & `./data`).
  - **Unraid Community Applications Template (`installer/unraid/tuneflow.xml`)**: Turnkey XML template for Unraid WebGUI with pre-configured shares, unprivileged user permissions, and filial Vietnamese description.
  - **Turnkey Production Compose Suite (`docker-compose.yml`)**: Production-ready compose configuration with `--profile auto-update` integrating `containrrr/watchtower` for zero-touch GHCR digest polling and background container rolling updates without volume loss.
  - **Comprehensive Zero-Debt Onboarding Guides**: Dual-language documentation (`README.md`, `README.vi.md`) detailing the filial value proposition, homelab store installation, and 1-click USB/TV workflows for children and parents.
- **Verification**: Automated validation test in `tests/community-homelab-templates.test.js` asserting schema integrity for CasaOS metadata, Unraid XML tags, and Watchtower auto-update compose profiles.

---

### Phase 20: 3-Zone Desktop App Shell, Open-Source Asset Governance, Process Lifecycle Supervision, System Doctor & Offline Library (v2.5.0+ — Code-complete on master)
- **Scope**:
  - **3-Zone Desktop Application Shell & Isolated Playlist Stage (`SPEC-0016`, `ADR-0019`)**: Left Sidebar (`260px`) + Scrollable Main Stage + Docked Bottom Player (`74px`) with 5 curated visual themes (`dark`, `cream`, `wood`, `jade`, `hc`), native Win32 DWM Dark Titlebar (`TuneFlowLauncher.cs`), isolated Desktop playlist view (`#btn-close-playlist` `← Quay Lại`, zero card overlap, locked `100vh` viewport), and instant Track #1 playlist auto-play.
  - **Open-Source Asset Governance (`ADR-0020`)**: Bundled `Be Vietnam Pro` (`OFL-1.1`) WOFF2 Vietnamese typography (`public/fonts/`), Lucide SVG stroke icons (`MIT`), and automated SPDX compliance checks (`tests/open-source-asset-compliance.test.js`).
  - **Self-Contained Sidecar Bundler, System Doctor & Offline Downloaded Library (`SPEC-0017`)**: `scripts/bundle-sidecars.js`, `node bin/tuneflow.js --doctor`, `GET /api/system/doctor`, and `#btn-persona-downloaded` (`GET /api/library/local` & `/api/library/local/stream/:filename`) for 1-click offline MP3 playback.
  - **Process Lifecycle Supervision & Performance Optimization (`src/engine/process_manager.js`)**: Centralized child process registry, cross-platform process-tree termination (`taskkill /T /F /PID` on Windows, `-pgid` process group kill on POSIX), PID lockfile (`data/tuneflow.pid`), watchdog timeouts (`15s` stream / `30s` search / `15m` transcode), Singleflight stream coalescing, fast-start M4A (`itag=140`) stream priority, and immutable 1-year `.woff2` font caching.
- **SSoT Deliverables**: `docs/spec/SPEC-0016-desktop-app-shell-and-native-windows-host.md`, `docs/spec/SPEC-0017-self-contained-packaging-doctor-and-ux-refinement.md`, `docs/adr/ADR-0019-desktop-app-shell-and-native-chromium-host.md`, `docs/adr/ADR-0020-open-source-asset-and-font-licensing-governance.md`.
- **Verification**: `tests/desktop-app-shell-and-host.test.js`, `tests/open-source-asset-compliance.test.js`, `tests/ui-layout-and-clipping.test.js`, `tests/phase20-packaging-doctor-and-offline-library.test.js`, and `tests/process-lifecycle-and-performance.test.js`.

---

## 📋 Traceability Matrix

| Requirement | Scope Description | SSoT Specification | Test Suite / Verification |
| :--- | :--- | :--- | :--- |
| **RM-01** | Core `yt-dlp` & `ffmpeg` engine | `docs/SRS.md` | `tests/engine.test.js` |
| **RM-02** | Elderly high-contrast UI ($\ge 56$px) | `docs/SRS.md` | `tests/e2e.test.js` |
| **RM-03** | In-app Audio Preview Player | `docs/adr/ADR-0003` | `tests/api.test.js` |
| **RM-04** | Client direct delivery attachment | `docs/adr/ADR-0004` | `tests/api.test.js` |
| **RM-05** | Deduplication & TTL Cleanup | `docs/SRS.md` | `tests/edge-cases.test.js` |
| **RM-06** | Container Alpine Build & GHCR | `docs/adr/ADR-0007` | `.github/workflows/release.yml` |
| **RM-07** | Playlist & Batch selection queue | `docs/adr/ADR-0008` | `tests/playlist.test.js` |
| **RM-08** | SHA-256 Checksum integrity | `docs/spec/phase3` | `tests/checksum.test.js` |
| **RM-09** | Persona presets (Father/Mother) | `docs/adr/ADR-0009` | `tests/playlist.test.js` |
| **RM-10** | Hybrid Client-Side WASM Compute | `docs/adr/ADR-0010` | `tests/wasm-stream.test.js` |
| **RM-11** | Browser Extension MV3 Integration | `docs/adr/ADR-0011` | `tests/extension.test.js` |
| **RM-12** | Android TV D-Pad Leanback Navigation | `docs/spec/SPEC-0007` | `tests/tv-leanback.test.js` |
| **RM-13** | PWA Offline Shell, Voice Search & QR | `docs/spec/SPEC-0007` | `tests/pwa-voice.test.js` |
| **RM-14** | Dynamic CSS Variable Font Scaler | `docs/superpowers/plans` | `tests/font-scaler-and-sleep-timer.test.js` |
| **RM-15** | Exponential 2x Sleep Timer & Fade | `docs/superpowers/plans` | `tests/font-scaler-and-sleep-timer.test.js` |
| **RM-16** | SQLite RBAC, 3-Tier Auth & Cooldown | `docs/superpowers/plans` | `tests/auth-*.test.js` |
| **RM-17** | Playlist Discovery, Filter & Sorting | PR #83, Issue #80 | `tests/search-playlist-sort.test.js` |
| **RM-18** | Active Session Management & Kick-Out | PR #85, Issue #84 | `tests/admin-session-management.test.js` |
| **RM-19** | Password Self-Service & Favorites | PR #86, Issue #81 | `tests/security-passwords-favorites-encryption.test.js` |
| **RM-20** | AES-256-GCM Data Encryption at Rest | PR #86, Issue #81 | `tests/security-passwords-favorites-encryption.test.js` |
| **RM-21** | iOS PWA Responsive & Safe Area Insets | PR #89, Issue #87 | `tests/ios-pwa-responsive.test.js` |
| **RM-22** | iOS Background Audio Bypass & PiP | PR #89, Issue #88 | `tests/ios-background-audio-pip.test.js` |
| **RM-23** | Unified 3-Stage Remote Release CI/CD | PR #91, Issue #90 | `tests/ci-cd-unified-pipeline.test.js` |
| **RM-24** | SQLite Dynamic Schema Migrations | PR #106, Issue #105| `tests/database-migrations.test.js` |
| **RM-25** | Automated Background Session Pruning | PR #104, Issue #103| `tests/session-cleanup-maintenance.test.js` |
| **RM-26** | Dual-Mode Storage Path Isolation | SPEC-0010, Phase 13 | `tests/portable-binary-security.test.js` |
| **RM-27** | Fail-Closed CAS Hash Checker Guard | SPEC-0010, Phase 13 | `tests/portable-binary-security.test.js` |
| **RM-28** | Ed25519 Two-Tier Update Verification | SPEC-0010, Phase 14 | `tests/portable-binary-security.test.js` |
| **RM-29** | Desktop Setup Wizard & FreeDesktop | SPEC-0010, ADR-0014 | `tests/desktop-packaging.test.js` |
| **RM-30** | Multi-Size Icon Suite & GHA Pipeline | SPEC-0010, PR #114 | `tests/desktop-packaging.test.js` |
| **RM-31** | Master 7-Dimensional Testing Matrix & Anti-Theater Gates | SPEC-0011, Phase 13 | `tests/master-testing-matrix-gates.test.js` |
| **RM-32** | FFmpeg Transcoding Atomic Resilience & Partial Cleanup | Issue #131 | `tests/ffmpeg-resilience.test.js` |
| **RM-33** | Two-Tier Self-Update & Windows Package Manifests | SPEC-0012, Phase 14 | `tests/phase14-update-and-packaging.test.js` |
| **RM-34** | Tri-Mode Deployment Selection (Standalone / Headless / Thin) | SPEC-0013, ADR-0015 | `tests/tri-mode-connectivity-matrix.test.js` |
| **RM-35** | Decoupled Client Multi-Host FQDN & Universal Transport Medium | SPEC-0013, ADR-0015 | `tests/tri-mode-connectivity-matrix.test.js` |
| **RM-36** | Headless Linux Server Turnkey Installer & POSIX Storage Parity | SPEC-0013, ADR-0015 | `installer/server/install.sh`, `tests/headless-server-and-launcher.test.js` |
| **RM-37** | Thin-Client macOS Native Cocoa AppKit Shell & Preferences | SPEC-0013, ADR-0015 | `src/desktop/macos/main.swift`, `scripts/package_macos.sh`, `tests/headless-server-and-launcher.test.js` |
| **RM-38** | Web Client Remote Switcher (Q3/Q4) & Multi-Artifact CI/CD Packaging | SPEC-0013, PRD | `tests/remote-client-switcher.test.js` |
| **RM-39** | Cross-Platform Static CI Gate & Pre-Push Protection | Issue #132 | `tests/ci-preflight-gate.test.js`, `.git/hooks/pre-push` |
| **RM-40** | Tauri v2 Native GUI Architecture, IPC Contract & Tray Lifecycle | SPEC-0014, ADR-0016 | `tests/tauri-architecture-matrix.test.js` |
| **RM-41** | Desktop In-App Auto-Update, Self-Healing Diagnostics & Multi-Arch Distribution | SPEC-0015, ADR-0017 | `tests/phase17-desktop-updater-and-distribution.test.js` |
| **RM-42** | Senior Visual Ergonomics, Header Declutter, Warm Cream Day Mode & Unified Settings | Issue #133 | `tests/elderly-visual-theme-and-settings.test.js` |
| **RM-43** | TuneFlow Connect Receiver Mode, SSE Command Stream & QR Pairing for 10-Foot TV | Issue #134 | `tests/connect.test.js`, `tests/connect-usb-health-api.test.js` |
| **RM-44** | Physical USB/SD Card Exporter, 3-Digit Sequence & FAT32 Metadata Purging | Issue #135 | `tests/usb-exporter.test.js`, `tests/connect-usb-health-api.test.js` |
| **RM-45** | Autonomous Self-Healing yt-dlp Daemon, Gerontechnology Fallback & Platform OpSec | Issue #136 | `tests/engine-health.test.js`, `tests/connect-usb-health-api.test.js` |
| **RM-46** | Community Homelab AppStore Manifests & Turnkey 1-Click Packaging | Phase 19 | `tests/community-homelab-templates.test.js` |
| **RM-47** | Native Windows Test Parity, Cross-Platform POSIX Guards & Windows CI Matrix | Issue #137 | `tests/windows-desktop-packaging.test.js`, `.github/workflows/ci.yml` |
| **RM-48** | 3-Zone Desktop App Shell, 5-Theme System & Native DWM Titlebar | SPEC-0016, ADR-0019 | `tests/desktop-app-shell-and-host.test.js`, `tests/ui-layout-and-clipping.test.js` |
| **RM-49** | Open-Source Asset Governance (Be Vietnam Pro OFL-1.1 & Lucide MIT) | ADR-0020 | `tests/open-source-asset-compliance.test.js` |
| **RM-50** | Self-Contained Sidecar Bundler, System Doctor & Offline Downloaded Library | SPEC-0017, Phase 20 | `tests/phase20-packaging-doctor-and-offline-library.test.js` |
| **RM-51** | ProcessManager Anti-Orphan Tree-Kill, PID Lockfile Hygiene, Watchdog Timeouts & Singleflight Stream Coalescing | SPEC-0017, Phase 20 | `tests/process-lifecycle-and-performance.test.js` |
