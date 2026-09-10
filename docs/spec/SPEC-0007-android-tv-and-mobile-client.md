# OpenSpec SPEC-0007: Android Mobile & Android TV D-Pad Leanback Client Specification

> **Specification Standard**: OpenSpec Spec Kit Framework  
> **Status**: APPROVED  
> **Authority**: TamLD (`github.com/tamld/tuneflow`)  
> **Target Audience**: Android Developers, QA Engineers, UX Reviewers  
> **Reference Issues**: [#17](https://github.com/tamld/tuneflow/issues/17), [#18](https://github.com/tamld/tuneflow/issues/18)  
> **Related Architecture**: [ADR-0012](../adr/ADR-0012-android-mobile-and-tv-leanback-architecture.md)

---

## 1. Scope & Objectives

Engineering specification for the standalone Android client APK, supporting two primary hardware targets:
1. **Android Smartphone (Mobile)**: Optimized for single-handed thumb-zone operation and persistent background audio playback via Android Foreground Service when the screen is locked.
2. **Android TV / Google TV / Android TV Box (10-Foot Experience)**: 100% operable via infrared/Bluetooth remote control using D-Pad navigation (Up, Down, Left, Right, OK, Back) from a 3-meter sofa distance.

---

## 2. Senior Usability Invariants (Elderly UX/UI Invariants)

| Criterion | Android Mobile Standard | Android TV Standard (10-Foot) |
| :--- | :--- | :--- |
| **Touch / Target Dimensions** | Minimum $56\text{px} \times 56\text{px}$ | Minimum card size $220\text{px} \times 140\text{px}$ |
| **Title Font Size** | $20\text{px} - 24\text{px}$ | $36\text{px} - 42\text{px}$ |
| **Body Font Size** | $16\text{px} - 18\text{px}$ | $24\text{px} - 28\text{px}$ |
| **Contrast Ratio (WCAG)** | WCAG 2.2 AAA ($\ge 7:1$) | WCAG 2.2 AAA ($\ge 7:1$) |
| **Spatial Focus State** | N/A (Touch) | Scale $1.08\times$, 4px warm gold border (`#f39c12`), 12px outer glow |
| **Sensory Feedback** | Subtle haptic vibration | Gentle auditory click on card navigation |
| **UI Tone & Labels** | Respectful, clear, bilingual (EN/VI) | Respectful, clear, bilingual (EN/VI) |

---

## 3. Android TV D-Pad Navigation Specification (Spatial Focus Engine)

### 3.1 Remote D-Pad Keycode Mapping
```
┌────────────────────────────────────────────────────────┐
│               REMOTE D-PAD KEYCODE MAPPING             │
├───────────────────┬──────────────┬─────────────────────┤
│ TV Remote Key     │ JavaScript   │ Action              │
├───────────────────┼──────────────┼─────────────────────┤
│ DPAD_UP           │ ArrowUp      │ Move up one row     │
│ DPAD_DOWN         │ ArrowDown    │ Move down one row   │
│ DPAD_LEFT         │ ArrowLeft    │ Previous card       │
│ DPAD_RIGHT        │ ArrowRight   │ Next card           │
│ DPAD_CENTER / OK  │ Enter        │ Preview / Select    │
│ DPAD_BACK         │ Escape / Back│ Return / Exit       │
│ MEDIA_PLAY_PAUSE  │ MediaPlayPause│ Play / Pause toggle│
└───────────────────┴──────────────┴─────────────────────┘
```

### 3.2 2D Focus Matrix Structure
The Android TV layout organizes media into 4 horizontal carousels with smooth infinite scroll:
1. **Row 0 (Header Action Bar)**:
   - `[🔍 Voice Search]`
   - `[🌸 Mother's Feed]`
   - `[☕ Father's Feed]`
   - `[❤️ Saved Favorites]`
   - `[🌐 Language]`
2. **Row 1 (Carousel 1: Mother's Feed)**:
   - Presets: Mindfulness Chanting, Regional Folk Ballads, Countryside Classics, Relaxing Instrumentals.
3. **Row 2 (Carousel 2: Father's Feed)**:
   - Presets: Pre-War Melodies, Golden Era Bolero, Traditional Folk Opera, Vintage Acoustic Guitar.
4. **Row 3 (Queue & Download History)**:
   - Currently playing track and downloaded tracks cache.

### 3.3 Boundary Rules
- When focused on the first card of a row and pressing `ArrowLeft`: Focus stays pinned with a subtle horizontal shake animation signaling row start.
- When focused on the last card and pressing `ArrowRight`: Loads additional tracks or stays bounded.
- When pressing `ArrowDown` from Row $N$: Focus descends to the nearest card on Row $N+1$ based on horizontal X coordinate proximity.
- All focus transitions must achieve $\le 16\text{ms}$ (60fps) latency using hardware-accelerated CSS `transform: scale3d(1.08, 1.08, 1)`.

---

## 4. Mobile Audio Background Playback (Foreground Service & MediaSession)

### 4.1 Process Lifecycle
1. When users tap `▶️ Preview`:
   - Application initiates `Android Audio ForegroundService`.
   - Registers `MediaSessionCompat` with Android Audio Subsystem.
   - Displays persistent lock screen ongoing notification (`NotificationCompat`):
     - Track title, artist / channel name.
     - High-resolution album artwork.
     - Large playback action controls: `[⏮️ Previous]`, `[⏯️ Play/Pause]`, `[⏭️ Next]`.
2. When the device screen is turned off:
   - Playback stream continues seamlessly over Wi-Fi / cellular.
   - Intercepts Bluetooth headset events (play/pause toggle buttons).
3. Sleep Timer:
   - When timer expires (15/30/45/60 minutes):
   - Fades out audio gradually over 15 seconds.
   - Halts playback and releases `ForegroundService` to preserve battery.

---

## 5. Zero-Configuration Network Discovery (mDNS Zero-Conf)

1. **Discovery Protocol**:
   - TuneFlow homelab server broadcasts mDNS service `_tuneflow._tcp.local` on port `3000`.
   - Android client listens for Zeroconf/mDNS packets upon startup over local Wi-Fi.
2. **Standard Connection**:
   - Automatically detects `tuneflow.local:3000` within $1.5\text{s}$.
   - Pairs immediately, syncing favorites and queue state with zero manual IP input.
3. **Multicast-Restricted Fallback**:
   - Displays friendly notice: *"Searching for domestic music server..."*.
   - Renders an on-screen pairing QR code on the TV for instant mobile camera setup.

---

## 6. Acceptance Criteria (AC)

- [x] **AC-1**: Android TV UI functions 100% via remote D-Pad, requiring zero mouse or touch interactions.
- [x] **AC-2**: Focused card displays 4px warm gold border with $1.08\times$ scale, legible from 3 meters away.
- [x] **AC-3**: Mobile audio continues uninterrupted when screen locks, verified with persistent lock screen notification.
- [x] **AC-4**: Server auto-discovers via local mDNS without manual IP configuration.
- [x] **AC-5**: UI labels and iconography adhere strictly to accessible, senior-friendly standards.
