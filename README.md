# 🎶 TuneFlow

<div align="center">

**An elegant, elderly-friendly YouTube to MP3/MP4 music downloader with in-app audio preview player. Self-hosted & container-ready (Docker, Podman, VPS, Cloud, Local).**

[![Latest Release](https://img.shields.io/github/v/release/tamld/tuneflow?color=blue&logo=github)](https://github.com/tamld/tuneflow/releases/latest)
[![CI Gate](https://github.com/tamld/tuneflow/actions/workflows/ci.yml/badge.svg)](https://github.com/tamld/tuneflow/actions/workflows/ci.yml)
[![Docker Image](https://img.shields.io/badge/GHCR-tuneflow%3A2.4.3-2496ED?logo=docker&logoColor=white)](https://github.com/tamld/tuneflow/pkgs/container/tuneflow)
[![Design: WCAG AAA](https://img.shields.io/badge/Design-SilverMelody%20WCAG%20AAA-orange.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) · [Tiếng Việt](README.vi.md) · [User Guide](docs/USER_GUIDE.md) · [Roadmap](docs/ROADMAP.md)

</div>

---

## ⚡ Core Features

1. 👴👵 **Elderly-Friendly UX ("SilverMelody")**: Large touch targets (≥56px), ultra-high contrast (WCAG AAA), and clear typography.
2. 📱 **Full PWA & Native Ecosystem**: iOS 18 background audio persistence, dynamic Canvas PiP, Android APK, and Android TV D-Pad Leanback mode.
3. 🎧 **Zero-Disk In-App Audio Preview**: Stream and preview any song instantly before downloading without wasting server disk.
4. 🎛️ **Web Audio DSP Equalizer**: 3-band presets (Vocal Clarity, Warm Bolero) and safe volume boost (125%–150%) with dynamic audio compression.
5. 🔐 **Zero-Config SQLite Security**: Role-based access (Admin, User, Guest), active session management, and AES-256-GCM encryption at rest.

---

## 📱 Platforms & Downloads

| Platform | Client Type | Download / Link | Background Audio |
| :--- | :--- | :--- | :---: |
| **Windows Desktop** | Native Setup Wizard (Inno Setup 6, Zero-Admin) | [Download Setup.exe](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Linux Desktop** | Standalone & FreeDesktop Application | [Download Linux Assets](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Web Browser** | Desktop (Chrome, Safari, Edge, Firefox) | `http://<server-ip>:3000` | ✅ |
| **iOS / iPadOS** | Standalone PWA | Safari Add to Home Screen | ✅ (Hardware lock screen) |
| **Android Mobile** | Native App / PWA | [Download Mobile APK](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Android TV** | 10-Foot Leanback UI | [Download Android TV APK](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Self-Hosted / Server** | Container (Docker / Podman / Compose) | `ghcr.io/tamld/tuneflow:2.4.3` | ✅ |

---

## 🚀 Quickstart (Docker Compose)

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
      - ADMIN_PASSWORD=admin       # Change after first login!
    volumes:
      - ./downloads:/app/downloads  # Media files
      - ./data:/app/data            # SQLite DB
```

Start the service:
```bash
docker compose up -d
```
Access at `http://localhost:3000`. Default login: `admin` / `admin`.

---

## 📚 Documentation Hub

* 📖 **[User Guide](docs/USER_GUIDE.md)**: Action-first installation manual for iOS PWA, Android, Android TV, and Docker.
* ⚙️ **[Configuration Reference](docs/CONFIG.md)**: Full list of environment variables, quotas, and security flags.
* 🌐 **[Reverse Proxy Recipes](docs/REVERSE_PROXY.md)**: Ready-to-use configurations for Traefik v3, Nginx, Caddy 2, and Cloudflare Tunnel.
* 🗺️ **[Roadmap](docs/ROADMAP.md)**: Product development roadmap across Phase 1 through Phase 11.
* 📜 **[Changelog](CHANGELOG.md)**: Release history, upgrade notes, and bug fixes.
* 🏛️ **[Architecture & Specs](docs/PRD.md)**: Full PRD, SRS, FSM, and compliance documents.

---

## 📄 License

TuneFlow is licensed under the [MIT License](LICENSE).
