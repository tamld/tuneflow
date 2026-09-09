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

  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    try {
      db.exec(schemaSql);
    } catch (_e) {}
  }

  return db;
}

module.exports = {
  initDatabase
};
