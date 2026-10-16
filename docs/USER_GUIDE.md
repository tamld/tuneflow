# 📖 TuneFlow User Guide

Action-first manual for running, installing, and navigating TuneFlow across iOS, Android, Android TV, and Self-Hosted / Cloud servers.

---

## 1. Install PWA on iPhone / iPad (iOS 16.4+)
> **Goal:** Run TuneFlow in standalone fullscreen with background audio & PiP.  
> **Estimated Time:** 1 minute.

1. Open **Safari** on iOS and navigate to your TuneFlow URL (must use HTTPS).
2. Tap the **Share** button (square icon with an upward-pointing arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add** in the top-right corner.
5. Launch TuneFlow from your Home Screen.

**Background Playback & PiP Tips:**
- **Lock Screen Playback:** Start audio playback and lock your device. Playback continues uninterrupted via native hardware media controls.
- **Floating Picture-in-Picture:** Tap the **PiP** (`📺`) button on the bottom player bar to float track artwork, song title, and animated visualizer waveforms.

---

## 2. Install on Android Mobile
> **Goal:** Run TuneFlow as an app on your Android smartphone.  
> **Estimated Time:** 2 minutes.

### Option A: Install Progressive Web App (PWA)
1. Open **Google Chrome** on Android and navigate to your TuneFlow URL.
2. Tap the **Install TuneFlow** banner at the top, or tap **⋮ menu** -> **Install app**.
3. Tap **Install** to add TuneFlow to your app drawer.

### Option B: Download Official APK & Zero-Typing QR Pairing
1. Open [TuneFlow Releases](https://github.com/tamld/tuneflow/releases/latest).
2. Download the latest mobile APK (`tuneflow-mobile-*.apk`).
3. Open the downloaded APK file and tap **Install**.
4. **Zero-Typing Server Pairing (Elderly-Friendly):**
   - On your computer or web admin panel, open the TuneFlow setup screen (powered by `GET /api/system/network` and `GET /api/system/pairing-qr` in `@tuneflow/contract`).
   - Launch the TuneFlow Android app and tap the large **"Quét mã ghép nối" (Scan Pairing QR)** button.
   - Point your phone camera at the screen QR code (`tuneflow://pair?url=...&code=...`) to auto-fill and save `server_url` without typing a single character.
   - *Manual Fallback:* You can also type or paste your LAN server address (e.g. `http://192.168.1.100:3000`) directly in the dialog.

---

## 3. Control TuneFlow on Android TV / Google TV
> **Goal:** Leanback 10-foot experience with D-Pad remote control.  
> **Estimated Time:** 1 minute.

### Installation
1. Download the latest TV APK (`tuneflow-tv-*.apk`) from [TuneFlow Releases](https://github.com/tamld/tuneflow/releases/latest).
2. Sideload onto your Android TV box via USB or `adb install <apk-file>`.
3. Launch TuneFlow from your Android TV apps row.
4. **Server Address Setup (TV Fallback):** Press the **MENU** button (or long-press **Back**) on your TV remote at any time to open the server URL configuration dialog, or pair via 4-digit PIN using `POST /api/connect/pair`.

### Remote Control D-Pad Shortcuts
| Remote Key | Action |
| :--- | :--- |
| `Arrow Keys` (Up/Down/Left/Right) | Move focus between cards and controls |
| `OK / Select` | Play focused song or trigger button |
| `Back` (`↩`) | Close modal / return focus to player bar (long-press opens Server Setup) |
| `MENU` (`☰`) | Open manual Server URL setup dialog (10-foot fallback) |
| `Play / Pause` (`⏯`) | Toggle audio playback |

---

## 4. Run TuneFlow via Docker / Container (Server, VPS, Cloud, Homelab, NAS)
> **Goal:** Run TuneFlow container on any Docker/Podman host (Linux VPS, Cloud VM, NAS, Local machine, or Homelab) with persistent storage.  
> **Estimated Time:** 3 minutes.

### Step 1: Create `compose.yaml`
```yaml
services:
  tuneflow:
    image: ghcr.io/tamld/tuneflow:latest
    container_name: tuneflow
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
      - ./downloads:/app/downloads
```

### Step 2: Start container
```bash
docker compose up -d
```

### Step 3: Access web UI
Open `http://<your-server-ip>:3000` and sign in with `admin` and your bootstrap password.

---

## 5. First-Time Admin Setup
> **Goal:** Secure your instance and manage accounts.  
> **Estimated Time:** 1 minute.

1. Sign in with username `admin` and the default password.
2. Click **👑 Admin** in the top header bar.
3. Click **Change Password** to set a new personal password.
4. Go to **Accounts** tab to invite family members or manage guest quotas.

---

## 6. Desktop Native App, Offline Downloaded Library & System Doctor
> **Goal:** Run TuneFlow on Windows/macOS/Linux Desktop, play offline MP3s, and diagnose environment health.  
> **Estimated Time:** 1 minute.

1. **Offline Downloaded Library (`Nhạc Đã Tải`):** Click the **Nhạc Đã Tải** channel in the left sidebar (`#btn-persona-downloaded`) to browse and play all `.mp3` and `.m4a` tracks stored in your local `downloads/` directory without an internet connection.
2. **Playlist Isolated Stage & Auto-Play:** Clicking **`▶ Mở Tuyển Tập Nghe & Tải`** on any Playlist card opens an isolated playlist view and automatically plays Track #1. Click **`← Quay Lại`** (`#btn-close-playlist`) to return to search results.
3. **Built-In System Doctor (`--doctor`):** Run `pnpm run doctor` (`node bin/tuneflow.js --doctor`) or query `GET /api/system/doctor` to inspect Node runtime, SQLite database, downloads directory writability, active child process telemetry (`ProcessManager`), and `yt-dlp` / `ffmpeg` sidecar binaries.
4. **Direct-Run Sync (Windows Developers):** Run `pnpm run desktop:sync` (`powershell -ExecutionPolicy Bypass -File scripts/sync_local_install.ps1`) to bundle sidecars, sync `dist\win-unpacked` and `%LOCALAPPDATA%\Programs\TuneFlow`, and rebuild the Inno Setup installer.

