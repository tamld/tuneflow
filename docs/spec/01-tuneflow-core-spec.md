# OpenSpec DELTA-01: TuneFlow Core Specification

> **Specification Standard**: OpenSpec Spec Kit Framework  
> **Status**: APPROVED  
> **Authority**: TamLD (`github.com/tamld/tuneflow`)  
> **Target Audience**: AI Agents, Systems Engineers, UX Reviewers  

---

## 1. Architectural Scope & Problem Statement

### 1.1 Problem
Elderly family members face significant barriers when attempting to save music and audio from YouTube:
1. Video sites are littered with predatory pop-up ads, deceptive "Download" buttons, and complex menus.
2. Web services frequently download compressed, low-bitrate, corrupt files or fail entirely without clear feedback.
3. Homelab self-hosted solutions typically save downloads on the remote server's storage disk, leaving the client device with no accessible file without manual SSH/SMB navigation.

### 1.2 Solution
TuneFlow provides:
- A clean, self-hosted, lightweight Node.js daemon running on Proxmox.
- An in-app audio preview engine that allows elderly users to verify the exact artist/song before queuing.
- An automated client streaming delivery endpoint (`Content-Disposition: attachment`) that transmits completed MP3 files directly into the client computer's native `Downloads` folder.
- High-contrast, large-touch-target, 100% warm Vietnamese UI.

---

## 2. Technical Invariants

1. **Zero-Crash Stream Resiliency**:
   - `yt-dlp` output must always be written to an isolated temporary location (`downloads/temp/`).
   - Partial downloads (`*.part`, `*.ytdl`) must NEVER be deleted during server startup or cancellation cleanups to guarantee 100% resumability.
2. **Deterministic Argument Injection Defense**:
   - All external CLI calls to `yt-dlp` MUST supply `--` prior to arbitrary user URL inputs to guarantee flags cannot be injected.
3. **Resource Caps**:
   - Max memory usage under active conversion: $\le 150\text{ MB}$.
   - Max memory usage under idle state: $\le 50\text{ MB}$.
   - Container image size: $\le 120\text{ MB}$ (Alpine-based).

---

## 3. API Contract

### `GET /api/search`
- Query params: `q` (string, required), `sp` (string, optional - YouTube sort filter), `type` (video | playlist).
- Response: `200 OK` JSON with array of `{ id, title, uploader, duration, thumbnail, url, isPlaylist }`.

### `GET /api/preview/:id`
- Streams direct audio bytes or redirect URL for client-side HTML5 audio element preview.

### `POST /api/queue/add`
- Body: `{ url, title, format: 'mp3' | 'mp4' }`.
- Response: `200 OK` JSON with `{ success: true, item: { id, title, status: 'queued' } }`.

### `GET /api/queue/stream`
- Server-Sent Events (SSE) stream broadcasting `{ items: [...], stats: {...} }` every 500ms or upon status delta.

### `GET /api/download/:id/file`
- Binary file stream.
- Headers:
  - `Content-Type: audio/mpeg`
  - `Content-Disposition: attachment; filename="[title].mp3"`

---

## 4. Definition of Done (DoD)

- [x] All unit and API tests pass with exit code 0.
- [x] Puppeteer E2E test confirms Search ➔ Preview ➔ Download flow.
- [x] WCAG AAA contrast ratio verified on all interactive elements.
- [x] Dockerfile builds multi-stage image under 120MB.
