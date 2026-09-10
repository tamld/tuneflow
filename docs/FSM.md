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

- `QUEUED`: Task is pending execution in the FIFO queue.
- `DOWNLOADING`: `yt-dlp` child process is actively fetching the stream.
- `CONVERTING`: `ffmpeg` is encoding audio to 320kbps MP3 and attaching metadata.
- `COMPLETED`: Media file is written and ready for client delivery.
- `FAILED`: Task failed permanently after 3 retry attempts.

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
