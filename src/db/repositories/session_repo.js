const { encryptField, decryptField } = require('../../auth/crypto_utils');

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
    this.listActiveStmt = db.prepare(`
      SELECT s.token, s.user_id, s.role, s.expires_at, s.created_at, s.client_ip, s.user_agent,
             u.username, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > ? AND u.is_active = 1
      ORDER BY s.created_at DESC
    `);
    this.countActiveStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE expires_at > ?
    `);
    this.deleteRoleStmt = db.prepare('DELETE FROM sessions WHERE role = ?');
    this.deleteRoleExcludingStmt = db.prepare('DELETE FROM sessions WHERE role = ? AND token != ?');
    this.deleteUserSessionsStmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
    this.deleteUserSessionsExcludingStmt = db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?');
    this.deleteAllStmt = db.prepare('DELETE FROM sessions');
    this.deleteAllExcludingStmt = db.prepare('DELETE FROM sessions WHERE token != ?');
  }

  createSession({ token, userId, role, expiresAt, clientIp = null, userAgent = null }) {
    const createdAt = new Date().toISOString();
    const storedIp = clientIp ? encryptField(clientIp) : null;
    this.insertStmt.run(token, userId, role, expiresAt, createdAt, storedIp, userAgent);
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
    if (!row) return null;
    return {
      ...row,
      client_ip: decryptField(row.client_ip)
    };
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

  listActiveSessions() {
    const now = Date.now();
    const rows = this.listActiveStmt.all(now);
    return rows.map(r => ({
      ...r,
      client_ip: decryptField(r.client_ip)
    }));
  }

  countActiveSessions() {
    const now = Date.now();
    const row = this.countActiveStmt.get(now);
    return row ? row.count : 0;
  }

  deleteSessionsByRole(role, excludeToken = null) {
    if (excludeToken) {
      const result = this.deleteRoleExcludingStmt.run(role, excludeToken);
      return result.changes;
    }
    const result = this.deleteRoleStmt.run(role);
    return result.changes;
  }

  deleteSessionsByUser(userId, excludeToken = null) {
    if (excludeToken) {
      const result = this.deleteUserSessionsExcludingStmt.run(userId, excludeToken);
      return result.changes;
    }
    const result = this.deleteUserSessionsStmt.run(userId);
    return result.changes;
  }

  deleteAllSessions(excludeToken = null) {
    if (excludeToken) {
      const result = this.deleteAllExcludingStmt.run(excludeToken);
      return result.changes;
    }
    const result = this.deleteAllStmt.run();
    return result.changes;
  }
}

module.exports = {
  SessionRepo
};
