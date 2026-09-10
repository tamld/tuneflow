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
