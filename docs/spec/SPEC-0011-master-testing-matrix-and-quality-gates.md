# 📐 SPEC-0011: MASTER TESTING ARCHITECTURE, 7-DIMENSIONAL QUALITY GATES & ANTI-THEATER SPECIFICATION

> **Document Code:** SPEC-0011  
> **Project Name:** TuneFlow (Elder-Friendly YouTube to Audio & Streamer)  
> **Status:** ✅ Approved by IT Administrator (anh Tâm)  
> **Traceability:** RM-01 through RM-30, ADR-0013, ADR-0014, Superpowers 8 Mandatory Steps  
> **Target Release:** v2.5.0+

---

## 📌 1. EXECUTIVE SUMMARY & PROBLEM STATEMENT

### 1.1 The Testing Deficit: "Test Theater" vs High-Signal Verification
In earlier development iterations, test suites suffered from five distinct "test theater" patterns:
1. **Source Text Matching (`fs.readFileSync().includes(...)`)**: Asserting that a variable or string exists in source code instead of executing its runtime behavior.
2. **Existence Bias (`assert.ok(fs.existsSync(...))`)**: Asserting file presence while ignoring file content validity, syntax errors, or execution capabilities.
3. **Live Upstream Network Coupling**: Calling live YouTube endpoints or spawning external network updaters (`yt-dlp -U`) inside automated test suites, triggering HTTP 429 rate limits, network hangs, and CI flakiness.
4. **Tautological Mocks**: Mocking an entire subsystem to return `{ success: true }` and merely asserting that the mock was invoked, failing to verify core domain invariants.
5. **Resource Leak Deadlocks**: Leaving background HTTP servers, database file locks (WAL mode), or child processes unclosed, causing test runners to hang indefinitely.

### 1.2 Core Mandate
SPEC-0011 mandates a **Zero-Theater, Hermetic, High-Signal Testing Architecture** across all components of TuneFlow. Every test must verify real behavioral contracts, inject adversarial faults, guarantee clean resource teardown, and operate offline deterministically in under 10 seconds.

---

## 🗺️ 2. THE 7-DIMENSIONAL TESTING MATRIX

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               7-DIMENSIONAL TESTING MATRIX                             │
├────────────┬───────────────────────────────────────────┬───────────────────────────────┤
│ Dimension  │ Scope & Quality Invariants                │ Primary Target Test Suites    │
├────────────┼───────────────────────────────────────────┼───────────────────────────────┤
│ D1: UX     │ Touch targets ≥56px/48px, WCAG AAA ≥7:1,  │ tests/e2e.test.js             │
│            │ Dynamic font scaler (80%-150%) no-overflow│ tests/puppeteer-e2e.test.js   │
│            │ Boost capsule pill geometry stability    │ tests/font-scaler-*.test.js   │
├────────────┼───────────────────────────────────────────┼───────────────────────────────┤
│ D2: FLOW   │ End-to-end multi-filter search, selective │ tests/playlist-playback.test  │
│            │ continuous playlist playback, Web Audio   │ tests/webaudio-eq.test.js     │
│            │ DSP 5-band EQ, 2x Sleep Timer fade-out 30s│ tests/queue-concurrency-*.test│
├────────────┼───────────────────────────────────────────┼───────────────────────────────┤
│ D3: OPS    │ Dual-mode storage (.portable vs OS path), │ tests/portable-binary-*.test  │
│            │ Port conflict auto-increment (3000->3001),│ tests/database-migrations.test│
│            │ PRAGMA user_version schema migration,     │ tests/session-cleanup-*.test  │
│            │ Background session & orphan .part cleanup │ tests/i18n-*.test.js          │
├────────────┼───────────────────────────────────────────┼───────────────────────────────┤
│ D4: CHAOS  │ Upstream YouTube 429/403/Captcha fallback,│ tests/innertube-fallback.test │
│            │ Stream pipe SSRF IP blacklist rejection,  │ tests/stream-security.test.js │
│            │ Audio MIME enforcement (HTTP 415),        │ tests/stream-edge-cases.test  │
│            │ Truncated streams & network disconnects   │ tests/rate-limiter-*.test.js  │
├────────────┼───────────────────────────────────────────┼───────────────────────────────┤
│ D5: SEC    │ 3-tier RBAC (admin, user, guest),         │ tests/domain-permissions-*.js │
│            │ Guest 30m limit & 60m cooldown anti-bypass│ tests/auth-*.test.js          │
│            │ Admin active session revocation & kickout,│ tests/admin-session-*.test.js │
│            │ AES-256-GCM data encryption at rest in DB,│ tests/security-passwords-*.js │
│            │ CAS SHA-256 fail-closed & Ed25519 updates │ tests/portable-binary-*.test  │
├────────────┼───────────────────────────────────────────┼───────────────────────────────┤
│ D6: VIEW   │ Modal focus trap & Escape key dismissal,  │ tests/modal-and-player-*.test │
│            │ Multi-viewport matrix (Desktop/Pad/Phone),│ tests/ios-pwa-responsive.test │
│            │ Anti-hotlink referrerpolicy="no-referrer",│ tests/screenshots-assets.test │
│            │ 7-layer multi-resolution favicon.ico      │ tests/desktop-packaging.test  │
├────────────┼───────────────────────────────────────────┼───────────────────────────────┤
│ D7: PKG    │ Inno Setup 6 Zero-Admin user-level wizard,│ tests/desktop-packaging.test  │
│            │ Linux FreeDesktop standard tuneflow.desktop,│ tests/release-integrity.test│
│            │ Tri-artifact GHA build (Docker, APK, EXE) │ tests/ci-cd-unified-*.test.js │
└────────────┴───────────────────────────────────────────┴───────────────────────────────┘
```

---

## 🛡️ 3. ANTI-THEATER EXECUTION STANDARDS

1. **Hermetic Boundary Principle**:
   - Automated unit and integration test suites must NEVER perform live external HTTP calls to `youtube.com` or `github.com`.
   - All network responses must be served via recorded fixtures or in-memory stub contracts.
2. **Behavioral Assertion Rule**:
   - Never assert `fs.readFileSync(file).includes('varName')`.
   - Assert against live runtime objects: functions must be invoked with valid/invalid arguments, and returned structures or state changes must be asserted.
3. **Deterministic Teardown Rule**:
   - Any test that starts an HTTP server must listen on port 0 (`server.listen(0, '127.0.0.1')`) to avoid `EADDRINUSE`.
   - All servers, database connections, and spawned child processes must be terminated in an `after()` or `finally` block.
4. **Fault-Injection Mandatory**:
   - Every feature must be accompanied by at least one negative test verifying that invalid inputs, malformed packets, or simulated errors are handled gracefully without process crash.

---

## ⚖️ 4. DEFINITION OF READY (DoR) & DEFINITION OF DONE (DoD)

### 4.1 Definition of Ready (DoR)
- [x] Specification approved by project maintainer (anh Tâm).
- [x] Traceability mapped to RM-01 through RM-30.
- [x] Identified all existing flaky/hanging test roots (`tests/system-ops.test.js`, `tests/search-playlist-sort.test.js`).

### 4.2 Definition of Done (DoD)
- [x] Refactor hanging test cases in `tests/system-ops.test.js` and `tests/search-playlist-sort.test.js` into hermetic, non-hanging implementations.
- [x] Implement `tests/master-testing-matrix-gates.test.js` exercising all 7 dimensions.
- [x] Full test suite executes cleanly under 10s with zero hangs.
- [x] Bump version to `v2.5.0` across package.json, changelog, and roadmap.
- [x] Synchronize git commits to dual remotes (`origin` and `ct122`) with zero leakage of private infrastructure.
