# FSM — Phase 3: Playlist Batch Queue & Item Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Discovered: Playlist URL parsed
    Discovered --> Selected: User checks boxes
    Selected --> Queued: Batch add submitted
    
    state BoundedConcurrencyPool {
        Queued --> Downloading: active_slots < 2
        Downloading --> Transcoding: raw audio stream complete
        Transcoding --> VerifyingChecksum: mp3 320kbps encoded
        VerifyingChecksum --> Completed: sha256 computed & matched
    }
    
    Downloading --> Failed: network drop / bot challenge
    Failed --> Retrying: retry_count < 3
    Retrying --> Downloading: resume from .part byte offset
    Retrying --> DeadLetter: retry_count >= 3
    
    Downloading --> Cancelled: user clicks cancel
    Queued --> Cancelled: user clicks cancel
    
    Completed --> Delivered: Client browser receives attachment stream
    Delivered --> [*]
```

## State Explanations
1. **Discovered ➔ Selected**: Tracklist parsed and presented for user review and multi-selection.
2. **Queued ➔ Downloading**: Transitions to active download when running execution slots $< 2$.
3. **Transcoding ➔ VerifyingChecksum**: FFmpeg extracts MP3 audio, followed by streaming SHA-256 hash calculation via `crypto.createHash('sha256')`.
4. **VerifyingChecksum ➔ Completed**: Audio matches 320kbps fidelity, checksum verified, ready for client delivery.
5. **Retrying**: Resumes downloads up to 3 times from `.part` offsets upon transient network drops.
