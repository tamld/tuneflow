# Implementation Plan: Automated Background Session Cleanup (Issue #103)

- **Goal**: Implement background periodic maintenance interval to prune expired sessions from SQLite, preventing unbounded database growth.
- **Architecture**:
  - `src/engine/maintenance.js`: Modular maintenance worker encapsulating periodic cleanup routines (session pruning, metrics logging).
  - `src/server.js`: Integrate maintenance startup and graceful shutdown teardown.
  - `src/db/repositories/session_repo.js`: Return pruned row count from `cleanupExpiredSessions()`.
- **Tech Stack**: Node.js 22 LTS, `node:sqlite` (WAL mode).

## Definition of Ready (DoR) Checklist
- [x] Spec & Issue #103 approved and tracked.
- [x] Baseline test suite passing (247 tests, 0 failures).
- [x] Topic branch `feat/session-cleanup-background-maintenance` created.
- [x] Zero placeholders or ambiguous requirements.

## Task Breakdown

### Task 1: Enhance Session Repository Return Value
- **Consumes**: `src/db/repositories/session_repo.js`.
- **Produces**: `cleanupExpiredSessions()` returns `{ changes: number }`.
- **Test**: Unit test in `tests/session-cleanup-maintenance.test.js`.

### Task 2: Build Maintenance Worker Engine
- **Consumes**: `src/db/repositories/session_repo.js`, `src/config.js`.
- **Produces**: `src/engine/maintenance.js` with `startMaintenance()`, `stopMaintenance()`, and `runSessionCleanup()`.
- **Test**: Integration test asserting timer execution and explicit invocation.

### Task 3: Hook into Server Lifecycle
- **Consumes**: `src/server.js`, `src/engine/maintenance.js`.
- **Produces**: Background timer initiated on server start and safely cleared on graceful shutdown.
- **Test**: Full server lifecycle tests.

### Task 4: Automated Verification & DoD Gate
- **Consumes**: Entire test suite.
- **Produces**: 100% tests pass, ESLint 0 errors, PR created, merged to master.
