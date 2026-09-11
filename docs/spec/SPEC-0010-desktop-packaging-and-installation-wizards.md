# 📐 SPEC-0010: CROSS-PLATFORM DESKTOP PACKAGING, INSTALLATION WIZARDS & AV DEFENSE

> **Project Name:** TuneFlow Desktop Ecosystem & Graphical Installer Suite  
> **Document Code:** SPEC-0010 (Phases 13, 14 & 15)  
> **Approval Status:** ✅ Approved by IT Administrator (anh Tâm)  
> **Traceability:** RM-26 (Storage Isolation), RM-27 (Hash Checker CAS), RM-28 (Cryptographic Update Engine)  
> **Includes:** PRD, SRS, DoR, DoD, Validation Plan, and Automation Test Plan.

---

## 📌 1. PRD (PRODUCT REQUIREMENTS DOCUMENT)

### 1.1 Project Objectives
1. Eliminate the Docker/terminal barrier for non-technical users and elderly family members by delivering turn-key native desktop installation wizards.
2. Provide seamless 1-click installation on Windows (Inno Setup), macOS (DMG), and Linux (AppImage & .deb).
3. Establish an active, zero-trust Antivirus (AV) defense posture that prevents heuristic false positives without relying on costly EV certificates or OS certificate store tampering.

### 1.2 Problem Statement & Context
- **Current Barrier**: TuneFlow's v2.4.3 deployment model relies on Docker OCI containers or manual Node.js terminal commands. Non-technical users cannot install or maintain such environments.
- **AV Heuristic Trap**: Naive standalone executable packagers (pkg, caxa, UPX SFX) unpack files to %TEMP% and spawn dynamic child processes, causing Windows Defender and ESET to flag the binary as a Trojan dropper.
- **SmartScreen Reputation Deficit**: New executables trigger the blue Windows SmartScreen banner unless signed by an expensive EV certificate ($300-$500/yr) or distributed through trusted channels like winget.
- **System Hijacking Anti-Pattern**: Attempting to inject self-signed root certificates into Cert:\CurrentUser\Root is an unviable anti-pattern that violates IT governance and triggers enterprise EDR alarms.

### 1.3 Stakeholders & Scope
- **Target Audience**: Elderly family members, homelab enthusiasts, and desktop users on Windows 10/11, macOS (Intel & Apple Silicon), and Linux (Ubuntu, Debian, Fedora).
- **In Scope**:
  - Windows Graphical Setup Wizard (TuneFlow-Setup.exe).
  - macOS Disk Image (TuneFlow.dmg).
  - Linux AppImage (TuneFlow.AppImage), Debian package (.deb), and Desktop Entry (tuneflow.desktop).
  - Pre-flight Content-Addressable Storage (CAS) Hash Checker.
  - Dual-mode persistence directory resolver.
  - Windows Package Manager (winget) and Scoop distribution manifests.
- **Out of Scope**:
  - Mobile iOS/Android compilation (governed under SPEC-0007 / SPEC-0009).
  - Modification of operating system Trusted Root CA stores.

### 1.4 Core Functional Requirements
1. **[REQ-DSK-01] Windows Setup Wizard**: Modern Inno Setup installer installing to %LOCALAPPDATA%\Programs\TuneFlow with zero Administrator elevation required.
2. **[REQ-DSK-02] Desktop & Start Menu Integration**: Auto-creates application shortcuts with branded music icon 🎵 and uninstaller registration in Windows Add/Remove Programs.
3. **[REQ-DSK-03] macOS Drag-to-Applications**: Turn-key .dmg image facilitating standard drag-and-drop into /Applications.
4. **[REQ-DSK-04] Linux Tri-Format Distribution**: AppImage portable package, .deb graphical package, and FreeDesktop standard .desktop launcher entry.
5. **[REQ-DSK-05] Background Launcher & Browser Auto-Open**: Native launcher verifies port availability, starts Express server in background, and automatically opens default browser to http://localhost:3000.
6. **[REQ-DSK-06] System Tray Integration**: Minimizes to system tray with context menu ('Mở TuneFlow', 'Tạm dừng', 'Thoát').
7. **[REQ-DSK-07] Pre-Flight Hash Checker (CAS)**: Scans and verifies SHA-256 baseline of sidecar binaries (yt-dlp, fmpeg) before process spawn; aborts immediately on mismatch (Fail-Closed).
8. **[REQ-DSK-08] PE Resource Table Hardening**: Embeds complete PE metadata (CompanyName, LegalCopyright, ProductVersion, OriginalFilename) into native executables.

---

## 💻 2. SRS (SOFTWARE REQUIREMENTS SPECIFICATION)

### 2.1 Runtime Environment & Target Platforms
- **Windows**: Windows 10 & 11 (x86_64, arm64). User-level installation without UAC prompts.
- **macOS**: macOS 12 Monterey through macOS 15 Sequoia (Apple Silicon arm64 & Intel x86_64).
- **Linux**: glibc 2.31+ distributions (Ubuntu 20.04+, Debian 11+, Fedora 36+, Arch Linux).
- **Core Bundled Runtimes**: Node.js 22 LTS, etter-sqlite3 native addons, yt-dlp standalone, fmpeg static build.

### 2.2 System Architecture & Process Lifecycle

`mermaid
graph TD
    A[User Double-Clicks Installer / App] --> B{Installation Mode?}
    
    B -- Windows Setup --> C[Inno Setup installs to %LOCALAPPDATA%]
    C --> D[Create Desktop Icon & Start Menu Entry]
    
    B -- macOS DMG --> E[User drags to /Applications]
    E --> F[App registered in Launchpad]
    
    B -- Linux AppImage --> G[User clicks AppImage or installs .deb]
    G --> H[Register FreeDesktop .desktop entry]
    
    D --> I[Launch Native Desktop Shell]
    F --> I
    H --> I
    
    I --> J{Check Port 3000 Available?}
    J -- Busy --> K[Increment to Port 3001..3005]
    J -- Free --> L[Bind HTTP Port]
    K --> L
    
    L --> M[Pre-Flight Hash Checker: Verify bin/ SHA-256]
    M -- Mismatch --> N[Emergency Exit: SECURITY_INTEGRITY_VIOLATION]
    M -- Valid --> O[Spawn TuneFlow Engine with Sanitized ENV]
    
    O --> P[Auto-open System Default Browser]
    O --> Q[Minimize to System Tray with Context Menu]
`

### 2.3 Safety Gates & Defense-in-Depth

1. **Safety Gate 1 (Anti-Dropper Invariant)**: Strictly zero unpacking to %TEMP%. All assets reside in explicit, permanent installation directories.
2. **Safety Gate 2 (Fail-Closed CAS Gate)**: erifyBinaryIntegrity() validates sidecar executables against SHA256SUMS.json. Missing or altered binaries are rejected before child_process.spawn.
3. **Safety Gate 3 (Subprocess Environment Scrubbing)**: Strips dangerous environment variables (NODE_OPTIONS, PYTHONPATH, RUBYOPT) preventing code injection into child processes.
4. **Safety Gate 4 (Dual-Storage Partitioning)**: Isolates persistent SQLite database and downloads folder between portable mode (.portable) and standard OS user profiles.

---

## ⚖️ 3. DoR & DoD (DEFINITION OF READY & DONE)

### 3.1 Definition of Ready (DoR)
- [x] **Spec & Architecture Approval**: Reviewed and approved by IT Administrator (anh Tâm).
- [x] **ADR Recorded**: ADR-0014 committed documenting packaging options and AV defense.
- [x] **Red Test Proof Verified**: tests/portable-binary-security.test.js executed (RED exit 1 ➔ GREEN exit 0).
- [x] **Substance Verification**: Plan passes check_prove.py substance audit (exit 0).
- [x] **Clean Baseline**: All existing 266 unit and integration tests passing green (0 failures).

### 3.2 Definition of Done (DoD)
- [x] **Installer Blueprint Created**: `installer/windows/setup.iss` and `installer/linux/tuneflow.desktop` checked into repository.
- [x] **Dual-Mode Persistence Verified**: Automated tests confirm `%LOCALAPPDATA%`, Library, and XDG_DATA_HOME resolution.
- [x] **Hash Checker Enforced**: `ytdlp.js`, `ffmpeg.js`, and `queue.js` route execution through `binary_guard.js`.
- [x] **Static Analysis Clean**: 0 ESLint errors across all JavaScript modules.
- [x] **Packaging & Icon Verification**: `scripts/generate_icons.py` generates multi-resolution ICO and GHA `release.yml` includes `windows-desktop-build`.
- [x] **CI Test Gate Resilience**: Full cross-platform path determinism (`path.win32` / `path.posix`) passing across all platforms.

---

## 🧪 4. VALIDATION & AUTOMATION TEST PLAN

### 4.1 Automated Test Cases

| Test ID | Test Category | Target Component | Expected Result |
| :--- | :--- | :--- | :--- |
| **TC-SEC-01** | Path Isolation | resolveStoragePaths | Returns OS-standard directories when portable mode is false. |
| **TC-SEC-02** | Portable Mode | resolveStoragePaths | Keeps data and downloads in working directory when .portable exists. |
| **TC-SEC-03** | CAS Hash Checker | verifyBinaryIntegrity | Returns true on valid SHA-256; throws SECURITY_INTEGRITY_VIOLATION on tampered hash. |
| **TC-SEC-04** | Missing Sidecar | verifyBinaryIntegrity | Throws BINARY_NOT_FOUND if target executable does not exist. |
| **TC-SEC-05** | Update Signature | validateUpdateManifestSignature | Validates Ed25519 signature; rejects tampered update payloads. |
| **TC-SEC-06** | Windows Atomic Swap | atomicSwapExecutable | Renames in-use binary to .old and moves new binary into place without file lock collisions. |
| **TC-SEC-07** | Env Sanitization | getSanitizedEnv | Strips NODE_OPTIONS, PYTHONPATH, and dangerous runtime hooks. |
| **TC-SEC-08** | Sidecar Resolution | resolveSidecarBinary | Resolves local bin/ tools when present; falls back to system PATH. |
