# TuneFlow Engineering Constitution

> **Status**: Active SSoT Governance Axioms  
> **Authority**: Binding across all contributors, maintainers, and autonomous AI agents.  
> **Related Documents**: [Operational Rules (RULES.md)](RULES.md) | [Directive Clocks Ledger (directives.md)](directives.md) | [Definition of Done (DoD.md)](DoD.md) | [Definition of Ready (DoR.md)](DoR.md) | [Claims Registry (claims.yml)](claims.yml)

---

## Preamble

TuneFlow is an open-source, filial technology media platform engineered to help families share and preserve music for parents and elderly relatives. To maintain impeccable reliability, accessibility, and architectural honesty, all engineering activities and codebase modifications must strictly uphold these six foundational axioms.

---

## Core Axioms

### Axiom 1: Senior-First UX (SilverMelody)
1. **Touch Targets**: All interactive elements (buttons, cards, player controls) must meet or exceed $\ge 56\text{px}$ touch and click boundaries.
2. **Visual Contrast**: Typography and interface elements must satisfy WCAG 2.2 AAA contrast standards ($\ge 7:1$ contrast ratio).
3. **Ergonomic Palettes**: Support high-legibility palettes including Warm Cream Day Mode and Deep Night OLED Mode.
4. **Cognitive Calm**: Eliminate intimidating technical stack traces or English terminal jargon in user-facing views; provide warm, empathetic status banners and 1-click fallback to the offline downloaded library.

### Axiom 2: Family Selfhost-First
1. **Local Data Sovereignty**: All metadata, favorites, playlists, and audio binaries reside locally on the host filesystem and embedded SQLite database.
2. **Zero Telemetry & SaaS Freedom**: Zero third-party trackers, external advertising scripts, or cloud lock-in dependencies.
3. **Homelab & Appliance Readiness**: Turnkey container specs (Docker, Podman, CasaOS, Unraid) and lightweight native desktop binaries operating without internet dependence for local library access.
4. **Physical Bridge Support**: Direct support for physical hardware media (FAT32 USB drives, SD cards with 3-digit track indexing and macOS shadow file purging) for offline FM radios and car audio systems.

### Axiom 3: TDD & No-Skipped-Tests
1. **Test-First Discipline**: Features, security mitigations, and bug fixes must follow Red-Green-Refactor practices with corresponding automated test suites.
2. **Native Test Execution**: All unit, integration, and security suites execute using the native Node.js Test Runner (`node --test`).
3. **No Skipped Tests**: The entire test matrix must pass 100% green. Bypassing, disabling, or silently skipping tests without an explicit architectural deprecation record is strictly prohibited.

### Axiom 4: Client-Server `/api` Contract
1. **Decoupled Architecture**: Frontends (Web UI, iOS PWA, Android TV Leanback, Native Desktop GUI Shells) interact with the core engine strictly through versioned `/api` REST endpoints and Server-Sent Events (SSE).
2. **Deterministic Schemas**: All API responses must adhere to strict JSON response envelopes with predictable HTTP status codes.
3. **Process Isolation**: External CLI execution (`yt-dlp`, `ffmpeg`) must use isolated argument arrays with explicit `--` parameter delimiters to completely eliminate command and argument injection vectors.

### Axiom 5: Zero-Trust Agent Operations via g8s receipts
1. **Receipt-Bounded Execution**: AI agents operate under zero-trust constraints, requiring explicit, cryptographically verifiable task receipts and worktree boundaries.
2. **Strict Scope Containment**: Agents must never touch files outside the assigned receipt scope, contaminate the working tree with untracked build artifacts, or commit unverified changes.
3. **Durable SSoT Synchronization**: All verified changes must synchronize to durable ZFS storage (`ct122`) to guarantee data survivability across container lifecycles.

### Axiom 6: Honest Documentation enforced by CI gates
1. **Truth-Baseline Alignment**: Documentation must reflect actual code reality. Master branch code milestones must never be claimed as published releases until officially cut and tagged on GitHub Releases (`gh release list`).
2. **Automated Gate Enforcement**: Documentation accuracy, spec-to-code traceability, and link integrity are continuously validated by automated CI scripts:
   - `tools/ci_link_integrity.sh`
   - `tools/ci_spec_code_sync.sh`
   - `tools/claims_check.sh`
3. **Machine-Verifiable Claims**: Every key architectural claim must map to concrete implementation files and passing test suites in [docs/claims.yml](claims.yml).
