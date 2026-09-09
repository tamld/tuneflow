const express = require('express');

function createAuthRouter({ authService }) {
  const router = express.Router();

  router.post('/login', (req, res) => {
    try {
      const { username, password } = req.body || {};
      const rawIp = req.headers['x-forwarded-for'] || req.ip || (req.socket && req.socket.remoteAddress);
      const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const result = authService.login({ username, password, clientIp, userAgent });
      return res.status(200).json({
        ok: true,
        token: result.token,
        user: result.user,
        expiresAt: result.expiresAt
      });
    } catch (err) {
      return res.status(401).json({
        ok: false,
        error: 'INVALID_CREDENTIALS',
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác'
      });
    }
  });

  router.post('/logout', (req, res) => {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }
    if (token) {
      authService.logout(token);
    }
    return res.status(200).json({
      ok: true,
      message: 'Đăng xuất thành công'
    });
  });

  router.get('/me', (req, res) => {
    if (!req.user || req.user.isGuest) {
      return res.status(200).json({
        authenticated: false,
        role: 'guest',
        guest: req.user ? req.user.guest : null
      });
    }

    return res.status(200).json({
      authenticated: true,
      role: req.user.role,
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      }
    });
  });

  router.post('/guest-bootstrap', (req, res) => {
    const rawIp = req.headers['x-forwarded-for'] || req.ip || (req.socket && req.socket.remoteAddress);
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';
    const fingerprintHash = req.headers['x-fingerprint'] || (req.body && req.body.fingerprint) || 'anonymous';
    const guestId = req.headers['x-guest-id'] || (req.body && req.body.guestId) || null;

    const guest = authService.guestBootstrap({ guestId, clientIp, fingerprintHash });
    return res.status(200).json({
      ok: true,
      guest
    });
  });

  router.post('/guest-heartbeat', (req, res) => {
    if (!req.user || !req.user.isGuest) {
      return res.status(200).json({
        ok: true,
        authenticated: true,
        message: 'Unmetered authenticated session'
      });
    }

    const durationSec = Number(req.body && req.body.durationSec) || 15;
    const updated = authService.recordGuestHeartbeat({
      guestId: req.user.id,
      durationSec
    });

    return res.status(200).json({
      ok: true,
      guest: updated
    });
  });

  return router;
}

module.exports = {
  createAuthRouter
};
