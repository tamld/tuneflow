# PRD — Phase 3: Playlist Batch Parsing, Multi-Select & Checksum Verification

## 1. Product Goal
Provide batch downloading capabilities for entire playlists or selective subsets of tracks tailored for elderly family members, featuring clear visual track listings, intelligent bounded concurrency queuing to prevent host resource starvation, and automated SHA-256 integrity verification for every delivered track.

## 2. User Experience Flow
1. **Paste Link**: Family members paste a YouTube playlist URL into the unified search bar.
2. **Review Tracklist**: The application parses metadata instantly, displaying song titles, thumbnails, durations, and selection checkboxes.
3. **Action Selection**:
   - Primary action: **"Download Entire Playlist (X tracks)"**
   - Granular selection: Check specific tracks ➔ Click **"Download Selected (Y tracks)"**.
4. **Monitor Progress**: Real-time progress table displays sequential states: *Queued ➔ Downloading ➔ Transcoding ➔ Completed (Auto-delivered to local device)*.

## 3. Core Features
- **High-Speed Playlist Parsing**: Uses flat-playlist mode without downloading media chunks, rendering tracklists in $< 2$ seconds.
- **Bounded Concurrency Queue**: Enforces a strict limit of 2 parallel downloads (`MAX_CONCURRENT_DOWNLOADS = 2`).
- **Resumable Transfers**: Preserves in-progress `.part` temporary files across transient connection outages.
- **SHA-256 Checksum Validation**: Automatically computes cryptographic hashes following FFmpeg muxing to eliminate corrupted media delivery.
