class SessionRepo {
  constructor(db) {
    this.db = db;
    this.insertStmt = db.prepare(`
      INSERT INTO sessions (token, user_id, role, expires_at, created_at, client_ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this.getStmt = db.prepare(`
      SELECT s.*, u.username, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ? AND s.expires_at > ? AND u.is_active = 1
    `);
    this.deleteStmt = db.prepare('DELETE FROM sessions WHERE token = ?');
    this.cleanupStmt = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
  }

  createSession({ token, userId, role, expiresAt, clientIp = null, userAgent = null }) {
    const createdAt = new Date().toISOString();
    this.insertStmt.run(token, userId, role, expiresAt, createdAt, clientIp, userAgent);
    return {
      token,
      userId,
      role,
      expiresAt,
      createdAt
    };
  }

  getSession(token) {
    const now = Date.now();
    const row = this.getStmt.get(token, now);
    return row || null;
  }

  deleteSession(token) {
    const result = this.deleteStmt.run(token);
    return result.changes > 0;
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    const result = this.cleanupStmt.run(now);
    return result.changes;
  }
}

module.exports = {
  SessionRepo
};
