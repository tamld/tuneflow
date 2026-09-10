# Phase 3 Governance: Definition of Ready, Definition of Done & Acceptance Criteria

## 1. Definition of Ready (DoR)
- [x] ADR-0008 approved, defining flat-playlist extraction and SHA-256 hashing.
- [x] SRS and FSM specifications finalized for queue state transitions and bounded concurrency pool.
- [x] UI tracklist selection designed with minimum touch target dimensions $\ge 48\text{px}$.

## 2. Definition of Done (DoD)
- [x] Endpoint `/api/playlist/parse` parses live playlists in under 3 seconds.
- [x] Endpoint `/api/queue/batch-add` accepts track arrays and maintains maximum 2 concurrent workers.
- [x] 100% of completed MP3 files have computed SHA-256 hashes recorded in `checksum`.
- [x] Simulated network interruption tests confirm `.part` files resume successfully.
- [x] Test suite `tests/playlist.test.js` and `tests/checksum.test.js` pass 100%.

## 3. Acceptance Criteria (AC)
- **AC-301**: Sending a 10-track playlist URL to `/api/playlist/parse` returns 10 JSON track objects with titles and thumbnails.
- **AC-302**: When submitting a batch of 10 tracks, active `yt-dlp` and `ffmpeg` processes never exceed 2 concurrently.
- **AC-303**: Completed download via `curl -i /api/download/:id/file` delivers header `x-tuneflow-checksum` matching local `sha256sum <file>`.
