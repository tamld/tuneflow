# 🎶 TuneFlow

<div align="center">

**An elegant, elderly-friendly YouTube to MP3/MP4 music downloader with in-app audio preview player. Self-hosted and homelab ready.**

[![Latest Release](https://img.shields.io/github/v/release/tamld/tuneflow?color=blue&logo=github)](https://github.com/tamld/tuneflow/releases/latest)
[![CI Gate](https://github.com/tamld/tuneflow/actions/workflows/ci.yml/badge.svg)](https://github.com/tamld/tuneflow/actions/workflows/ci.yml)
[![Docker Image](https://img.shields.io/badge/GHCR-tuneflow%3Av2.4.2-2496ED?logo=docker&logoColor=white)](https://github.com/tamld/tuneflow/pkgs/container/tuneflow)
[![Design: WCAG AAA](https://img.shields.io/badge/Design-SilverMelody%20WCAG%20AAA-orange.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) · [Tiếng Việt](README.vi.md) · [User Guide](docs/USER_GUIDE.md) · [Roadmap](docs/ROADMAP.md)

</div>

---

## ⚡ Highlights at a Glance

* 👴👵 **Elderly-Friendly UX ("SilverMelody")**: Large touch targets (≥56px), ultra-high contrast (WCAG AAA), warm typography, and zero confusing error popups.
* 📱 **Full PWA & Native App Ecosystem**: Installable PWA with iOS 18 background audio and dynamic Canvas stream Picture-in-Picture (PiP).
* 📺 **Android TV D-Pad Leanback Mode**: Full 10-foot spatial navigation (`Arrow Keys` / Remote D-Pad) for smooth living room TV playback.
* 📂 **Playlist Discovery & Smart Sorting**: Search across videos and playlists with 1-click batch download, filter by type (`all`, `video`, `playlist`), and sort by relevance, views, or upload date.
* 🎧 **Zero-Disk In-App Audio Preview**: Stream and preview any song instantly with speculative prewarming before downloading to ensure it's the exact version you want.
* 🎛️ **Web Audio DSP Equalizer & Volume Boost**: Built-in 3-band biquad filters (Vocal Clarity, Warm Bolero) and 125%–150% boost with dynamic audio compression to prevent speaker distortion.
* 🔐 **SQLite Authentication, RBAC & Session Management**:
  * **Admin**: User accounts CRUD, active session tracking & targeted kick-out (`guests`, `users`, `all_except_me`), guest quota unlock, homelab diagnostics, and 1-click `yt-dlp` updates.
  * **Family User**: Unlimited listening, server-side favorites sync, self-service password changes, and background MP3/MP4 downloads.
  * **Guest**: 30-minute cumulative audio preview quota with automatic cooldown timer.
* 🛡️ **AES-256-GCM Encryption at Rest**: Sensitive data (client IP addresses and session tokens) is encrypted in SQLite (`tuneflow.db`) with zero plaintext leaks.
* 💾 **Direct Client Browser Delivery**: Prompts and saves downloaded 320kbps MP3 / MP4 directly to the client's local computer `Downloads` folder.
* 🛡️ **Homelab Reliability**: Storage quota enforcement (FIFO pruning), resume-safe `.part` download handling, and graceful child process management.

---

## 📱 Supported Platforms & Downloads

| Platform | Client Type | Artifact / Access Method | Audio in Background |
| :--- | :--- | :--- | :---: |
| **Web Browser** | Desktop (Chrome, Safari, Edge, Firefox) | `http://<server-ip>:3000` | ✅ |
| **iOS / iPadOS** | Standalone PWA (Safari Add to Home) | HTTPS URL + Safari Home Screen | ✅ (Hardware lock screen) |
| **Android Mobile** | Native App or PWA | [Download Mobile APK](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Android TV** | 10-Foot Leanback (D-Pad remote) | [Download Android TV APK](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Homelab / NAS** | Docker / Podman (amd64 / arm64) | `ghcr.io/tamld/tuneflow:v2.4.2` | ✅ |

---

## 🚀 Quickstart

### Option A: Docker / Podman Compose (Recommended)
Save as `compose.yaml`:

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
      - ADMIN_PASSWORD=admin       # Initial password — change after first login!
      - STORAGE_MAX_MB=20480       # 20GB downloads threshold before FIFO pruning
    volumes:
      - ./downloads:/app/downloads  # Downloaded audio/video media files
      - ./data:/app/data            # SQLite DB (users, sessions, guest limits)
```

Start the container:
```bash
docker compose up -d
```

### Option B: Local Node.js
```bash
# 1. Clone repository
git clone https://github.com/tamld/tuneflow.git
cd tuneflow

# 2. Install dependencies
npm install

# 3. Start server
npm start
# 🌐 Access at: http://localhost:3000
```

---

## 🌐 Optional Reverse Proxy Recipes

TuneFlow is **100% proxy-agnostic** by default. Choose your preferred reverse proxy recipe below:

### 🔹 Recipe 1: Traefik v3 (Docker Labels)
Attach these labels to the `tuneflow` service in your `compose.yaml`:

```yaml
services:
  tuneflow:
    # ... base container config ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tuneflow.rule=Host(`tuneflow.local`)"
      - "traefik.http.routers.tuneflow.entrypoints=websecure"
      - "traefik.http.routers.tuneflow.tls=true"
      - "traefik.http.services.tuneflow.loadbalancer.server.port=3000"
```

### 🔹 Recipe 2: Nginx / Nginx Proxy Manager
Ensure `proxy_buffering` is disabled for real-time audio byte-range streaming:

```nginx
server {
    listen 80;
    server_name tuneflow.local;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Critical for instant audio streaming & byte ranges:
        proxy_buffering off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

### 🔹 Recipe 3: Caddy 2
Add to your `Caddyfile`:

```caddy
tuneflow.local {
    reverse_proxy localhost:3000
}
```

### 🔹 Recipe 4: Cloudflare Tunnel
Point your public hostname to `http://localhost:3000` via Cloudflare Zero Trust dashboard. No open ports required.

---

## ⚙️ Environment Variables Reference

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP port TuneFlow binds to |
| `NODE_ENV` | `production` | Node.js execution environment (`production` / `development`) |
| `ADMIN_PASSWORD` | `admin` | Bootstrap password for initial default `admin` account |
| `DB_PATH` | `./data/tuneflow.db` | Persistent SQLite database location |
| `DOWNLOADS_DIR` | `./downloads` | Local directory for completed audio downloads |
| `GUEST_MAX_LISTEN_SEC` | `1800` (30m) | Guest cumulative preview duration before cooldown |
| `GUEST_COOLDOWN_SEC` | `1800` (30m) | Cooldown duration for guests before quota resets |
| `MAX_DOWNLOADS` | `2` | Concurrent active download tasks |
| `MAX_CONVERSIONS` | `1` | Concurrent active audio conversion processes |
| `MAX_RETRIES` | `3` | Maximum download retry attempts upon network drop |
| `STORAGE_MAX_MB` | `20480` (20GB) | Downloads directory threshold before auto-pruning |
| `YTDLP_PROXY` | *None* | Optional HTTP/SOCKS5 proxy for YouTube requests |
| `YTDLP_EXTRACTOR_ARGS` | *None* | Custom `yt-dlp` arguments (e.g. `youtube:player_client=android,web`) |

---

## 👑 Default Credentials

* **Username**: `admin`
* **Password**: `admin` *(or value of `ADMIN_PASSWORD`)*
* 💡 *Important: Open the Admin Control Panel (`👑 Admin`) after logging in to change your password and configure user accounts.*

---

## 📚 Documentation & Specifications

* 📖 **[User Guide](docs/USER_GUIDE.md)**: Action-first installation manual for iOS PWA, Android, Android TV, and Docker.
* 🗺️ **[Roadmap](docs/ROADMAP.md)**: Product development roadmap across Phase 1 through Phase 11.
* 📜 **[Changelog](CHANGELOG.md)**: Version release notes, bug fixes, and security enhancements.
* 🏛️ **[Architecture & Specifications](docs/PRD.md)**: Full PRD, SRS, FSM, and compliance documents.

---

## 📄 License & Disclaimer

TuneFlow is an educational open-source project designed for personal and homelab use. Please respect content creators' copyrights.

Licensed under the [MIT License](LICENSE).
