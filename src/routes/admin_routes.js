const express = require('express');
const { authorize } = require('../middleware/authorize');
const { hashPassword } = require('../auth/crypto_utils');

function createAdminRouter({ userRepo, guestRepo, sessionRepo }) {
  const router = express.Router();

  // All admin endpoints require 'admin' role
  router.use(authorize('admin'));

  router.get('/users', (req, res) => {
    const users = userRepo.listUsers();
    return res.status(200).json(users);
  });

  router.post('/users', (req, res) => {
    try {
      const { username, password, role = 'user' } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Tên người dùng và mật khẩu là bắt buộc' });
      }

      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'INVALID_ROLE', message: 'Vai trò chỉ có thể là admin hoặc user' });
      }

      const { hash, salt } = hashPassword(password);
      const user = userRepo.createUser({ username, passwordHash: hash, salt, role });

      return res.status(201).json({
        ok: true,
        user
      });
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'USERNAME_EXISTS', message: 'Tên đăng nhập đã tồn tại' });
      }
      return res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
    }
  });

  router.delete('/users/:id', (req, res) => {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'INVALID_ID' });
    }

    if (req.user && req.user.id === userId) {
      return res.status(400).json({ error: 'CANNOT_DELETE_SELF', message: 'Bạn không thể tự xóa tài khoản đang đăng nhập' });
    }

    const success = userRepo.deleteUser(userId);
    return res.status(200).json({ ok: success });
  });

  router.post('/guests/reset', (req, res) => {
    const { guestId, clientIp } = req.body || {};
    let updated = null;

    if (guestId) {
      updated = guestRepo.resetCooldown(guestId);
    } else if (clientIp) {
      guestRepo.resetCooldownByIp(clientIp);
    }

    return res.status(200).json({
      ok: true,
      guest: updated
    });
  });

  router.get('/guests', (req, res) => {
    const guests = guestRepo.listGuests();
    return res.status(200).json(guests);
  });

  // --- Session Management & Kick-Out Endpoints (Issue #84) ---

  router.get('/sessions', (req, res) => {
    if (!sessionRepo) {
      return res.status(501).json({ error: 'SESSION_REPO_NOT_CONFIGURED' });
    }
    const currentToken = req.token || null;
    const rawSessions = sessionRepo.listActiveSessions();
    const sessions = rawSessions.map(s => ({
      token: s.token,
      userId: s.user_id,
      username: s.username,
      role: s.role,
      clientIp: s.client_ip || '127.0.0.1',
      userAgent: s.user_agent || 'Thiết bị không xác định',
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      isCurrent: currentToken ? s.token === currentToken : false
    }));

    const activeGuests = guestRepo ? guestRepo.listGuests().length : 0;
    const metrics = {
      totalActive: sessions.length,
      activeGuests,
      roles: {
        admin: sessions.filter(s => s.role === 'admin').length,
        user: sessions.filter(s => s.role === 'user').length
      }
    };

    return res.status(200).json({
      ok: true,
      sessions,
      metrics
    });
  });

  router.post('/sessions/revoke', (req, res) => {
    if (!sessionRepo) {
      return res.status(501).json({ error: 'SESSION_REPO_NOT_CONFIGURED' });
    }
    const { token } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'MISSING_TOKEN', message: 'Token phiên là bắt buộc' });
    }

    const success = sessionRepo.deleteSession(token);
    return res.status(200).json({
      ok: true,
      revoked: success
    });
  });

  router.post('/sessions/revoke-group', (req, res) => {
    const { group, excludeCurrentSession = true } = req.body || {};
    const currentToken = excludeCurrentSession ? (req.token || null) : null;

    if (!['guests', 'users', 'all_except_me'].includes(group)) {
      return res.status(400).json({
        error: 'INVALID_GROUP',
        message: 'Nhóm hợp lệ: guests, users, all_except_me'
      });
    }

    let revokedCount = 0;
    if (group === 'guests') {
      if (guestRepo) {
        revokedCount = guestRepo.purgeAllGuests();
      }
    } else if (group === 'users') {
      if (sessionRepo) {
        revokedCount = sessionRepo.deleteSessionsByRole('user');
      }
    } else if (group === 'all_except_me') {
      if (sessionRepo) {
        revokedCount += sessionRepo.deleteAllSessions(currentToken);
      }
      if (guestRepo) {
        revokedCount += guestRepo.purgeAllGuests();
      }
    }

    return res.status(200).json({
      ok: true,
      group,
      count: revokedCount
    });
  });

  router.post('/sessions/revoke-all', (req, res) => {
    const { excludeCurrentSession = false } = req.body || {};
    const currentToken = excludeCurrentSession ? (req.token || null) : null;

    let revokedCount = 0;
    if (sessionRepo) {
      revokedCount += sessionRepo.deleteAllSessions(currentToken);
    }
    if (guestRepo) {
      revokedCount += guestRepo.purgeAllGuests();
    }

    return res.status(200).json({
      ok: true,
      count: revokedCount,
      excludedCurrent: Boolean(currentToken)
    });
  });

  return router;
}

module.exports = {
  createAdminRouter
};
