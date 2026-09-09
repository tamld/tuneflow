class UserRepo {
  constructor(db) {
    this.db = db;
    this.insertStmt = db.prepare(`
      INSERT INTO users (username, password_hash, salt, role, created_at, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);
    this.getByUsernameStmt = db.prepare('SELECT * FROM users WHERE username = ?');
    this.getByIdStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    this.listStmt = db.prepare('SELECT id, username, role, created_at, is_active FROM users ORDER BY id ASC');
    this.deleteStmt = db.prepare('DELETE FROM users WHERE id = ?');
    this.updatePasswordStmt = db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?');
    this.updateRoleStmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
    this.countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  }

  createUser({ username, passwordHash, salt, role = 'user' }) {
    const createdAt = new Date().toISOString();
    const result = this.insertStmt.run(username, passwordHash, salt, role, createdAt);
    return {
      id: Number(result.lastInsertRowid),
      username,
      role,
      created_at: createdAt
    };
  }

  getUserByUsername(username) {
    const row = this.getByUsernameStmt.get(username);
    return row || null;
  }

  getUserById(id) {
    const row = this.getByIdStmt.get(id);
    return row || null;
  }

  listUsers() {
    return this.listStmt.all();
  }

  deleteUser(id) {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }

  updatePassword(id, passwordHash, salt) {
    const result = this.updatePasswordStmt.run(passwordHash, salt, id);
    return result.changes > 0;
  }

  updateRole(id, role) {
    const result = this.updateRoleStmt.run(role, id);
    return result.changes > 0;
  }

  countUsers() {
    const row = this.countStmt.get();
    return row ? row.count : 0;
  }
}

module.exports = {
  UserRepo
};
