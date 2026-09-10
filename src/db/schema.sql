-- TuneFlow Access Control & Authentication Schema

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
    created_at TEXT NOT NULL,
    is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    client_ip TEXT,
    user_agent TEXT
);

CREATE TABLE IF NOT EXISTS guest_quotas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_id TEXT UNIQUE NOT NULL,
    client_ip TEXT NOT NULL,
    fingerprint_hash TEXT NOT NULL,
    listen_duration_sec INTEGER DEFAULT 0,
    max_duration_sec INTEGER DEFAULT 1800,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'cooldown')),
    cooldown_until INTEGER DEFAULT 0,
    last_heartbeat_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    uploader TEXT,
    duration INTEGER DEFAULT 0,
    duration_string TEXT,
    thumbnail TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_guest_quotas_client_ip ON guest_quotas(client_ip);
CREATE INDEX IF NOT EXISTS idx_guest_quotas_fingerprint ON guest_quotas(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
