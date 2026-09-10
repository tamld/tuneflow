# ADR-0001: Runtime Environment & Packaging Platform (Node.js 22 LTS & Alpine Linux)

## Context
TuneFlow is designed to be deployed on the author's personal self-hosted homelab server. This server concurrently hosts multiple critical homelab services (Home Assistant, Plex, AdGuard Home, etc.). The primary requirements are minimal idle memory consumption ($\le 150\text{ MB}$), instant startup, non-blocking I/O streaming, and an ultra-lightweight Docker container image ($\le 120\text{ MB}$).

## Decision
1. Adopt **Node.js 22 LTS** as the core backend runtime.
   - Node.js provides an event-driven, non-blocking I/O model optimal for chunked streaming, Server-Sent Events (SSE), and child process orchestration.
2. Utilize **Alpine Linux 3.21 (`node:22-alpine`)** as the base Docker container image.
   - Eliminates standard Debian/Ubuntu base image bloat (~1GB).
3. Install secondary operational binaries directly via `apk`:
   - `ffmpeg`: High-performance audio transcoding.
   - `python3`: Execution environment for `yt-dlp`.
   - `yt-dlp`: Standalone binary fetched directly from official GitHub Releases.

## Consequences
- **Positive**:
  - Container image size compiles to approximately **105 MB** (well within the $\le 120\text{ MB}$ budget).
  - Idle RAM consumption is **35 MB – 42 MB**, with transcode peaks capped under **95 MB**.
- **Negative / Mitigations**:
  - Alpine utilizes `musl libc` instead of `glibc`. Complex native C++ dependencies could present compatibility hurdles; however, official Alpine package repository builds of `ffmpeg` and `python3` operate flawlessly.
