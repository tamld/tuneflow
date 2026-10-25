# Finite State Machine Specification (FSM)
## Project: TuneFlow

This document defines the formal state transitions for TuneFlow's core lifecycles: Download Tasks, Audio Streaming, and User Authentication.

---

## 1. Download Task Lifecycle FSM

```text
       ┌──────────────┐
       │   QUEUED     │
       └──────┬───────┘
              │ Slot available (active < MAX_DOWNLOADS)
              ▼
       ┌──────────────┐
       │ DOWNLOADING  │◄────────────┐ (Network glitch, retry <= 3)
       └──────┬───────┘             │
              │ Download complete   │
              ▼                     │
       ┌──────────────┐             │
       │  CONVERTING  │             │
       └──────┬───────┘             │
              │ Transcoding done    │
              ▼                     │
       ┌──────────────┐             │
       │  COMPLETED   │             │
       └──────────────┘             │
                                    │
       (Error / Network Drop)───────┴────► ┌──────────┐
                                           │  FAILED  │ (Retries exhausted)
                                           └──────────┘
```

- `QUEUED`: Task is pending execution in the FIFO queue (`progress = 0%`). When `retries > 0`, UI displays `⏳ Đang thử tải lại (lần retries/3)...`.
- `DOWNLOADING`: `yt-dlp` (`-f 140/251/bestaudio/best`, without `-x`) is fetching raw audio (`progress = 5%..85%`).
- `CONVERTING`: `ffmpeg` (`-nostdin`, `libmp3lame` 320kbps) is encoding audio to MP3 and attaching ID3 metadata (`progress = 86%..99%`).
- `COMPLETED`: Media file is written, SHA-256 verified, and ready for client delivery (`progress = 100%`).
- `CANCELLED`: User cancelled an active or queued task; child process tree is terminated and temp files are removed.
- `FAILED`: Task failed permanently after 3 retry attempts; UI exposes `🔄 Tải Lại`.

### 1.1 Counter & Progress Invariants
- **Active Badge Invariant (`#queue-badge-count`)**: Always equals `count(status ∈ {QUEUED, DOWNLOADING, CONVERTING})`.
- **Drawer Total Invariant (`#drawer-count`)**: Always equals `count(all queue items)`.
- **Offline Library Invariant (`#downloaded-count`)**: Automatically refreshes via `/api/library/local` whenever any item enters `COMPLETED`.
- **Progress Monotonicity Within Attempt**: `0 (QUEUED) -> 5..85 (DOWNLOADING) -> 86..99 (CONVERTING) -> 100 (COMPLETED)`.

---

## 2. In-App Audio Streaming Player FSM

```text
┌──────────┐      Click "Preview"      ┌──────────┐      First Chunk      ┌──────────┐
│   IDLE   ├──────────────────────────►│ BUFFERING├──────────────────────►│ PLAYING  │
└────▲─────┘                           └────┬─────┘                       └────┬─────┘
     │                                      │                                  │
     │ Track ended / Stop clicked           │ Network error                    │ Pause
     └──────────────────────────────────────┴───────────────┐                  ▼
                                                            │             ┌──────────┐
                                                            └────────────►│  PAUSED  │
                                                                          └──────────┘
```

- `IDLE`: Sticky player is collapsed or awaiting user input.
- `BUFFERING`: Zero-disk stream pipe is opened, prewarming audio chunks.
- `PLAYING`: Audio is actively rendering through Web Audio DSP or native iOS element.
- `PAUSED`: Audio stream is suspended; position and buffer retained.

---

## 3. Session Authentication & Quota FSM

```text
       ┌────────────────────────┐
       │   UNAUTHENTICATED      │
       └───────────┬────────────┘
                   │
         ┌─────────┴─────────┐
         │ (Guest / Preview) │ (Credentials verified)
         ▼                   ▼
┌──────────────────┐  ┌──────────────────┐
│ GUEST (30m Cap)  │  │ USER / ADMIN     │
└────────┬─────────┘  └────────┬─────────┘
         │ 30m reached         │ Logout / Revoked
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│ GUEST_COOLDOWN   │  │ SESSION_REVOKED  │
└──────────────────┘  └──────────────────┘
```
