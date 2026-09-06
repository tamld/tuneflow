# TuneFlow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build TuneFlow — an elegant, elderly-friendly YouTube to MP3/MP4 music downloader with an in-app audio preview player, client-side direct delivery, and an ultra-lightweight Docker container optimized for Proxmox Homelab.

**Architecture:** Node.js 22 LTS with Fastify/Express backend managing child process execution (`yt-dlp` and `ffmpeg`) via a bounded concurrency state machine. Frontend is an accessible, high-contrast, large-touch-target Vanilla SPA featuring an embedded no-ad YouTube preview player and automated SSE stream piping. Packaged via multi-stage Alpine Docker container (<120MB) integrated with Traefik reverse proxy labels.

**Tech Stack:** Node.js 22, Express/Fastify, yt-dlp, FFmpeg, Server-Sent Events (SSE), Vanilla HTML5/CSS3/ES6, Docker (Alpine), GitHub Actions.

**Spec:** [docs/spec/01-tuneflow-core-spec.md](file:///C:/Users/Administrator/github/tuneflow/docs/spec/01-tuneflow-core-spec.md)

## Global Constraints

- Backend must compile/run with zero native C-bindings; rely exclusively on system `yt-dlp` and `ffmpeg` binaries.
- Image size must remain under 120MB on Alpine base image.
- Idle container memory consumption must not exceed 50MB RAM.
- UI must comply with WCAG AAA contrast ratio and support touch/click targets ≥ 52px.
- UI language is 100% warm, polite Vietnamese with zero technical error jargon.
- Download delivery must pipe completed MP3 directly to client browser (`Content-Disposition: attachment`).

---

### Task 1: SSoT Manifest & Project Foundation

**Files:**
- Create: `manifest.json`
- Create: `package.json`
- Create: `.gitignore`
- Create: `README.md`
- Create: `LICENSE`

- [ ] **Step 1: Write package.json and manifest.json configuration**
- [ ] **Step 2: Initialize gitignore and MIT license**
- [ ] **Step 3: Create README.md with project architecture and quickstart**
- [ ] **Step 4: Verify npm installation and commit foundation**

---

### Task 2: Core Download, Conversion & Stream Engine

**Files:**
- Create: `src/config.js`
- Create: `src/engine/ytdlp.js`
- Create: `src/engine/ffmpeg.js`
- Create: `src/engine/queue.js`
- Test: `tests/engine.test.js`

- [ ] **Step 1: Write failing engine unit test**
- [ ] **Step 2: Implement yt-dlp info extraction and argument-injection prevention (`--`)**
- [ ] **Step 3: Implement ffmpeg audio extraction to high-quality MP3 (320kbps)**
- [ ] **Step 4: Implement bounded queue with retry and resumable `.part` file preservation**
- [ ] **Step 5: Run engine test and verify pass**

---

### Task 3: In-App Preview & Server Endpoints

**Files:**
- Create: `src/server.js`
- Create: `src/routes/api.js`
- Test: `tests/api.test.js`

- [ ] **Step 1: Write failing API route test for search, preview-metadata, queue, and download-stream**
- [ ] **Step 2: Implement `/api/search` with sorting (`sp`) and playlist support**
- [ ] **Step 3: Implement `/api/preview/:id` for fast audio/video stream preview**
- [ ] **Step 4: Implement `/api/download/:id/file` for direct browser file attachment stream**
- [ ] **Step 5: Implement SSE stream `/api/queue/stream` for live progress**
- [ ] **Step 6: Run API test suite and verify pass**

---

### Task 4: Elderly-Friendly "VibeEase" Frontend

**Files:**
- Create: `public/index.html`
- Create: `public/css/vibeease.css`
- Create: `public/js/player.js`
- Create: `public/js/app.js`
- Create: `public/assets/`
- Test: `tests/ui-accessibility.test.js`

- [ ] **Step 1: Design HTML5 semantic layout with high-contrast, large-button layout**
- [ ] **Step 2: Implement no-ad embedded Audio Preview Player**
- [ ] **Step 3: Implement Search & 1-Click "Tải về máy" button with automatic browser download**
- [ ] **Step 4: Implement Batch selection & Playlist preview list**
- [ ] **Step 5: Test UI responsiveness and accessibility with Puppeteer**

---

### Task 5: Homelab Docker Packaging & GitHub Actions CI/CD

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.dockerignore`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Write multi-stage lightweight Alpine Dockerfile**
- [ ] **Step 2: Write docker-compose.yml with Traefik labels and memory cap**
- [ ] **Step 3: Configure GitHub Actions CI workflow (lint + test)**
- [ ] **Step 4: Configure GitHub Actions Release workflow (multi-arch build for ghcr.io)**
- [ ] **Step 5: Validate workflows and commit**
