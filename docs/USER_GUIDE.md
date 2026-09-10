# 📖 TuneFlow User Guide

Action-first manual for running, installing, and navigating TuneFlow across iOS, Android, Android TV, and Homelab servers.

---

## 1. Install PWA on iPhone / iPad (iOS 16.4+)
> **Goal:** Run TuneFlow in standalone fullscreen with background audio & PiP.  
> **Estimated Time:** 1 minute.

1. Open **Safari** on iOS and navigate to your TuneFlow URL (must use HTTPS).
2. Tap the **Share** button (square with arrow pointing up).
3. Scroll down and tap **Add to Home Screen** (`Thêm vào MH chính`).
4. Tap **Add** (`Thêm`) in the top right corner.
5. Launch TuneFlow from your Home Screen icon.

**Background Playback & PiP Tips:**
- **Lock Screen Playback:** Start audio and lock your device. Playback persists continuously.
- **Floating Picture-in-Picture:** Tap the **PiP** (`📺`) button on the bottom player bar to float track artwork, song title, and animated visualizer.

---

## 2. Install on Android Mobile
> **Goal:** Run TuneFlow as an app on your Android smartphone.  
> **Estimated Time:** 2 minutes.

### Option A: Install Progressive Web App (PWA)
1. Open **Google Chrome** on Android and navigate to your TuneFlow URL.
2. Tap the **Install TuneFlow** banner at the top, or tap **⋮ menu** -> **Install app** (`Cài đặt ứng dụng`).
3. Tap **Install** to add TuneFlow to your app drawer.

### Option B: Download Official APK
1. Open [TuneFlow Releases](https://github.com/tamld/tuneflow/releases/latest).
2. Download `tuneflow-mobile-v2.4.2.apk`.
3. Open the downloaded file and tap **Install**.

---

## 3. Control TuneFlow on Android TV / Google TV
> **Goal:** Leanback 10-foot experience with D-Pad remote control.  
> **Estimated Time:** 1 minute.

### Installation
1. Download `tuneflow-tv-v2.4.2.apk` from [TuneFlow Releases](https://github.com/tamld/tuneflow/releases/latest).
2. Sideload onto your Android TV box via USB or `adb install tuneflow-tv-v2.4.2.apk`.
3. Launch TuneFlow from your Android TV apps row.

### Remote Control D-Pad Shortcuts
| Remote Key | Action |
| :--- | :--- |
| `Arrow Keys` (Up/Down/Left/Right) | Move focus between cards and controls |
| `OK / Select` | Play focused song or trigger button |
| `Back` (`↩`) | Close modal / return focus to player bar |
| `Play / Pause` (`⏯`) | Toggle audio playback |

---

## 4. Run TuneFlow in Homelab Docker
> **Goal:** Self-host TuneFlow container with persistent storage.  
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
Open `http://<your-server-ip>:3000` and sign in with `admin` / your bootstrap password.

---

## 5. First-Time Admin Setup
> **Goal:** Secure your instance and manage accounts.  
> **Estimated Time:** 1 minute.

1. Sign in with username `admin` and default password.
2. Click **👑 Quản trị** (Admin) in the top header bar.
3. Click **Đổi mật khẩu** (Change Password) to set a new personal password.
4. Go to **Tài khoản** (Accounts) tab to invite family members or manage guest quotas.
