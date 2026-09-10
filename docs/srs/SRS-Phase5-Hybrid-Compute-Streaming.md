# SRS — Phase 5: Software Requirements Specification (Hybrid Compute)

## 1. Functional Requirements
- **FR-501 (Direct Stream Proxy Endpoint)**:
  - Endpoint: `GET /api/stream/pipe/:id`
  - Logic: Server resolves direct audio stream URL via yt-dlp, establishes upstream `fetch(directUrl)` connection, and pipes binary chunks into `res` (HTTP Response) with `Transfer-Encoding: chunked`.
  - Zero host disk persistence (`zero-disk-io`).
- **FR-502 (Client Web Streams Ingestion)**:
  - Client utilizes `ReadableStreamDefaultReader` to ingest chunks, calculating real-time progress percentages against `Content-Length`.
- **FR-503 (Client-Side WASM Audio Muxer)**:
  - Embeds `@ffmpeg/ffmpeg` compiled to WebAssembly.
  - Enables user timestamp selection (start/end offsets) to trim `.mp3` ringtones directly on client hardware.

## 2. Non-Functional Requirements
- **NFR-501 (Server Overhead)**: Zero-Disk Stream consumes $\le 15\text{ MB}$ additional RAM per concurrent stream on server.
- **NFR-502 (Playback Latency)**: Time to initial audio playback from preview button click $\le 1.5\text{ seconds}$.
