# TuneFlow Master Engineering Roadmap (v1.0.0 → v3.0.0)

> **Core Objective**: Build an elegant, elderly-friendly YouTube to audio (320kbps MP3 / MP4) streamer and downloader tailored for **elderly family members** with 1-touch discovery, packaged into lightweight multi-arch containers running 24/7 on **homelab servers (Docker / Podman / Compose)** and **cross-platform native desktop packages (Windows, macOS, Linux)**; with an SGH-grade **Defense-in-Depth** security envelope, **Hash Checker CAS**, **Mobile PWA**, **Android TV D-Pad Leanback**, and **Automated CI/CD Distribution**.

---

## 🗺️ Roadmap Phase Breakdown

Each phase is designed independently with a complete quality assurance dossier:  
**`PRD` (Product Requirements) ➔ `SRS` (Software Specs) ➔ `FSM` (State Machines) ➔ `ADR` (Architecture Decisions) ➔ `DoR` (Definition of Ready) ➔ `DoD` (Definition of Done) ➔ `AC` (Acceptance Criteria)**.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TUNEFLOW ROADMAP MATRIX                                │
├──────────┼──────────────────────────────────────────┼─────────────┼────────────────────┤
│ Phase 1  │ Core Engine & Elderly UI Baseline        │ v1.0.0      │ ✅ Completed (SSoT)│
│ Phase 2  │ Container Engine, Multi-Arch & GHCR CI/CD│ v1.1.1      │ ✅ Completed       │
│ Phase 3  │ Playlist Downloads, Batch Queue & SHA-256│ v1.2.0      │ ✅ Completed       │
│ Phase 4  │ Elderly Persona Curation & Zero-Login    │ v1.3.0      │ ✅ Completed       │
│ Phase 5  │ Hybrid Client-Server Compute & Streaming │ v1.4.0      │ ✅ Completed       │
│ Phase 6  │ Browser Extension MV3 & Legal Compliance │ v2.0.0      │ ✅ Completed       │
│ Phase 7  │ Android TV D-Pad Leanback & Mobile Audio │ v2.1.0      │ ✅ Completed       │
│ Phase 8  │ Offline PWA Shell, Voice Search & LAN QR │ v2.2.0      │ ✅ Completed       │
│ Phase 9  │ SQLite RBAC, Domain Policy & Cooldown    │ v2.3.0      │ ✅ Completed       │
│ Phase 10 │ Active Sessions, Favorites & Encrypted DB│ v2.4.0      │ ✅ Completed       │
│ Phase 11 │ Mobile PWA, iOS PiP & Unified CI/CD      │ v2.4.2      │ ✅ Completed       │
│ Phase 12 │ Schema Migrations & Session Maintenance  │ v2.4.3      │ ✅ Completed       │
│ Phase 13 │ Portable Binary & Hash Checker Security  │ v2.5.0      │ 🎯 In Progress     │
│ Phase 14 │ Two-Tier Self-Update & WinGet Packaging │ v2.6.0      │ 📅 Planned         │
│ Phase 15 │ Native Desktop GUI Shell with Tauri v2   │ v3.0.0      │ 📅 Planned         │
└──────────┴──────────────────────────────────────────┴─────────────┴────────────────────┘
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

### Phase 13: Cross-Platform Portable Binary & Defense-in-Depth Hash Checker (v2.5.0)
- **Scope**:
  - Zero-Install portable folder bundle for Windows, Linux, and macOS without SFX/UPX compression to prevent dropper heuristic triggers (SPEC-0008).
  - Pre-flight Content-Addressable Storage (CAS) Hash Checker verifying SHA-256 baseline before child process execution (`src/security/binary_guard.js`).
  - Dual-mode storage resolver (`.portable` local retention vs OS standard `%LOCALAPPDATA%` / `Library` / XDG).
  - Clean PE Resource Metadata (`.rc` table) and Microsoft Defender Security Intelligence (WDSI) automated submission pipeline.
- **Deliverables**: `docs/superpowers/plans/2026-09-11-cross-platform-binary-packaging.md`, `tests/portable-binary-security.test.js`.

---

### Phase 14: Cryptographic Two-Tier Self-Update & WinGet Distribution (v2.6.0)
- **Scope**:
  - Tier 1: Independent background auto-update for `yt-dlp` upon cipher 403 error.
  - Tier 2: Ed25519 cryptographic signature verification for core updates paired with Windows Atomic Swap (`.old` rename).
  - Official submission to `microsoft/winget-pkgs` and `Scoop` for trusted, SmartScreen-free 1-command installation.
- **Deliverables**: Manifests for WinGet / Scoop, update API enhancements.

---

### Phase 15: Native Desktop GUI Shell with Tauri v2 (v3.0.0)
- **Scope**:
  - Lightweight Rust shell with System Tray icon and auto-browser launch.
  - Native MSI installer for Windows and signed DMG with notarization for macOS.
  - Full desktop OS integration with zero container runtime overhead.
- **Deliverables**: `src-tauri/` project foundation, release artifacts.

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
| **RM-26** | Dual-Mode Storage Path Isolation | SPEC-0008, Phase 13 | `tests/portable-binary-security.test.js` |
| **RM-27** | Fail-Closed CAS Hash Checker Guard | SPEC-0008, Phase 13 | `tests/portable-binary-security.test.js` |
| **RM-28** | Ed25519 Two-Tier Update Verification | SPEC-0008, Phase 14 | `tests/portable-binary-security.test.js` |
