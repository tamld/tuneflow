# ADR-0012: Android Phone and Android TV D-Pad Leanback Client Architecture

## Status
Accepted

## Context
TuneFlow is tailored for elderly users (parents aged 55–75+) in domestic environments. Beyond standard desktop browser sessions, the two primary usage patterns are:
1. **Mobile (Android Smartphone)**: Morning walks, gardening, or bedtime radio listening with the screen turned off.
2. **Living Room (Android TV / TV Box)**: Sitting on a sofa 3 meters away from the screen, operating exclusively with a TV remote (D-Pad: Up, Down, Left, Right, OK, Back) to select folk ballads, golden melodies, or meditation chants.

Deploying TuneFlow to Android requires an architecture that reuses 100% of the existing SilverMelody web core while natively supporting remote control navigation and background playback.

---

## Architectural Decisions

### 1. Packaging Platform (Capacitor Hybrid Architecture)
- Utilize **Capacitor (Android Platform)** to wrap static web assets (`public/`) into a native Android `.apk`.
- Share 100% of UI/UX styling, i18n localization (`public/js/i18n.js`), and playback logic (`public/js/player.js`) across Web, Mobile, and TV without duplicating codebases in Kotlin/Java.
- Declare dual hardware touch and Leanback flags in `AndroidManifest.xml`:
  ```xml
  <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
  <uses-feature android:name="android.software.leanback" android:required="false" />
  ```

### 2. Mobile Experience (Thumb-Zone Ergonomics & Background Audio)
- **Thumb-Zone Controls**:
  - Primary interactive targets (`▶️ Preview`, `⬇️ Download`, `❤️ Favorite`) maintain $\ge 56\text{px}$ minimum tap targets positioned in the lower half of the screen for effortless single-handed thumb reach.
- **Background Playback (Foreground Service)**:
  - Integrate Android `MediaSessionService` / Foreground Service paired with a persistent lock screen notification (`NotificationCompat`).
  - Guarantees continuous background playback when the device is locked or placed in a pocket, immune to OS battery saver throttling.
- **Offline Storage**:
  - Cache API and IndexedDB caching for local track retention outside home Wi-Fi coverage.

### 3. 10-Foot Android TV Experience (Leanback D-Pad Navigation)
- **100% Remote D-Pad Navigation**:
  - Intercept standard Android TV keycodes: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter` (DPAD_CENTER), `Escape`/`Backspace` (DPAD_BACK).
  - Manage spatial focus via a 2D matrix (Row/Column Grid).
- **Horizontal Leanback Carousels**:
  - **Row 1**: 🌸 **Mother's Feed** — Mindfulness chants, regional folk melodies, classical Vietnamese theater (Cai Luong), acoustic zither and bamboo flute.
  - **Row 2**: ☕ **Father's Feed** — Pre-war classics, curated golden era ballads, traditional opera, vintage acoustic guitar.
  - **Row 3**: ❤️ **Favorites & Active Downloads**.
- **High-Contrast Focus Ring (WCAG 2.2 AAA Focus State)**:
  - When a media card receives spatial focus, it scales to **$1.08\times$** accompanied by a 4px warm gold border (`--accent-gold`: `#f39c12`) and a 12px outer glow.
  - Ensures sharp readability from 3 meters across the living room sofa.
- **Ambient Player Mode**:
  - When playing, seamlessly transitions to an ambient display with enlarged album artwork, high-legibility artist text (36–42px), and calm audio waveform pulses.

### 4. Server Auto-Discovery (mDNS Zero-Conf)
- Eliminates manual IP address configuration.
- Automatically scans local LAN via mDNS (`tuneflow.local` or service `_tuneflow._tcp.local`) to pair with the homelab server.
- Displays an on-screen TV setup QR code for quick mobile scanning if multicast mDNS is blocked by residential network hardware.

---

## Consequences

### Positive
1. **Single Unified Codebase**: Reduces maintenance overhead by ~80% compared to maintaining separate native Android apps.
2. **Tailored Senior Usability**: Eliminates TV remote control friction for non-technical elderly family members.
3. **Resilient Background Audio**: Resolves audio cutoff when browser tabs or device screens close.

### Operational Considerations
1. **Budget TV Box Hardware**: Avoid expensive CSS backdrop blur filters; use hardware-accelerated GPU transforms (`translate3d`, `scale3d`) to sustain smooth 60fps rendering.
2. **APK Code Signing**: Configure automated CI release signing using a valid Android keystore to facilitate safe sideloading without Play Protect security warnings.
