# PRD — Phase 6: Browser Extension MV3, Commercialization & Legal Compliance

## 1. Product Goal
Extend family music access via a lightweight Browser Extension running directly on YouTube pages, enabling elderly users to send download jobs to their local TuneFlow server with a single click; alongside establishing a compliant legal architecture to safeguard against copyright and platform ToS liabilities.

## 2. Business & Legal Scope
- **User Experience**: Elderly parents often browse YouTube directly on desktop browsers. Requiring URL copy-pasting across browser tabs creates cognitive friction.
- **Commercialization & Copyright**:
  - *Compliance Safe Harbor*: The project does not sell or distribute media files. TuneFlow is designed as a personal self-hosted media manager (FOSS Appliance / Homelab Audio Box).
  - *Monetization Models*: Permissible models center on selling pre-configured turnkey plug-and-play Mini PC hardware or providing self-hosted utility licenses, avoiding commercial media distribution risks.

## 3. Core Features
- **Chrome / Edge Extension (Manifest V3)**:
  - Accessible action button: **"🎧 Download for Parents"** injected beneath YouTube media players.
  - Extension popup displaying real-time queue progress from the local server.
  - Zero-configuration LAN discovery (`http://tuneflow.local:3000`).
- **Legal Compliance Suite**:
  - Clear private fair-use disclaimer documentation.
  - Operational security and copyright compliance guidelines for self-hosters.
