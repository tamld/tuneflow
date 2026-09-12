# ADR-0016: Tauri v2 Native Desktop Shell, System Tray Lifecycle, and Zero-Node IPC Bridge

## Status
Accepted

## Context
TuneFlow previously provided browser-based UI, Electron/AppKit wrappers, and Inno Setup Windows installers. While functional, several technical and architectural challenges emerged:
1. **Memory & Binary Bloat**: Electron wrappers bundle an entire Chromium and Node.js runtime, resulting in 150MB+ binary sizes and 150MB-250MB idle memory consumption.
2. **System Tray & Lifecycle Integration**: Browser tabs cannot minimize to the OS system tray, cannot register global hardware media hotkeys (`MediaPlayPause`, `MediaTrackNext`), and terminate audio playback when tabs or browser windows are closed.
3. **Decoupled Architecture Parity**: SPEC-0013 established the 4-quadrant operational model where thin clients connect directly to remote headless servers. A native GUI client must be featherweight (<25MB RAM), start instantly (<1.5s), and communicate seamlessly with both local and remote backends.

## Architectural Decisions
1. **Tauri v2 Core with OS-Native WebViews**:
   - Adopt **Tauri v2** with a Rust backend core. Instead of bundling Chromium, Tauri leverages the OS-native rendering engine:
     - macOS: `WKWebView` (Apple Silicon & Intel)
     - Windows: `Microsoft Edge WebView2`
     - Linux: `WebKitGTK`
   - Resulting in executable binaries under 15MB and idle RAM usage under 25MB.
2. **Native System Tray & Close-to-Tray Invariant**:
   - The desktop shell registers a persistent System Tray / Menu Bar item.
   - When the user clicks the window close button (`X`), the window is hidden (`hide()`) rather than destroyed, ensuring background audio streaming and download queues continue uninterrupted.
   - The tray menu exposes:
     - Currently playing track title and artist.
     - Play / Pause and Next Track toggles.
     - "Mở Giao Diện" (Restore Window) and "Thoát Ứng Dụng" (Graceful Quit).
3. **Typed Bidirectional IPC Bridge**:
   - Security-isolated IPC channels using Tauri's `invoke` protocol:
     - `connect_server`: validates remote server endpoint health and latency.
     - `get_client_config` / `save_client_config`: persists endpoint preferences in `client-config.json` with restricted POSIX permissions (`0600`).
     - `open_downloads_folder`: native OS file explorer integration.
4. **Zero-Node Thin Client Distribution**:
   - When operating in Thin Client Mode (SPEC-0013 Mode 3), the compiled Tauri application requires zero Node.js, Python, yt-dlp, or FFmpeg dependencies on the client workstation.

## Consequences
- **Positive**:
  - 10x reduction in memory footprint compared to Electron (<25MB vs ~200MB).
  - Native OS integration: global hotkeys, menu bar controls, system notifications.
  - Seamless support for elderly users who prefer a single desktop application icon without browser complexity.
  - Full compatibility with the existing Vanilla JS/CSS SilverMelody frontend without refactoring.
- **Negative**:
  - Compiling the native Rust shell requires Rust/Cargo toolchain in development and CI environments.
  - Linux packaging requires system `webkit2gtk` libraries.
