# Deep Vertical Campaign Handoff — F1 UX QA & Visual QC Gate Lead (Round 3)

**Campaign Version**: TuneFlow `v2.5.0`  
**WriteReceipt**: `29436a70-f4ac-4d38-9e4c-a0e88c31e6b9`  
**Brief**: `brief-ef84ff5d-4f67-4ba8-bc89-7cecb74a4bd9`  
**Domain**: Single Focus Frame Invariant & Real-DOM Puppeteer UX QA Gate

---

## 1. F2 Telemetry & Pipeline Calls

All 3 subagent pipeline calls executed via `g8s llm-call` and recorded to session telemetry:

| Pipeline Step | Role | Model Requested | Model Resolved | Duration | Tokens (In / Out) | Trace ID |
|---|---|---|---|---|---|---|
| **F2-1 (D1)** | REA Researcher | `reasoning-free` | `nvidia/nemotron-3-ultra-550b-a55b` | 23.5s | 28,223 / 97 | `01a161e5-42dc-70de-be39-41c43197f07c` |
| **F2-2 (D2)** | Blind Skeptic | `reasoning-high` | `nvidia/nemotron-3-ultra-550b-a55b` | 5.9s | 4,078 / 195 | `01a161e5-b40f-71ff-b2d9-c7e766a5e4b1` |
| **F2-3 (D4)** | Acceptance Verifier | `reasoning-free` | `nvidia/nemotron-3-ultra-550b-a55b` | 86.1s | 3,712 / 292 | `01a161e9-739a-7094-b3c9-efa30c3ef694` |

---

## 2. Problem Root Cause, Review Findings & Mitigations

1. **Root Cause Analysis (Concentric Double Frame Bug)**:
   - On macOS desktop (`TuneFlow.app` >= 680px), `.search-input-group:focus-within` rendered an outer gold glowing frame (`border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-soft);`).
   - Concurrently, global `:focus-visible` slapped `outline: 3px solid var(--accent-gold) !important; outline-offset: 3px !important;` onto `#search-input` because browsers match `<input>` as `:focus-visible` on user focus. This produced two concentric glowing frames.

2. **Single Focus Frame Invariant Solution**:
   - Scoped standalone form elements (`input:focus-visible, textarea:focus-visible, select:focus-visible`) to use border-color + box-shadow glow instead of detached outline.
   - Enforced `border: none !important; box-shadow: none !important; outline: none !important; outline-offset: 0 !important;` on `.search-input-group .search-input:focus` and `:focus-visible` on desktop (`>= 680px`), delegating the single gold frame entirely to `.search-input-group:focus-within`.
   - Preserved universal `:focus-visible` outline for buttons, cards, and TV D-Pad navigation for WCAG AAA accessibility.

3. **F2 Review Audit Mitigations**:
   - Preserved mobile single border/shadow focus behavior (< 680px).
   - Mocked `/api/system/doctor` in `scripts/ci-ux-qa-gate.js` to eliminate CLI process contention and achieve sub-10ms diagnostic execution.
   - Added deep computed-style assertions (`outlineWidth === '0px'`, `borderTopWidth === '0px'`, `boxShadow === 'none'`) across all 5 themes.

---

## 3. Implemented Capabilities & Deliverables

### `public/css/silver-melody.css`
- Scoped `input:focus-visible, textarea:focus-visible, select:focus-visible` to `outline: none !important; border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-soft)`.
- Enforced `outline: none !important; outline-offset: 0 !important; border: none !important; box-shadow: none !important;` on `.search-input-group .search-input:focus-visible` and desktop search card inputs.

### `scripts/ci-ux-qa-gate.js`
- Automated Puppeteer Real-DOM User-Story & Visual QA/QC Gate exporting `runUxQaGate(options)` and CLI executable.
- Runs 6 automated checks at `1080x750` viewport:
  - `UX-QA-01`: Single Focus Frame on Desktop Search Bar (no double outline).
  - `UX-QA-02`: Single Focus Frame on Modal Inputs (`#server-endpoint-input`).
  - `UX-QA-03`: Desktop Search & Category Strip Geometry (zero horizontal overflow, zero clipped pills).
  - `UX-QA-04`: Queue Drawer & Elderly Summary User Story.
  - `UX-QA-05`: Settings & 1-Click System Doctor Live Telemetry.
  - `UX-QA-06`: Multi-Theme Focus Frame Invariant across 5 themes (`dark`, `cream`, `wood`, `jade`, `hc`).
- Includes deterministic fallback CSS verification when no browser binary is installed and guarantees clean process/browser teardown.

### `tests/deep_vertical_ux_qa_gate.test.js`
- Automated test suite validating `runUxQaGate()` computed-style metrics and verifying that synthetic double-frame CSS regressions are actively caught and rejected.

### Configuration & Ledger Updates
- `.github/workflows/ci.yml`: Added `Run UX & User-Story Visual QA Gate` step in `lint-and-test`.
- `.g8s/verifier-classes.yml`: Added `node scripts/ci-ux-qa-gate.js` under class `gates`.
- `docs/lessons/ledger.jsonl`: Appended ratified lesson `les-tf-003`.

---

## 4. Verification & Gate Evidence

```bash
$ node scripts/ci-ux-qa-gate.js
✅ [UX-QA-GATE] All checks passed successfully:
  ✔ UX-QA-01 (Single Focus Frame on Search Bar)
  ✔ UX-QA-02 (Single Focus Frame on Modal Inputs)
  ✔ UX-QA-03 (Desktop Search & Category Strip Geometry)
  ✔ UX-QA-04 (User Story: Queue Drawer & Elderly Summary)
  ✔ UX-QA-05 (User Story: Settings & 1-Click System Doctor)
  ✔ UX-QA-06 (Multi-Theme Focus Frame Invariant)

$ node --test tests/deep_vertical_ux_qa_gate.test.js tests/ui-layout-and-clipping.test.js tests/master-testing-matrix-gates.test.js
ℹ tests 26
ℹ suites 10
ℹ pass 26
ℹ fail 0
ℹ duration_ms 26169.46

$ bash tools/ci_spec_code_sync.sh && bash tools/ci_structure_sync.sh && bash tools/ci_link_integrity.sh
SPEC-CODE SYNC GATE: OK (0 grandfathered warning(s)).
STRUCTURE SYNC GATE: OK — polyglot structure verified.
LINK INTEGRITY GATE: OK (79 relative link(s) verified across 97 file(s); roots: README.md, docs).
```
