# Engineering Specification: SPEC-0009
## iOS PWA Background Playback, Canvas PiP & Unified 3-Stage Remote Release Pipeline

> **Document ID**: `SPEC-0009`  
> **Target Release**: `v2.4.2`  
> **Associated Issues**: `#87`, `#88`, `#90`  
> **Status**: IMPLEMENTED & VERIFIED  

---

## 1. Problem Statement & Objectives

### 1.1 iOS WebKit Standalone Layout Collision & Audio Suspension (#87, #88)
1. **Layout Fracture**: On iOS devices with Dynamic Island or notch hardware, content collided with physical screen boundaries when rendered in `standalone` display mode.
2. **Background Audio Termination**: Routing audio through Web Audio API (`AudioContext`) causes immediate playback termination on iOS when switching apps or locking the screen.
3. **Audio-Only PiP Infeasibility**: iOS WebKit strictly blocks native Picture-in-Picture on `<audio>` elements.

### 1.2 CI/CD Fragmentation & Pseudo-APK Debt (#90)
1. Simultaneous triggers on tag push across `release.yml` and `android.yml` caused race conditions on `softprops/action-gh-release@v2`.
2. Renaming a raw zip archive of web files to `.apk` resulted in invalid packages that failed installation (`INSTALL_PARSE_FAILED_NOT_APK`).

---

## 2. Technical Architecture & Implementation

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TUNEFLOW v2.4.2 CLIENT                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
┌───▼───────────────────────────┐       ┌───────────────────────────▼───┐
│ iOS Web Audio Bypass          │       │ Dynamic Canvas Stream PiP     │
│ - Direct HTML5 <audio>        │       │ - 512x512 Canvas (Artwork)    │
│ - Retains mediaserverd stream │       │ - canvas.captureStream(10)    │
│ - MediaSession action hooks   │       │ - Bound to hidden <video>     │
└───┬───────────────────────────┘       └───────────────────────────┬───┘
    │                                                               │
    └───────────────────────────────┬───────────────────────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │ Safe-Area Layout System │
                       │ env(safe-area-inset-*)  │
                       │ 2-Tier CSS Grid Player  │
                       └─────────────────────────┘
```

### 2.1 iOS Background Audio Engine
- Bypasses `createMediaElementSource(audio)` when client is identified as iOS (`/iPad|iPhone|iPod/.test(navigator.userAgent)`).
- Feeds audio stream directly to the hardware-backed `<audio>` element to ensure persistent background playback via `mediaserverd`.
- Implements comprehensive `navigator.mediaSession` handlers (`play`, `pause`, `previoustrack`, `nexttrack`, `seekto`).

### 2.2 Dynamic Canvas Stream Picture-in-Picture
- Renders track artwork, title, artist, and visualizer waveforms to an offscreen `<canvas id="player-pip-canvas" width="512" height="512">`.
- Captures stream via `canvas.captureStream(10)` and assigns it to `<video id="player-pip-video" playsinline muted>`.
- Invokes `video.requestPictureInPicture()` to display a floating window on iOS, macOS, and desktop.

### 2.3 Unified Remote 3-Stage Release Pipeline (`release.yml`)
- Stage 0: `test-gate` (ESLint, npm audit, 218 test cases).
- Stage 1: `container-image` (Multi-Arch `linux/amd64`, `linux/arm64` push to GHCR).
- Stage 2: `apk-build` (Genuine Gradle build for Mobile & TV flavors, signing, SHA-256 generation).
- Stage 3: `github-release` (Depends on stages 1 & 2; single atomic release).
- Permanently deletes `.github/workflows/android.yml`.
