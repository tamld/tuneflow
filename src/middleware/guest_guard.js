function createGuestGuardMiddleware(guestRepo) {
  return function guestGuard(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }

    // Admins and Users are not restricted by guest quotas
    if (req.user.role === 'admin' || req.user.role === 'user') {
      return next();
    }

    // Role is guest
    const guest = req.user.guest || (guestRepo && guestRepo.getOrCreateGuest({ guestId: req.user.id }));
    if (!guest || !guest.can_listen || guest.status === 'cooldown' || guest.remaining_sec <= 0) {
      const now = Date.now();
      const cooldownRemaining = guest && guest.cooldown_until ? Math.max(0, Math.ceil((guest.cooldown_until - now) / 1000)) : 3600;

      return res.status(403).json({
        error: 'GUEST_COOLDOWN_ACTIVE',
        message: 'Bạn đã dùng hết 30 phút nghe thử miễn phí. Vui lòng chờ thời gian làm mới (cooldown) hoặc đăng nhập tài khoản Gia Đình để nghe không giới hạn!',
        listenDurationSec: guest ? guest.listen_duration_sec : 1800,
        maxDurationSec: guest ? guest.max_duration_sec : 1800,
        cooldownRemainingSec: cooldownRemaining
      });
    }

    next();
  };
}

module.exports = {
  createGuestGuardMiddleware
};
