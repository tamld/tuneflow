const { hashPassword, verifyPassword, generateToken } = require('./crypto_utils');

class AuthService {
  constructor({ userRepo, sessionRepo, guestRepo, sessionTtlMs = 7 * 24 * 60 * 60 * 1000 }) {
    this.userRepo = userRepo;
    this.sessionRepo = sessionRepo;
    this.guestRepo = guestRepo;
    this.sessionTtlMs = sessionTtlMs;
  }

  ensureDefaultAdmin(defaultPassword = 'admin') {
    if (this.userRepo.countUsers() > 0) {
      return null;
    }
    const { hash, salt } = hashPassword(defaultPassword);
    return this.userRepo.createUser({
      username: 'admin',
      passwordHash: hash,
      salt,
      role: 'admin'
    });
  }

  login({ username, password, clientIp = null, userAgent = null }) {
    if (!username || !password) {
      throw new Error('INVALID_CREDENTIALS: Username and password are required');
    }

    const user = this.userRepo.getUserByUsername(username);
    if (!user || user.is_active !== 1) {
      throw new Error('INVALID_CREDENTIALS: Invalid username or password');
    }

    const isMatch = verifyPassword(password, user.password_hash, user.salt);
    if (!isMatch) {
      throw new Error('INVALID_CREDENTIALS: Invalid username or password');
    }

    const token = generateToken(32);
    const expiresAt = Date.now() + this.sessionTtlMs;

    this.sessionRepo.createSession({
      token,
      userId: user.id,
      role: user.role,
      expiresAt,
      clientIp,
      userAgent
    });

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  }

  logout(token) {
    if (!token) return false;
    return this.sessionRepo.deleteSession(token);
  }

  getMe(token) {
    if (!token) return null;
    const session = this.sessionRepo.getSession(token);
    if (!session) return null;

    return {
      id: session.user_id,
      username: session.username,
      role: session.role,
      expiresAt: session.expires_at
    };
  }

  guestBootstrap({ guestId, clientIp, fingerprintHash }) {
    return this.guestRepo.getOrCreateGuest({
      guestId,
      clientIp,
      fingerprintHash
    });
  }

  recordGuestHeartbeat({ guestId, durationSec = 15 }) {
    return this.guestRepo.recordListeningTime(guestId, durationSec);
  }
}

module.exports = {
  AuthService
};
