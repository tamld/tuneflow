# 🎶 TuneFlow

<div align="center">

**An elegant, elderly-friendly YouTube to MP3/MP4 music downloader with in-app audio preview player. Self-hosted Homelab ready.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: ≥20](https://img.shields.io/badge/Node-%E2%89%A520-green.svg)](#)
[![Docker: Alpine](https://img.shields.io/badge/Docker-Alpine%20%3C120MB-cyan.svg)](#)
[![Design: WCAG AAA](https://img.shields.io/badge/Design-SilverMelody%20WCAG%20AAA-orange.svg)](#)

[English](README.md) · [Tiếng Việt](README.vi.md)

</div>

---

## 🌟 Key Highlights

- 👴👵 **Elderly-Friendly UX ("SilverMelody" Design)**: Large touch targets (≥56px), ultra-high contrast (WCAG AAA), warm Vietnamese typography, zero technical error jargon.
- 🎧 **In-App Audio Preview Player**: Listen to any song or video directly inside the app before downloading to make sure it's the exact track and artist you love.
- 💾 **Direct Client Browser Delivery**: Automatically downloads and saves the final high-quality MP3 (320kbps) straight to the user's computer `Downloads` directory.
- 📦 **Batch & Playlist Support**: 1-Click download for full albums, playlists, or multi-selected search results with safe sequential rate-limiting.
- 🛡️ **Resilient Crash-Survival**: Preserves `.part` download streams for automatic resume upon network failure or server restart.
- 🐳 **Lightweight Homelab Ready**: Docker Alpine multi-stage container (<120MB image, <40MB idle RAM) pre-configured with Traefik reverse proxy labels.

---

## 🚀 Quickstart

### 1. Local Development
```bash
# Clone the repository
git clone https://github.com/tamld/tuneflow.git
cd tuneflow

# Install dependencies
npm install

# Start server
npm start
# App running at: http://localhost:3000
```

### 2. Docker & Homelab (Proxmox / Docker Compose)
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
      - ./downloads:/app/downloads
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tuneflow.rule=Host(`music.homelab.local`)"
      - "traefik.http.services.tuneflow.loadbalancer.server.port=3000"
```

---

## 📄 License & Disclaimer

TuneFlow is an educational open-source project designed for personal and homelab use. Please respect content creators' copyrights.

Licensed under the [MIT License](LICENSE).
