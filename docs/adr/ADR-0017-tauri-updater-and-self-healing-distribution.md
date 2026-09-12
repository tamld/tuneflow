# ADR-0017: Tauri v2 In-App Updater, Cryptographic Signing, and Client Self-Healing Distribution

## Status
Accepted

## Context
With the adoption of the Tauri v2 Native Desktop Shell (ADR-0016 / SPEC-0014) in v3.0.0, users run TuneFlow directly on desktop environments across macOS, Windows, and Linux. However, native desktop applications face critical operational lifecycle challenges:
1. **Manual Update Friction for Elderly Users**: Non-technical users cannot be expected to navigate GitHub releases, download `.dmg` or `.msi` installers, uninstall previous versions, or run terminal commands. Updating must be seamless, one-click, or automated.
2. **Binary Integrity & Security Risks**: Unsigned or unverified binaries downloaded over public networks risk Man-in-the-Middle (MitM) tampering or DNS poisoning. Updates must be cryptographically signed with asymmetric keys (Ed25519) and verified before execution.
3. **Network & Connection Degradation in Homelabs**: In decoupled setups where the desktop client connects to a remote headless server (Mode 3 thin-client), network fluctuations, Wi-Fi reconnection, or IP changes can leave the client in a disconnected state. The desktop client needs active diagnostics and self-healing mechanisms to detect connection failure and fallback safely.

## Architectural Decisions
1. **Tauri v2 Native In-App Updater with Ed25519 Cryptographic Verification**:
   - Adopt Tauri v2 updater framework (`latest.json` manifest endpoint) combined with Ed25519 asymmetric signature validation.
   - The desktop client downloads the release manifest over HTTPS, parses the target platform payload, and verifies the signature using an embedded Ed25519 public key.
   - If the signature does not match or is absent, the update is rejected unconditionally (fail-closed security).
2. **System Diagnostics & Self-Healing IPC Layer**:
   - Provide typed IPC commands:
     - `check_for_updates`: Checks update manifest asynchronously, returning semver delta and release notes.
     - `get_system_diagnostics`: Inspects OS architecture, writeability of `~/Downloads/TuneFlow`, active profile reachability, and network round-trip latency.
     - `self_heal_connectivity`: Attempts multi-stage recovery (preferred target -> active profile -> fallback to Local Standalone `127.0.0.1:3000`), updating configuration automatically upon success.
3. **Multi-Arch Packaging & CI/CD Release Pipeline**:
   - Build native packages:
     - macOS: Universal / Apple Silicon `.dmg`.
     - Windows: NSIS installer (`.exe`) and MSI bundle.
     - Linux: `.AppImage` and `.deb`.
   - Embed updater manifest generation into the release pipeline.

## Consequences
- **Positive**:
  - Elderly users enjoy automated or one-click updates without leaving the application.
  - Zero vulnerability to binary tampering due to Ed25519 cryptographic verification.
  - High availability in homelabs with automated self-healing and diagnostics.
  - Consistent native desktop delivery across macOS, Windows, and Linux.
- **Negative**:
  - Requires maintaining Ed25519 private signing keys in GitHub Actions Secrets.
  - Generating multiple OS native bundles increases CI build times.
