# TuneFlow OpenSpec Conventions & Verification Pin Specification

## 1. Overview & Core Philosophy

TuneFlow adheres to the **OpenSpec Spec Kit Framework** for living architectural specifications and design documents. OpenSpec establishes a bi-directional contract between human-readable requirements (PRD, SRS, FSM, Acceptance Criteria) and automated test suites.

Design specifications are stored under `docs/spec/` and are actively verified against the test harness (`tests/`) using automated pre-commit and CI gates (`tools/ci_spec_code_sync.sh`).

---

## 2. Document Status Lifecycle

Every OpenSpec specification or delta document declares an authoritative status near the top of the file:

```markdown
**Status**: `ACCEPTED`
```

Allowed document lifecycle statuses include:
- **`PROPOSED`**: Draft or RFC specification under active review. Scenarios in proposed specifications are grandfathered during CI checks and do not block code synchronization gates.
- **`ACCEPTED`**: Approved architectural blueprint. All acceptance scenarios must be pinned to concrete, executable test suites.
- **`APPLIED`**: Implemented and ratified in production codebase. Strictest verification gate enforcement applies.
- **`SUPERSEDED` / `REJECTED`**: Archived or rejected architectural proposals.

---

## 3. Scenario Verification Pins (`<!-- tests: ... -->`)

To prevent specification drift and ensure that every business and technical requirement is verified by automated code, all acceptance criteria are organized into scenarios.

### 3.1 Syntax Convention

Each testable scenario must be declared using a Level 4 Markdown heading:

```markdown
#### Scenario: <Descriptive Scenario Name>
<!-- tests: <test-file-or-function> -->
```

Multiple tests can be referenced via comma separation:
```markdown
#### Scenario: Authentication and Session Invalidation
<!-- tests: auth-api-endpoints.test.js, auth-middleware.test.js -->
```

If a requirement is verified through a formal process or manual operational procedure rather than an automated unit test, the `process-enforced` escape hatch is permitted:
```markdown
#### Scenario: Hardware Deployment Regulatory Compliance
<!-- tests: process-enforced -->
```

### 3.2 Target Test Mapping

In TuneFlow's Node.js test harness:
1. Target test references map to test files located in `tests/` (e.g., `tests/engine.test.js`, `tests/api.test.js`, `tests/tauri-architecture-matrix.test.js`).
2. Verification runners (`tools/ci_spec_code_sync.sh`) locate the specified files under `--go-root` or `--go-root/tests/`.
3. If an enforced specification (`ACCEPTED` or `APPLIED`) declares an unpinned scenario or points to a non-existent test file, the G1 verification gate fails.

---

## 4. Automated Synchronization Gate

The G1 specification-to-code synchronization gate is executed via:

```bash
bash tools/ci_spec_code_sync.sh --spec-root docs/spec --go-root .
```

### Gate Rules:
1. **Status Discovery**: Parses `^\*\*Status\*\*:` at the top of each spec.
2. **Scenario Extraction**: Parses each `^#### Scenario: <Title>` block and its subsequent `<!-- tests: ... -->` pin.
3. **Existence Check**: Verifies that every referenced test file exists in `tests/` or source root.
4. **Zero Violations SLA**: The gate must exit 0 with 0 errors.
