# ADR-0014: Cross-Platform Native Desktop Packaging, Graphical Wizards & Antivirus Defense

## Status
Accepted

## Context & Problem Statement
TuneFlow has established a containerized backend (ghcr.io/tamld/tuneflow) and Android mobile/TV ecosystem (SPEC-0007, SPEC-0009). However, deploying via Docker/Podman creates an insurmountable barrier for non-technical users and elderly family members who lack virtualization knowledge or terminal literacy.

To transition TuneFlow into a consumer-accessible desktop application, we must provide standalone native installers for Windows, macOS, and Linux without requiring Docker Desktop, WSL2, or Node.js pre-installation.

This introduces severe operating system security constraints:
1. **Antivirus Heuristic False Positives**: Naive packagers (e.g., pkg, caxa, UPX SFX) unpack binaries into %TEMP% and spawn dynamic child processes, immediately triggering Windows Defender heuristics (Trojan:Win32/Wacatac, Heur.Boring).
2. **Windows SmartScreen Trust Boundary**: Commercial EV Code Signing certificates cost $300-$500/year plus hardware tokens. Free open-source signing programs (e.g., SignPath.io) strictly gatekeep certificates behind project notoriety thresholds (hundreds of GitHub stars, established foundations) and reject nascent independent projects.
3. **OS Certificate Store Tampering Risk**: Self-signed root certificate injection into Cert:\CurrentUser\Root acts as a local security hijack and is flagged by enterprise EDR solutions.
4. **Desktop Installation UX for Non-Tech Users**: Users expect standard Setup Wizards (.exe on Windows, .dmg on macOS, .AppImage / .deb on Linux) with automatic Desktop shortcuts, Start Menu entries, system tray integration, and automated browser launching.

---

## Decision Drivers
- **Zero-Technical Friction**: Double-click setup with 1-click 'Next -> Finish' flow; no terminal commands.
- **Zero-UPX / Anti-Dropper Invariant**: Packaging must remain static without runtime temp-dropping.
- **Enterprise-Grade Security (Zero-Hijack)**: Strictly prohibit tampering with Windows Trusted Root CA stores.
- **Legitimate Distribution Channels**: Leverage official package managers (microsoft/winget-pkgs, Scoop) that provide automated cloud sandbox detonation and native SmartScreen reputation.
- **Fail-Closed CAS Integrity**: Enforce SHA-256 pre-flight checks on all external sidecars (yt-dlp, fmpeg) before spawning processes.

---

## Considered Options
1. **Option 1: Naive SFX / Single Executable Packers (UPX / caxa)**:
   - *Verdict*: **REJECTED**. Unpacking into %TEMP% triggers instant AV quarantine.
2. **Option 2: Self-Signed Root Certificate Auto-Injection**:
   - *Verdict*: **REJECTED**. Tampering with OS Root Certificate Stores violates technical standards, acts like rootkit behavior, and triggers EDR alerts.
3. **Option 3: Commercial EV Code Signing Certificate**:
   - *Verdict*: **REJECTED (Unviable)**. Cost prohibitive ($300-$500/yr) for non-commercial homelab software.
4. **Option 4: Tri-Platform Native Packaging (Inno Setup + Apple DMG + Linux AppImage/.deb) + WinGet**:
   - *Verdict*: **ACCEPTED (SSoT Architecture)**.

---

## Decision Outcome: Option 4 (SSoT)

We adopt a modular, multi-tier packaging and distribution architecture:

### 1. Windows Installation Wizard (Inno Setup)
- Standalone installer compiled via **Inno Setup 6**.
- Targets %LOCALAPPDATA%\Programs\TuneFlow (User-Level, Zero-Admin, no yellow UAC elevation prompt).
- Automatically embeds PE Resource Metadata (.rc table: CompanyName, LegalCopyright, ProductVersion, FileDescription).
- Creates Desktop shortcut 🎵, Start Menu shortcut, and auto-launches browser on completion.

### 2. macOS DMG Packaging (create-dmg)
- Drag-and-drop .dmg disk image with visual guidance dragging TuneFlow into /Applications.
- Bounded app bundle structure complying with Apple bundle layout.

### 3. Linux Multi-Format Distribution
- **AppImage**: Standalone executable running across Ubuntu, Debian, Fedora, Arch, and Mint with zero dependencies.
- **.deb / .rpm Packages**: Graphical 1-click install via Ubuntu Software / GNOME Software Center.
- **FreeDesktop Entry**: Auto-registers tuneflow.desktop icon in system application menus.

### 4. Official Windows Package Manager (winget & Scoop)
- Submit manifests to microsoft/winget-pkgs. Microsoft's automated CI/CD runs static and dynamic cloud sandbox detonation before merging, granting official clean status and eliminating SmartScreen blocks.

### 5. Two-Tier Content-Addressable Storage (CAS) Hash Checker
- Integrated src/security/binary_guard.js computes SHA-256 before spawning yt-dlp or fmpeg.
- Fail-closed execution: any sidecar tampering immediately halts process execution.

---

## Consequences & Trade-offs
- **Positive**:
  - Elderly and non-technical users can install TuneFlow with standard graphical wizards.
  - Zero-UPX and clean PE metadata drastically mitigate AV heuristic false positives.
  - No dependence on commercial EV certificates or rejected SignPath sponsorships.
- **Negative**:
  - Build pipeline must manage multi-platform packaging tools (Inno Setup for Windows, AppImage toolchain for Linux).
  - First-time direct .exe downloads (outside WinGet) may still encounter SmartScreen warnings until community download volume builds reputation.
