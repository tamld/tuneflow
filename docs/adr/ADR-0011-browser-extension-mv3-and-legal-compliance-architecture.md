# ADR-0011: Browser Extension Manifest V3, Commercialization Boundaries, and Legal Compliance

## Status
Accepted

## Context
Addressing three strategic requirements:
1. Feasibility of a Browser Extension allowing elderly users to trigger 1-click audio downloads directly while browsing YouTube.
2. Viability of commercial subscription models beyond personal homelab family use.
3. Copyright, terms of service, and intellectual property compliance.

## Architectural Decisions & Legal Boundaries

### 1. Browser Extension Architecture (Manifest V3)
- Target Chrome/Edge WebExtension Manifest V3.
- `content_scripts`: Injected into `*://*.youtube.com/*`, inserting an accessible action button: **"🎧 Download MP3 TuneFlow"** adjacent to standard video controls.
- `background service worker`: Captures active video ID and dispatches a POST request to the local TuneFlow server (`http://tuneflow.local:3000/api/queue/add` or reverse proxy endpoint).
- Client toast feedback provides confirmation that the download has queued and will land in local storage.

### 2. Legal Risk Assessment & Fair Use Boundaries
- **YouTube Terms of Service (ToS)**: Section 5.B prohibits downloading any content unless a specific download link is displayed by YouTube or written permission is granted by rights holders.
- **Commercialization Prohibitions**:
  - Monetizing direct audio ripping or distributing copyrighted third-party music commercially constitutes copyright infringement, triggering DMCA takedowns, merchant account freezes (Stripe/PayPal), and domain seizure.
- **Safe Harbor & Legitimate Models**:
  - **Private Homelab Family Use**: Strictly non-commercial, personal backup and accessibility enablement for elderly family members under private fair-use paradigms.
  - **Permissible Commercialization Patterns**:
    1. **FOSS Appliance / Turnkey Hardware**: Modeled after Home Assistant or TrueNAS. Offer open-source software freely while commercializing pre-configured plug-and-play Mini PC hardware for non-technical seniors.
    2. **BYO-Server Software Utilities**: License management tooling or browser extensions where end users configure their own self-hosted backends. The software author operates no infrastructure and stores no media assets.

## Consequences
- Establishes clear, legally compliant boundaries separating private homelab accessibility from commercial software distribution.
