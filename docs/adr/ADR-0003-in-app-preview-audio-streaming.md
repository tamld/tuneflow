# ADR-0003: In-App Preview Audio Streaming Architecture

## Context
Elderly users need to preview songs to verify track quality and performers before downloading. If the server was required to download the entire media file before playback:
1. Users would experience 30–120 seconds of latency before hearing any audio.
2. Homelab server storage and CPU queues would be exhausted for songs that might be discarded after 5 seconds of listening.

## Decision
Implement endpoint `/api/preview/:id` leveraging direct audio stream resolution:
1. Invoke `yt-dlp` to resolve the direct audio stream URL from CDN endpoints.
2. Return an HTTP redirect (`302 Found`) or pipe the byte stream directly to the client browser.
3. The client's HTML5 `<audio>` element streams the audio chunks in real time.

## Consequences
- **Positive**:
  - Audio playback starts in less than **1.5 seconds**.
  - Zero disk storage and near-zero server CPU transcode overhead during preview sessions.
- **Negative / Constraints**:
  - Direct CDN URLs carry expiration tokens (`expire=...`) bound to the requesting IP, valid strictly for the active session.
