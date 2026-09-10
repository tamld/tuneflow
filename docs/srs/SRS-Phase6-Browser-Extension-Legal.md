# SRS — Phase 6: Software Requirements Specification (Browser Extension & Legal)

## 1. Functional Requirements
- **FR-601 (Extension Manifest V3 Specifications)**:
  - `manifest.json`:
    - `manifest_version: 3`
    - `permissions`: `["activeTab", "storage", "notifications"]`
    - `host_permissions`: `["*://*.youtube.com/*", "http://tuneflow.local/*", "http://localhost:3000/*"]`
- **FR-602 (Content Script Button Injection)**:
  - Observes YouTube page navigation lifecycle events (`yt-navigate-finish`).
  - Injects action button `#tuneflow-quick-download-btn` within the action toolbar adjacent to `#owner` / `#subscribe-button`.
  - Button dimensions $\ge 44\text{px}$, warm teal background with high-contrast white text.
- **FR-603 (Background Service Worker Dispatch)**:
  - Handles button click, extracts active `videoId`, dispatches `POST http://tuneflow.local:3000/api/queue/add`.
  - Emits toast notification confirming server receipt and background queuing.

## 2. Non-Functional Requirements & Legal Boundaries
- **NFR-601 (Extension Initialization Overhead)**: Content script loads in $< 50\text{ms}$ with zero DOM lag during video browsing.
- **NFR-602 (Chrome Web Store Security Compliance)**: Zero malicious scripts, zero exfiltration of browsing history or authentication cookies.
- **NFR-603 (Copyright & Compliance Safe Harbor)**: Explicit legal notice in codebase and documentation: *TuneFlow is an open-source personal media backup utility intended strictly for personal fair use; commercial redistribution of protected audio content is strictly prohibited*.
