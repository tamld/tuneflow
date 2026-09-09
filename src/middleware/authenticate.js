function createAuthenticateMiddleware(authService) {
  return function authenticate(req, res, next) {
    const authHeader = req.headers && req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (token) {
      const user = authService.getMe(token);
      if (user) {
        req.user = {
          id: user.id,
          username: user.username,
          role: user.role,
          isGuest: false
        };
        return next();
      }
    }

    // Unauthenticated -> treat as Guest
    const rawIp = (req.headers && req.headers['x-forwarded-for']) || req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const clientIp = typeof rawIp === 'string' ? rawIp.split(',')[0].trim() : '127.0.0.1';
    const fingerprintHash = (req.headers && req.headers['x-fingerprint']) || (req.query && req.query.fp) || 'anonymous';
    const guestId = (req.headers && req.headers['x-guest-id']) || (req.query && req.query.guest_id) || null;

    const guest = authService.guestBootstrap({
      guestId,
      clientIp,
      fingerprintHash
    });

    req.user = {
      id: guest.guest_id,
      role: 'guest',
      isGuest: true,
      guest
    };

    next();
  };
}

module.exports = {
  createAuthenticateMiddleware
};
