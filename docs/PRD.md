# Product Requirements Document (PRD)
## Project: TuneFlow — Elderly-Friendly YouTube Music Streamer & Downloader

> **Document ID**: `TUNEFLOW-PRD-02`  
> **Version**: `2.4.2`  
> **Product Owner**: Tam Le (`tamld/tuneflow`)  
> **Target Audience**: Elderly Family Members & Homelab Administrators  
> **Status**: APPROVED (Active SSoT)  

---

## 1. Product Vision

Elderly family members often seek nostalgic music (golden oldies, traditional folk, bolero, meditation chants). However, the modern YouTube web ecosystem is fraught with barriers:
1. **Intrusive Advertisements:** Frequent ad interruptions disrupt listening and expose seniors to phishing or malicious pop-ups.
2. **Deceptive Download Portals:** Public "free YouTube to MP3" websites are infested with fake download buttons, malware, and degraded audio quality.
3. **Storage Inaccessibility:** Traditional homelab self-hosted downloaders save media to internal server directories, requiring manual sysadmin intervention to transfer files to the user's computer.

**TuneFlow** resolves all these barriers: A self-hosted, ad-free music portal engineered with **SilverMelody (WCAG 2.2 AAA)** ergonomics. It enables instant in-app audio preview (<1.5s latency), playlist batch queueing, dynamic Web Audio DSP equalization, and **direct HTTP client delivery of high-bitrate 320kbps MP3/MP4 files straight into the user's browser `Downloads` folder**.

---

## 2. User Personas

### Persona 1: Elderly Parents (Primary End Users)
- **Age**: 60–75 years.
- **Listening Habits**: Morning tea or evening relaxation; transferring songs to USB drives for car or speaker playback.
- **Physical Characteristics**: Reduced visual acuity (needs large text, high contrast), declining motor precision (needs large click targets $\ge 56\text{px}$), tech anxiety.
- **Key Expectations**:
  - Immediate 1-touch discovery chips for familiar genres.
  - Instant in-app preview before committing to a download.
  - Transparent file delivery directly into their local device `Downloads` folder.

### Persona 2: Family Member (Registered User)
- **Listening Habits**: Curating personal favorites, listening across desktop, mobile PWA, and living room TV.
- **Key Expectations**:
  - Persistent server-side favorites synchronized across devices.
  - Self-service password management without requiring sysadmin help.
  - Continuous background audio on smartphones when screen is locked.

### Persona 3: Homelab Sysadmin / Self-Hoster
- **Characteristics**: DevOps engineer or homelab hobbyist hosting services on local hardware or VPS.
- **Key Expectations**:
  - Ultra-lightweight multi-arch container image (<120MB Alpine Linux).
  - Proxy-agnostic deployment (Traefik, Nginx, Caddy, Cloudflare Tunnel).
  - Robust crash recovery, storage quota enforcement (FIFO pruning), and AES-256-GCM encryption at rest.

---

## 3. User Stories Matrix

| ID | User Story | Priority | Target Capability |
| :--- | :--- | :--- | :--- |
| **US-01** | As an elderly parent, I want 1-touch genre chips so I don't have to type complex search queries. | P0 (Must Have) | Large discovery chips (Bolero, Pre-1975, Instrumental, Meditation). |
| **US-02** | As an elderly parent, I want to preview songs inside the app in real time so I only download the exact version I like. | P0 (Must Have) | Zero-disk stream pipe (`/api/stream/pipe/:id`) with byte-range seeking. |
| **US-03** | As an elderly parent, I want downloaded songs to appear directly on my computer without searching the server. | P0 (Must Have) | Direct client download via HTTP `Content-Disposition: attachment`. |
| **US-04** | As an elderly parent, I want large text and soothing colors that don't hurt my eyes. | P0 (Must Have) | SilverMelody design system: $\ge 56\text{px}$ touch targets, WCAG 2.2 AAA contrast ($\ge 7:1$). |
| **US-05** | As an elderly parent, I want to enhance vocal clarity or bass warmth for nostalgic tracks. | P1 (Should Have) | Web Audio DSP Equalizer (Vocal Clarity, Warm Bolero, Flat) & Volume Boost. |
| **US-06** | As a mobile user, I want playback to continue when I lock my iPhone or switch apps. | P0 (Must Have) | iOS Web Audio bypass to native HTML5 `<audio>` + MediaSession integration. |
| **US-07** | As a mobile user, I want floating Picture-in-Picture while using other apps. | P1 (Should Have) | Dynamic Canvas 512x512 stream PiP (`canvas.captureStream(10)`). |
| **US-08** | As a living room viewer, I want to navigate TuneFlow using my Android TV remote. | P1 (Should Have) | 10-foot Leanback mode with spatial D-Pad navigation (`tv-leanback.js`). |
| **US-09** | As a sysadmin, I want guest previews capped at 30 minutes to prevent resource exhaustion. | P0 (Must Have) | SQLite guest cooldown limiter with sliding window tracking. |
| **US-10** | As an admin, I want to view active sessions and revoke compromised logins. | P0 (Must Have) | Admin session manager with group kick-out (`guests`, `users`, `all_except_me`). |
| **US-11** | As a security officer, I want client IPs and session tokens encrypted at rest. | P0 (Must Have) | AES-256-GCM authenticated encryption in `tuneflow.db`. |
| **US-12** | As a sysadmin, I want disk space automatically capped to prevent full-disk server crashes. | P0 (Must Have) | Automated FIFO quota pruner (`STORAGE_MAX_MB`). |

---

## 4. Non-Functional Requirements (NFR)

1. **Performance**:
   - Audio preview startup latency: $\le 1.5\text{s}$ over broadband.
   - Search response latency: $\le 2.0\text{s}$ via cached metadata.
   - Container idle memory footprint: $\le 50\text{MB}$ RAM; active peak: $\le 150\text{MB}$ RAM.
2. **Security & Privacy**:
   - Zero plaintext storage of client IP addresses or session tokens.
   - SSRF protection: Strict domain whitelisting (official YouTube domains only).
   - Rate limiting: Sliding-window throttle on API endpoints.
3. **Multi-Platform Compatibility**:
   - Web: Chrome $\ge 110$, Edge $\ge 110$, Firefox $\ge 115$, Safari $\ge 16.4$.
   - Mobile: iOS 16.4+ (WebKit Standalone PWA), Android 10+ (PWA & Native APK).
   - TV: Android TV / Google TV (API 26+) with D-Pad remote control.
