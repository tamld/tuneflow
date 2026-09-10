class GuestRepo {
  constructor(db, defaultMaxSec = 1800, defaultCooldownSec = 3600) {
    this.db = db;
    this.defaultMaxSec = defaultMaxSec;
    this.defaultCooldownSec = defaultCooldownSec;

    this.getByIdStmt = db.prepare('SELECT * FROM guest_quotas WHERE guest_id = ?');
    this.getByIpFpStmt = db.prepare('SELECT * FROM guest_quotas WHERE client_ip = ? AND fingerprint_hash = ?');
    this.getByIpStmt = db.prepare('SELECT * FROM guest_quotas WHERE client_ip = ? ORDER BY id DESC LIMIT 1');
    this.insertStmt = db.prepare(`
      INSERT INTO guest_quotas (guest_id, client_ip, fingerprint_hash, listen_duration_sec, max_duration_sec, status, cooldown_until, last_heartbeat_at, created_at)
      VALUES (?, ?, ?, 0, ?, 'active', 0, ?, ?)
    `);
    this.updateProgressStmt = db.prepare(`
      UPDATE guest_quotas
      SET listen_duration_sec = ?, status = ?, cooldown_until = ?, last_heartbeat_at = ?
      WHERE guest_id = ?
    `);
    this.resetStmt = db.prepare(`
      UPDATE guest_quotas
      SET listen_duration_sec = 0, status = 'active', cooldown_until = 0, last_heartbeat_at = ?
      WHERE guest_id = ?
    `);
    this.resetIpStmt = db.prepare(`
      UPDATE guest_quotas
      SET listen_duration_sec = 0, status = 'active', cooldown_until = 0, last_heartbeat_at = ?
      WHERE client_ip = ?
    `);
    this.listActiveStmt = db.prepare('SELECT * FROM guest_quotas ORDER BY id DESC LIMIT 100');
    this.purgeAllStmt = db.prepare('DELETE FROM guest_quotas');
  }

  _formatGuest(row) {
    if (!row) return null;
    const now = Date.now();

    // Check if cooldown has naturally expired
    if (row.status === 'cooldown' && row.cooldown_until > 0 && now >= row.cooldown_until) {
      this.resetStmt.run(now, row.guest_id);
      row.status = 'active';
      row.listen_duration_sec = 0;
      row.cooldown_until = 0;
    }

    const remainingSec = Math.max(0, row.max_duration_sec - row.listen_duration_sec);
    const canListen = (row.status === 'active') && (remainingSec > 0);

    return {
      ...row,
      remaining_sec: remainingSec,
      can_listen: canListen
    };
  }

  getOrCreateGuest({ guestId, clientIp, fingerprintHash }) {
    const now = Date.now();

    // 1. Look up by guest_id if provided
    let row = guestId ? this.getByIdStmt.get(guestId) : null;

    // 2. If not found by ID, look up by IP + fingerprint
    if (!row && clientIp && fingerprintHash) {
      row = this.getByIpFpStmt.get(clientIp, fingerprintHash);
    }

    // 3. Fallback: if client IP is currently in active cooldown on another ID, prevent bypass
    if (!row && clientIp) {
      const ipRow = this.getByIpStmt.get(clientIp);
      if (ipRow && ipRow.status === 'cooldown' && ipRow.cooldown_until > now) {
        row = ipRow;
      }
    }

    if (row) {
      return this._formatGuest(row);
    }

    // 4. Create new guest
    const finalGuestId = guestId || `guest_${Math.random().toString(36).substring(2, 12)}`;
    const createdAt = new Date().toISOString();
    this.insertStmt.run(finalGuestId, clientIp || '127.0.0.1', fingerprintHash || 'default', this.defaultMaxSec, now, createdAt);

    const createdRow = this.getByIdStmt.get(finalGuestId);
    return this._formatGuest(createdRow);
  }

  recordListeningTime(guestId, addedSeconds) {
    const row = this.getByIdStmt.get(guestId);
    if (!row) return null;

    const formatted = this._formatGuest(row);
    const now = Date.now();

    if (formatted.status === 'cooldown') {
      return formatted;
    }

    let newDuration = formatted.listen_duration_sec + Math.max(0, addedSeconds);
    let newStatus = 'active';
    let cooldownUntil = 0;

    if (newDuration >= formatted.max_duration_sec) {
      newDuration = formatted.max_duration_sec;
      newStatus = 'cooldown';
      cooldownUntil = now + (this.defaultCooldownSec * 1000);
    }

    this.updateProgressStmt.run(newDuration, newStatus, cooldownUntil, now, guestId);
    const updated = this.getByIdStmt.get(guestId);
    return this._formatGuest(updated);
  }

  resetCooldown(guestId) {
    const now = Date.now();
    this.resetStmt.run(now, guestId);
    const updated = this.getByIdStmt.get(guestId);
    return this._formatGuest(updated);
  }

  resetCooldownByIp(clientIp) {
    const now = Date.now();
    this.resetIpStmt.run(now, clientIp);
  }

  listGuests() {
    return this.listActiveStmt.all().map(r => this._formatGuest(r));
  }

  purgeAllGuests() {
    const result = this.purgeAllStmt.run();
    return result.changes;
  }
}

module.exports = {
  GuestRepo
};
