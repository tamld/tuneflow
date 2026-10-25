# Detailed Acceptance Criteria (AC)
## Project: TuneFlow

Every feature is standardized with concrete behavioral scenarios in BDD format (Given - When - Then):

---

### AC-01: YouTube Search & 1-Touch Genre Discovery (US-01)
- **Happy Path Scenario**:
  - *Given*: The user is on the TuneFlow home screen.
  - *When*: The user clicks the "Bolero" discovery chip.
  - *Then*: The search input is populated, loading state indicates active retrieval, and a list of 10–12 cards renders with album art, artist, and duration in $\le 3\text{ seconds}$.
- **Edge Case Scenario (Vietnamese Accents & Special Characters)**:
  - *Given*: The user inputs a query with accents and punctuation: `"Trịnh Công Sơn #1 (Tuyển Chọn)"`.
  - *When*: The user clicks "Search".
  - *Then*: The URL query is safely encoded, `yt-dlp` extracts results correctly, and no malformed character errors occur.
- **Worst Case Scenario (Empty or Whitespace Query)**:
  - *Given*: The search input is empty.
  - *When*: The user clicks "Search".
  - *Then*: No redundant network request is fired; a gentle prompt advises the user to enter a title or pick a category.

---

### AC-02: Zero-Disk In-App Streaming Preview (US-02)
- **Happy Path Scenario**:
  - *Given*: Search results are displayed.
  - *When*: The user clicks "▶ Preview" on a track card.
  - *Then*: The sticky bottom player opens, the active card is highlighted with a gold border, and audio playback starts in $\le 1.5\text{ seconds}$.
- **Edge Case Scenario (Rapid Track Switching)**:
  - *Given*: A track is actively streaming.
  - *When*: The user clicks "Preview" on a different track in rapid succession.
  - *Then*: The prior audio stream terminates immediately, previous buffers are released, and the new track plays without overlapping audio.
- **Worst Case Scenario (Restricted Video)**:
  - *Given*: A YouTube video is region-restricted or copyright-blocked.
  - *When*: The user clicks preview.
  - *Then*: The player displays an informative notification indicating the track is unavailable and suggests picking another song.

---

### AC-03: Web Audio DSP Equalizer & Volume Boost (US-05)
- **Happy Path Scenario**:
  - *Given*: Audio is playing.
  - *When*: The user toggles the DSP preset to "Vocal Clarity".
  - *Then*: The mid-frequency band boosts by +3dB while low-end frequencies roll off, enhancing vocal articulation.
- **Edge Case Scenario (Volume Boost at 150%)**:
  - *Given*: An elderly user enables "150% Volume Boost" on quiet recordings.
  - *When*: A loud musical passage occurs.
  - *Then*: The Web Audio `DynamicsCompressorNode` compresses peaks dynamically, preventing acoustic distortion and clipping.

---

### AC-04: iOS PWA Background Audio & Picture-in-Picture (US-06, US-07)
- **Happy Path Scenario**:
  - *Given*: TuneFlow is running as an installed PWA on iOS 18 (Safari Standalone mode).
  - *When*: Audio is streaming and the user locks the iPhone screen.
  - *Then*: Playback continues uninterrupted via native hardware media services, and lock screen media controls update in real time.
- **PiP Scenario**:
  - *Given*: A song is actively playing.
  - *When*: The user taps the PiP (`📺`) button.
  - *Then*: A floating Picture-in-Picture window renders the active track artwork, title, and animated visualizer waveform.

---

### AC-05: Android TV D-Pad Spatial Navigation (US-08)
- **Happy Path Scenario**:
  - *Given*: TuneFlow is open on Android TV in Leanback mode.
  - *When*: The user presses `Arrow Down` or `Arrow Right` on the TV remote.
  - *Then*: Focus smoothly transitions to adjacent elements with a high-contrast focus ring, and pressing `OK` immediately plays the selected song.

---

### AC-06: Real-Time Download Queue & Library Counter Synchronization (US-13)
- **Happy Path Scenario (Single & Multi-Song Queueing after i18n Initialization)**:
  - *Given*: TuneFlow has initialized `TuneFlowI18n.setLanguage('vi')` (or switched between `'vi'` and `'en'`).
  - *When*: The user queues 2 songs for MP3 download.
  - *Then*: `#queue-badge-count` (`Hàng Đợi (N)`) immediately increments to `2` while tasks are in `queued`/`downloading`/`converting`, `#drawer-count` (`Hàng Đợi Tải Nhạc (M)`) shows `2`, and as each song reaches `completed`, `#queue-badge-count` decrements to `1` then `0` while `#downloaded-count` (`Nhạc Đã Tải (K)`) increments accordingly.
- **Edge Case Scenario (Language Switch Mid-Download)**:
  - *Given*: 1 song is actively downloading (`#queue-badge-count` is `1`).
  - *When*: The user clicks the language toggle (`VI <-> EN`) and SSE emits the next progress update.
  - *Then*: `#queue-badge-count`, `#drawer-count`, and `#fav-count` remain attached to the live DOM and continue updating in real time without freezing at `0`.

---

### AC-07: Windows MP3 Download & Transcode Completion Without `>83%` Stall (US-14)
- **Happy Path Scenario (End-to-End `0% -> 85% -> 99% -> 100%` MP3 Pipeline)**:
  - *Given*: TuneFlow is running on Windows (or POSIX) with `yt-dlp` and `ffmpeg` sidecars (and without `ffprobe`).
  - *When*: A user downloads a track to MP3 (`format: 'mp3'`).
  - *Then*:
    1. `yt-dlp` fetches raw audio (`-f 140/251/bestaudio/best`, no `-x`) and updates progress monotonically from `5%` through `83%..85%` even when `[download] 98.2%` and `[download] 100%` arrive in the same `stdout` chunk.
    2. Task transitions to `converting` (`86%..99%`) as `ffmpeg -nostdin` transcodes the raw file to 320kbps MP3 (`libmp3lame`, `44100Hz`) with ID3 title/artist tags.
    3. Raw temp file is deleted, SHA-256 checksum is recorded, and task reaches `completed` (`100%`) with a valid MP3 file in `downloads/`.
- **Worst Case Scenario (`yt-dlp` or `ffmpeg` Non-Zero Exit)**:
  - *Given*: `yt-dlp` or `ffmpeg` exits with a non-zero code during download/transcode.
  - *Then*: `stderr` diagnostic details are captured, partial temp/output files are cleaned up, the task retries up to `3` times with visible `queued` retry status (`⏳ Đang thử tải lại (lần k/3)...`), and after 3 failures transitions to `failed` with a `🔄 Tải Lại` button.

---

### AC-08: Song Card & Drawer Status Badge Completeness (US-15)
- **Happy Path Scenario**:
  - *Given*: A song card is visible in `#results-grid` and queued for download.
  - *When*: The task transitions through `queued -> downloading -> converting -> completed`.
  - *Then*: `.song-status-badge` displays distinct Vietnamese status messages for every state (`⏳ Đang nằm trong hàng đợi tải...`, `📥 Đang tải về... (X%)`, `⚙️ Đang ghép âm thanh MP3 320kbps... (Y%)`, `✅ Đã xong! File đang lưu vào máy tính Bố Mẹ.`) and `.btn-download` updates to `✓ Đã Tải`.
- **Error Scenario (HTTP 400/401/403 on Queue Add)**:
  - *Given*: A request to `POST /api/queue/add` is rejected by the server.
  - *Then*: `.song-status-badge` updates to an explicit warning (`⚠️ ...`) and an error toast is shown instead of leaving the card stuck at `⏳ Đang đưa vào danh sách tải...`.

---

### AC-09: Windows Sidecar Bundling & Resolution Resilience (US-14)
- **Happy Path Scenario**:
  - *Given*: `scripts/bundle-sidecars.js` or `scripts/sync_local_install.ps1` is executed.
  - *Then*: Both `yt-dlp` and `ffmpeg` sidecars are bundled and hashed into `SHA256SUMS.json` by default, and `resolveSidecarBinary()` resolves `bin/` relative to both `process.cwd()` and `ROOT_DIR` with Windows Scoop/WinGet/Chocolatey fallbacks.
