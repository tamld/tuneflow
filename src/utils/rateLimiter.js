/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Protects TuneFlow against DoS, container OOMKill, and excessive child process spawning.
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000;
  const max = options.max || 60;
  const message = options.message || 'Dạ Bố Mẹ hoặc hệ thống đang gửi yêu cầu quá nhanh, vui lòng chờ một lát nhé!';
  const hits = new Map();

  // Periodic cleanup of expired timestamps
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of hits.entries()) {
      const valid = timestamps.filter(t => now - t < windowMs);
      if (valid.length === 0) {
        hits.delete(ip);
      } else {
        hits.set(ip, valid);
      }
    }
  }, windowMs);
  cleanupTimer.unref();

  const middleware = (req, res, next) => {
    const ip = req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const now = Date.now();
    const timestamps = hits.get(ip) || [];
    const valid = timestamps.filter(t => now - t < windowMs);

    if (valid.length >= max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({
        success: false,
        error: message
      });
    }

    valid.push(now);
    hits.set(ip, valid);
    next();
  };

  middleware.reset = () => hits.clear();
  return middleware;
}

module.exports = {
  createRateLimiter
};
