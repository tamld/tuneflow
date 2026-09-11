# Implementation Plan: SQLite Schema Migration Runner (Issue #105)

- **Goal**: Implement lightweight, zero-dependency schema migration engine using SQLite native `PRAGMA user_version` to support incremental database upgrades.
- **Architecture**:
  - `src/db/migrations.js`: Ordered array of migration objects `{ version: number, name: string, up: (db) => void }`.
  - `src/db/database.js`: Calls `applyMigrations(db)` inside `initDatabase()`.
- **Tech Stack**: Node.js 22 LTS, `node:sqlite` (DatabaseSync).

## Definition of Ready (DoR) Checklist
- [x] Spec & Issue #105 approved and tracked.
- [x] Baseline test suite passing (252 tests, 0 failures).
- [x] Topic branch `feat/sqlite-schema-migration-runner` created.
- [x] Zero placeholders or ambiguous requirements.

## Task Breakdown

### Task 1: Migration Engine Module (`src/db/migrations.js`)
- **Consumes**: `node:sqlite`.
- **Produces**: `getDatabaseVersion(db)`, `setDatabaseVersion(db, ver)`, `applyMigrations(db, targetVersion)`.
- **Migrations**:
  - v1: Initial tables (users, sessions, guest_limits, favorites).
  - v2: Performance indexes (`idx_sessions_expires_at`, `idx_favorites_user_video`).

### Task 2: Database Initialization Integration (`src/db/database.js`)
- **Consumes**: `src/db/migrations.js`, `src/db/database.js`.
- **Produces**: Refactored `initDatabase()` that runs `applyMigrations(db)`.

### Task 3: Automated TDD Verification (`tests/database-migrations.test.js`)
- **Consumes**: Migration engine.
- **Produces**: Unit & integration tests verifying clean init from v0 -> v2, stepwise upgrades, idempotency, and pre-existing DB handling.

### Task 4: Full DoD Gate & Merged PR
- **Consumes**: Entire test suite.
- **Produces**: 100% tests pass, ESLint 0 errors, PR created, merged to master.
