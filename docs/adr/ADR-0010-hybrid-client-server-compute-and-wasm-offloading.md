# ADR-0010: Hybrid Client-Server Compute, Stream Pipelining, and WASM Audio Offloading

## Status
Accepted

## Context
Clarifying architectural compute distribution between server and client: Does audio download stream through the server, or does compute run directly on the client machine with the server acting only as an orchestrator?

## Architectural Decisions
1. **Server Compute Boundaries (Technical Constraints)**:
   - YouTube enforces strict browser CORS (Cross-Origin Resource Sharing) policies; client web browsers CANNOT directly fetch raw media streams from YouTube CDNs.
   - YouTube employs bot-detection mechanisms and dynamic n-sig cipher challenges that require server-side engines (such as `yt-dlp` backed by Node.js).
   - Therefore, **the server MUST handle URL resolution and audio stream extraction**.
2. **Hybrid Client-Server Stream Pipelining**:
   - **Stage 1 (Server)**: Backend resolves direct audio stream URLs and pipes chunks to client devices via HTTP Chunked Transfer Encoding (`ReadableStream`), attaching `Content-Disposition: attachment; filename="song.mp3"`.
   - **Zero-Disk Retention Option**: The server can stream directly from YouTube CDN to the client browser without persisting intermediate bytes to host disk, preventing storage exhaustion.
3. **Client-Side Offloading via WebAssembly & Web Audio API**:
   - Post-processing tasks (audio trimming, loudness normalization, ID3 tag injection) are executed client-side via `ffmpeg.wasm` or the Web Audio API on the client machine's CPU.
   - Offloads 100% of non-essential audio manipulation from the host server.

## Consequences
- Resolves architecture model: Server extracts and pipes streams; Client renders, plays, and post-processes.
- Server host resources remain focused on lightweight network brokering, keeping CPU utilization minimal.
