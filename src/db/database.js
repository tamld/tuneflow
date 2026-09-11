const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

function initDatabase(dbPath = path.join(process.cwd(), 'data', 'tuneflow.db')) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);

  try {
    db.exec('PRAGMA busy_timeout = 5000;');
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
  } catch (_e) {}

  const { applyMigrations } = require('./migrations');
  applyMigrations(db);

  return db;
}

module.exports = {
  initDatabase
};
