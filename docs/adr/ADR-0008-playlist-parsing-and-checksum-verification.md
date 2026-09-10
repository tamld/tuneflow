# ADR-0008: Playlist Batch Parsing, Bounded Concurrency Queue, and SHA-256 Checksum Verification

## Status
Accepted

## Context
Elderly listeners frequently listen to full thematic playlists (e.g., "20 Meditation Songs for Deep Sleep", "Classic Pre-War Ballads"). Ingesting 20–50 tracks simultaneously risks spiking server CPU and memory, choking home bandwidth, and inducing connection drops or corrupted audio muxing.

## Architectural Decisions
1. **Two-Stage Playlist Extraction**:
   - Stage 1: Fast metadata extraction via `yt-dlp --flat-playlist -J` in $< 2$ seconds, returning a track list for client selection.
   - Stage 2: Users can select "Download All" or pick individual desired tracks.
2. **Bounded Concurrency Queue**:
   - Hard limit of 2 concurrent downloads (`MAX_CONCURRENT_DOWNLOADS = 2`).
   - Remaining tracks stay in `queued` state and automatically trigger when an execution slot frees up.
3. **Resumable Transfers**:
   - Preserve `.part` temporary files on network drop. Upon retry, `yt-dlp` resumes from the next byte offset rather than restarting from zero.
4. **Integrity Checksums**:
   - Following FFmpeg MP3 muxing, the system calculates the **SHA-256** hash of the completed file and records it in metadata.
   - Client downloads receive the hash via `ETag: <sha256>` or `x-checksum-sha256: <hash>` headers to confirm 100% file integrity.

## Consequences
- Protects container host CPU and network resources from starvation.
- Prevents serving truncated or corrupted audio files to family members.
