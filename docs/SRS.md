# Software Requirements Specification (SRS)
## System: TuneFlow (YouTube to Audio Converter & Media Streamer)

> **Document ID**: `TUNEFLOW-SRS-02`  
> **Compliance Standards**: IEEE 830 / ISO 29148  
> **Version**: `2.4.2`  
> **Effective Date**: 2026-09-10  
> **Status**: APPROVED (Active SSoT)  

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software architecture, external interfaces, functional behaviors, performance boundaries, and security constraints for **TuneFlow v2.4.2**.

### 1.2 System Scope
TuneFlow is a full-stack, self-hosted media streaming and downloading platform comprising:
- **Client Presentation Layer**: Vanilla ES6 SPA with zero heavy framework overhead, adhering to WCAG 2.2 AAA accessibility standards ("SilverMelody").
- **DSP & Spatial Navigation Engine**: In-browser Web Audio biquad filtering, volume boost with dynamic compressor, spatial navigation for Android TV remote D-Pads, and dynamic Canvas stream Picture-in-Picture.
- **Backend Application Server**: Node.js 22 Express engine coordinating zero-disk streaming pipes, in-memory rate limiting, speculative prewarming, and background download queues.
- **Storage & Security Subsystem**: Persistent SQLite database with AES-256-GCM encrypted fields for client IPs and active session tokens.

---

## 2. System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT PRESENTATION LAYER                       │
│  Desktop Browser / iOS Standalone PWA / Android Mobile / Android TV   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / Byte-Range / MediaSession
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        REVERSE PROXY (OPTIONAL)                        │
│             Traefik v3 / Nginx / Caddy 2 / Cloudflare Tunnel           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Private LAN / Localhost:3000
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     TUNEFLOW NODE.JS APPLICATION CORE                  │
│                                                                        │
│  ├── Express Routing & SSRF Whitelisting                               │
│  ├── Zero-Disk Stream Pipe (/api/stream/pipe/:id)                      │
│  ├── In-Memory Sliding-Window Rate Limiter & Search Cache              │
│  ├── Resilient Download Queue (Concurrency = 2, Retry = 3)             │
│  ├── SQLite Repository (Users, Sessions, Favorites, Guest Quotas)      │
│  └── AES-256-GCM Crypto Subsystem (Zero Plaintext Leaks)               │
└───────────────────────────┬───────────────────────────────┬────────────┘
                            │                               │
                            ▼                               ▼
               ┌────────────────────────┐      ┌─────────────────────────┐
               │ yt-dlp Subprocess Pool │      │ FFmpeg Transcoder Pool  │
               │ (Isolated Args Array)  │      │ (libmp3lame 320kbps)    │
               └────────────────────────┘      └─────────────────────────┘
```

---

## 3. Detailed Functional Requirements

### REQ-FUNC-01: YouTube Video & Playlist Search
- The system shall query YouTube using the official `yt-dlp` extractor or in-memory cached results.
- Search queries shall support Unicode and Vietnamese accented characters without malformed URI errors.
- Cached search metadata shall be stored in memory with an LRU policy to minimize child process spawns.

### REQ-FUNC-02: Zero-Disk In-App Streaming Pipe
- Endpoint: `GET /api/stream/pipe/:id`
- The server shall stream audio chunks directly from the YouTube audio pipe to the client using HTTP chunked transfer and `Accept-Ranges: bytes`.
- The system shall never buffer or write preview audio to the server's persistent disk storage.

### REQ-FUNC-03: Web Audio DSP Equalizer & Volume Boost
- The web client shall construct a Web Audio `AudioContext` graph featuring:
  - 3-band biquad filters: Low-shelf (100Hz), Peaking (1.2kHz), High-shelf (10kHz).
  - Presets: `Vocal Clarity` (+3dB mid, -2dB bass), `Warm Bolero` (+4dB bass, -2dB treble), and `Standard` (flat).
  - Volume boost tiers: 100%, 125%, and 150%, capped by a dynamic `DynamicsCompressorNode` to eliminate speaker clipping.

### REQ-FUNC-04: iOS PWA Standalone Background Audio & PiP
- On iOS devices, audio shall bypass the Web Audio graph to directly drive the native HTML5 `<audio>` element, ensuring iOS `mediaserverd` retains playback upon screen lock.
- `navigator.mediaSession` shall register handlers for `play`, `pause`, `previoustrack`, `nexttrack`, and `seekto`.
- A dynamic 512x512 `<canvas>` capture stream (`captureStream(10)`) paired with a hidden `<video>` element shall provide Picture-in-Picture (PiP) support on mobile Safari.

### REQ-FUNC-05: Android TV D-Pad Spatial Navigation
- The client shall integrate `tv-leanback.js`, registering `SpatialNavigation` listeners for D-Pad arrow keys, `OK`, and `Back`.
- The UI shall support a dedicated 10-foot TV mode with ambient full-screen visualizer overlays and high-contrast focus rings.

### REQ-FUNC-06: Role-Based Access Control & Active Sessions
- The system shall enforce three distinct security roles: `admin`, `user`, and `guest`.
- Active sessions shall be stored in SQLite with hashed tokens and authenticated via `requirePermission(perm)` middleware.
- Administrators shall have authority to revoke active sessions individually or by target group (`guests`, `users`, `all_except_me`).

### REQ-FUNC-07: Sensitive Data Encryption at Rest (AES-256-GCM)
- Client IP addresses recorded for session tracking and quota accounting shall be encrypted using AES-256-GCM with a server-side encryption key.
- Raw SQLite file inspection shall yield zero plaintext IP addresses or credentials.

### REQ-FUNC-08: Direct Client File Delivery
- Downloaded audio shall be delivered to the client via HTTP response headers:
  `Content-Disposition: attachment; filename="<sanitized-title>.mp3"`
- Files are saved directly into the user's browser `Downloads` directory, eliminating manual server-side file retrieval.

---

## 4. API Endpoints Reference

| Method | Endpoint | Access Level | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System status and active task count |
| `GET` | `/api/search` | Public | Search YouTube videos and playlists |
| `GET` | `/api/stream/pipe/:id` | Public (Quoted) | Zero-disk live audio stream pipe |
| `POST` | `/api/queue/add` | User / Admin | Queue track or playlist for background download |
| `GET` | `/api/queue/list` | User / Admin | Retrieve current active and completed tasks |
| `GET` | `/api/download/:id/file`| User / Admin | Direct client delivery of completed media file |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials and issue session |
| `POST` | `/api/auth/logout` | Authenticated | Terminate current session token |
| `GET` | `/api/admin/sessions` | Admin | List all active sessions with encrypted IP decoders |
| `POST` | `/api/admin/sessions/revoke` | Admin | Terminate sessions by token or group filter |
| `POST` | `/api/system/update-ytdlp` | Admin | Trigger 1-click update of standalone `yt-dlp` |
