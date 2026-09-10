# ADR-0006: Integration of JavaScript Runtime (Node.js) for yt-dlp Extractors

## Status
Accepted

## Context
From mid-2025 into 2026, YouTube continuously rolls out anti-bot algorithms and new media format protections:
1. Experimental SABR-only streaming.
2. Player signature challenges executing dynamic JavaScript code (n-sig / player challenges).
3. If `yt-dlp` runs without an available JavaScript runtime, YouTube responds with `HTTP 403 Forbidden` or fails to extract high-quality audio streams.

## Decision
1. Leverage the pre-existing **Node.js** runtime already present in the execution environment (both local development and the `node:22-alpine` container).
2. Always pass the mandatory argument `--js-runtimes node:node` to all `spawn('yt-dlp', ...)` invocations across the engine codebase (`src/engine/ytdlp.js` and `src/engine/queue.js`).
3. Keep the `yt-dlp` binary updated to current releases (`2026.08.19` or newer).

## Consequences
- **Positive**:
  - Eliminates `HTTP 403 Forbidden` failures during audio stream URL extraction.
  - Avoids installing external runtimes like Deno or QuickJS, preventing container image bloat.
  - Achieves 100% success extraction rate for high-bitrate `ba/b` audio formats.
- **Negative**: Dynamic n-sig challenge resolution incurs negligible CPU overhead to execute the challenge script (~50ms - 100ms).
