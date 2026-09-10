# ADR-0005: Resilient Queue Design and Network Disconnection Recovery

## Status
Accepted

## Context
Home networking and residential Wi-Fi environments can be unstable, subject to brief outages or sudden power cuts. When downloading a 2-hour long compilation (e.g., a 50-track anthology), losing progress at 90% and purging incomplete data causes immense frustration for elderly users and wastes network bandwidth.

## Decision
1. **Storage Isolation**:
   - Strictly decouple the temporary work directory `downloads/temp/` from the completed output directory `downloads/`.
2. **Preservation of Partial Files (`*.part`, `*.ytdl`)**:
   - `yt-dlp` writes in-progress data to temporary files matching `downloads/temp/<id>.part`.
   - Queue cleanup functions, cancellation routines, and server restarts **must never delete `.part` files**.
   - When a download task is retried or re-initiated, `yt-dlp` automatically detects the existing `.part` file and resumes from the interrupted byte offset (HTTP Range Resume) instead of restarting from zero.
3. **Concurrency Throttling**:
   - Enforce a fixed cap `MAX_CONCURRENT_DOWNLOADS = 2`.
   - Prevent unbounded concurrent downloads from overwhelming host CPU cycles and disk IOPS.

## Consequences
- **Positive**: The system achieves 100% network disconnection survivability. Bandwidth consumption is strictly minimized.
- **Negative**: Incomplete partial files can consume disk storage if tasks are permanently abandoned. Mitigated by an Orphan Cleanup TTL background job sweeping temporary files older than 24 hours.
