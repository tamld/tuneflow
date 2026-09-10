# 🎶 TuneFlow Engineering Implementation Proposal for Autonomous Agents

> **Target Audience**: Autonomous Engineering & Implementation Agents  
> **Repository**: `https://github.com/tamld/tuneflow`  
> **Methodology**: Test-Driven Development (TDD), YAGNI, Atomic Commits, WCAG 2.2 AAA.  
> **Language Policy**: 100% English  

---

## 🧭 Project Architecture Overview & Objectives

TuneFlow is an elderly-friendly, self-hosted music streamer and downloader designed for homelab deployments. It prioritizes ultra-high contrast, large touch boundaries ($\ge 56\text{px}$), ad-free preview streaming, and direct HTTP client file delivery.

This document serves as the implementation guidance manual for autonomous coding agents, detailing architectural constraints, testing protocols, and the phased engineering roadmap.

---

## 📌 Part 1: Global Engineering Constraints

1. **Runtime & Language**: Node.js $\ge 20.0.0$ (Default: Node 22 LTS). Module system: CommonJS (`require`).
2. **Elderly UX Standards (SilverMelody)**:
   - Touch/Click target height: $\ge 56\text{px}$ for all primary buttons and cards.
   - Text contrast ratio: Conforms to WCAG 2.2 AAA ($\ge 7:1$ for body text, $\ge 4.5:1$ for large headings).
   - Zero raw technical error codes presented to users (no raw stack traces or HTTP 500 error modals).
3. **Container Environment**:
   - Alpine Linux multi-stage build, running under non-root `node:node` user.
   - Default memory ceiling: 256MB. All stream processing and queues must respect memory limits to avoid OOM termination.
4. **Testing Invariants (TDD)**:
   - All bug fixes and feature additions must begin with a failing test case before implementing functional code.
   - Test suites must verify real runtime behavior without modifying assertions or skipping tests.

---

## 🗺️ Part 2: Phased Engineering Execution Roadmap

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AUTONOMOUS AGENT ROADMAP MATRIX                                      │
├─────────────┬────────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ Phase       │ Version Target             │ Primary Engineering Focus   │ Core Deliverables             │
├─────────────┼────────────────────────────┼─────────────────────────────┼───────────────────────────────┤
│ Phase 1     │ v1.0.0                     │ Core Streamer & UI Baseline │ Node 22, yt-dlp, SilverMelody │
│ Phase 2     │ v1.1.1                     │ Container Engine & GHCR     │ Multi-Arch Alpine Container   │
│ Phase 3     │ v1.2.0                     │ Playlist Batch Queue        │ Bounded Queue, SHA-256 Check  │
│ Phase 4     │ v1.3.0                     │ Persona Curation            │ Zero-Login LocalStorage sync  │
│ Phase 5     │ v1.4.0                     │ Zero-Disk Streaming Pipe    │ Web Audio API, WASM Offloading│
│ Phase 6     │ v2.0.0                     │ Browser Extension MV3       │ Manifest V3, Legal Compliance │
│ Phase 7     │ v2.1.0                     │ Android TV Remote D-Pad     │ Spatial Navigation, Ambient UI│
│ Phase 8     │ v2.2.0                     │ Offline PWA & Voice Search  │ Service Worker, LAN QR pairing│
│ Phase 9     │ v2.3.0                     │ SQLite RBAC & Auth Policy   │ node:sqlite, Guest Cooldown   │
│ Phase 10    │ v2.4.0                     │ Active Sessions & AES-256   │ Session Revocation, Crypto DB │
│ Phase 11    │ v2.4.2                     │ iOS PWA & Unified CI/CD     │ Web Audio Bypass, Native APK  │
└─────────────┴────────────────────────────┴─────────────────────────────┴───────────────────────────────┘
```

---

## 📌 Part 3: Verification & Acceptance Gates

All pull requests must pass the following validation sequence before merging into `master`:
1. `npm run lint` — Zero ESLint errors or unused variable warnings.
2. `npm audit` — Zero High or Critical CVE vulnerabilities.
3. `npm test` — All 218 test cases pass with 0 failures and 0 skipped tests.
4. Remote GitHub Actions workflow compiles multi-arch container images and genuine signed Android packages atomically.
