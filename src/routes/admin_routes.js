const express = require('express');
const { authorize } = require('../middleware/authorize');
const { hashPassword } = require('../auth/crypto_utils');

function createAdminRouter({ userRepo, guestRepo }) {
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

  return router;
}

module.exports = {
  createAdminRouter
};
