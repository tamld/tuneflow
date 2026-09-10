# SRS — Phase 3: Software Requirements Specification (Playlist & Batch Engine)

## 1. Functional Requirements
- **FR-301 (Playlist Metadata Extraction Endpoint)**:
  - Endpoint: `POST /api/playlist/parse`
  - Input: `{ "url": "https://www.youtube.com/playlist?list=..." }`
  - Output: Array of track objects `[ { "id", "title", "duration", "thumbnail", "channel" } ]`.
  - Underlying Command: `yt-dlp --flat-playlist --dump-single-json --playlist-end 50 -- <url>`.
- **FR-302 (Batch Queue Ingestion Endpoint)**:
  - Endpoint: `POST /api/queue/batch-add`
  - Input: `{ "items": [ { "id", "title", "url" } ], "format": "mp3" }`
  - Logic: Iterate array, verify deduplication, push items to queue with `queued` status.
- **FR-303 (SHA-256 Checksum Calculation)**:
  - Following FFmpeg `.mp3` export, compute SHA-256 cryptographic hash over stream:
    `crypto.createHash('sha256').update(fileBuffer).digest('hex')`.
  - Store hash in `item.checksum` property.
- **FR-304 (Client Attachment Stream with Checksum Header)**:
  - Endpoint: `GET /api/download/:id/file`
  - Response Headers:
    - `Content-Disposition: attachment; filename="..."`
    - `ETag: "<sha256>"`
    - `x-tuneflow-checksum: "<sha256>"`

## 2. Non-Functional Requirements
- **NFR-301 (Parsing Latency)**: Extract 50 playlist tracks in $\le 3.0\text{ seconds}$.
- **NFR-302 (Data Integrity)**: 100% of delivered files match server-computed SHA-256 hashes.
- **NFR-303 (Bounded Concurrency)**: Active download child processes strictly capped at 2 (`MAX_CONCURRENT_DOWNLOADS = 2`).
