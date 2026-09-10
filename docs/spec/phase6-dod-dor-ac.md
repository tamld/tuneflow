# Phase 6 Governance: Definition of Ready, Definition of Done & Acceptance Criteria

## 1. Definition of Ready (DoR)
- [x] ADR-0011 approved, evaluating Manifest V3 architecture and legal compliance boundaries.
- [x] SRS and FSM specifications finalized for content scripts and background service workers.
- [x] Legal disclaimer and fair use documentation established.

## 2. Definition of Done (DoD)
- [x] Directory `extension/` contains complete `manifest.json`, `content.js`, `background.js`, and `popup.html`.
- [x] Extension loads cleanly in Developer Mode on Chromium browsers without syntax errors or CSP warnings.
- [x] Injected action button "🎧 Download for Parents" appears adjacent to YouTube video controls.
- [x] Clicking action button dispatches `POST /api/queue/add` to `http://tuneflow.local:3000` with toast feedback.
- [x] Legal compliance documentation (`docs/LEGAL_COMPLIANCE.md`) finalized.

## 3. Acceptance Criteria (AC)
- **AC-601**: Browser extension loads without CSP violations or unhandled runtime exceptions.
- **AC-602**: Triggering download button displays immediate desktop / browser notification within 1 second.
- **AC-603**: `docs/LEGAL_COMPLIANCE.md` provides clear safe harbor terms and homelab personal fair-use parameters.
