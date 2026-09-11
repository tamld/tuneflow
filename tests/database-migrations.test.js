const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { DatabaseSync } = require('node:sqlite');
const { initDatabase } = require('../src/db/database');
const migrations = require('../src/db/migrations');

describe('Issue #105: SQLite Schema Migration Engine (PRAGMA user_version) Suite', () => {
  let db;
  let testDbPath;

  beforeEach(() => {
    testDbPath = path.join(os.tmpdir(), `tuneflow-migration-test-${Date.now()}-${Math.random().toString(36).substring(7)}.db`);
    db = new DatabaseSync(testDbPath);
  });

  afterEach(() => {
    try {
      db.close();
    } catch (_e) {}
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch (_e) {}
  });

  it('should verify initial empty database has user_version 0', () => {
    const version = migrations.getDatabaseVersion(db);
    assert.strictEqual(version, 0, 'New database must start with user_version 0');
  });

  it('should verify applyMigrations advances database from v0 to v2 atomically', () => {
    const applied = migrations.applyMigrations(db);
    assert.ok(applied >= 2, 'Must apply at least 2 migrations');

    const currentVersion = migrations.getDatabaseVersion(db);
    assert.strictEqual(currentVersion, migrations.LATEST_VERSION, `Database version must equal LATEST_VERSION (${migrations.LATEST_VERSION})`);

    // Verify tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
    assert.ok(tables.includes('users'), 'users table must exist');
    assert.ok(tables.includes('sessions'), 'sessions table must exist');
    assert.ok(tables.includes('guest_quotas'), 'guest_quotas table must exist');
    assert.ok(tables.includes('user_favorites'), 'user_favorites table must exist');

    // Verify v2 indexes exist
    const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(r => r.name);
    assert.ok(indexes.includes('idx_sessions_expires_at'), 'idx_sessions_expires_at index must exist');
    assert.ok(indexes.includes('idx_sessions_user_id'), 'idx_sessions_user_id index must exist');
    assert.ok(indexes.includes('idx_user_favorites_video'), 'idx_user_favorites_video index must exist');
  });

  it('should verify applyMigrations is idempotent on already migrated database', () => {
    // First run
    migrations.applyMigrations(db);
    const versionAfterFirst = migrations.getDatabaseVersion(db);

    // Second run
    const appliedSecond = migrations.applyMigrations(db);
    const versionAfterSecond = migrations.getDatabaseVersion(db);

    assert.strictEqual(appliedSecond, 0, 'Second run must apply 0 migrations');
    assert.strictEqual(versionAfterFirst, versionAfterSecond, 'Version must remain unchanged');
  });

  it('should verify stepwise incremental migration (v0 -> v1 -> v2)', () => {
    // Apply only up to v1
    const appliedV1 = migrations.applyMigrations(db, 1);
    assert.strictEqual(appliedV1, 1, 'Must apply exactly 1 migration for targetVersion 1');
    assert.strictEqual(migrations.getDatabaseVersion(db), 1, 'Database version must be 1');

    // Verify v1 tables exist, but v2 indexes do not yet exist
    let indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(r => r.name);
    assert.strictEqual(indexes.includes('idx_sessions_expires_at'), false, 'v2 index must not exist at v1');

    // Now upgrade to latest
    const appliedV2 = migrations.applyMigrations(db, 2);
    assert.strictEqual(appliedV2, 1, 'Must apply remaining 1 migration to reach v2');
    assert.strictEqual(migrations.getDatabaseVersion(db), 2, 'Database version must now be 2');

    indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(r => r.name);
    assert.ok(indexes.includes('idx_sessions_expires_at'), 'idx_sessions_expires_at index must now exist');
  });

  it('should verify initDatabase from database.js executes migrations and sets PRAGMA user_version', () => {
    const freshDbPath = path.join(os.tmpdir(), `tuneflow-initdb-${Date.now()}.db`);
    try {
      const liveDb = initDatabase(freshDbPath);
      const version = migrations.getDatabaseVersion(liveDb);
      assert.strictEqual(version, migrations.LATEST_VERSION, 'initDatabase must bring DB to LATEST_VERSION');

      const tables = liveDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
      assert.ok(tables.includes('users'), 'users table must exist');
      assert.ok(tables.includes('user_favorites'), 'user_favorites table must exist');

      liveDb.close();
    } finally {
      if (fs.existsSync(freshDbPath)) fs.unlinkSync(freshDbPath);
    }
  });
});
