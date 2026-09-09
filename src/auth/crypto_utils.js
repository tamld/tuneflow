const crypto = require('node:crypto');

function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString('hex'),
    salt
  };
}

function verifyPassword(password, storedHash, salt) {
  if (!password || !storedHash || !salt) {
    return false;
  }
  try {
    const derivedBuf = crypto.scryptSync(password, salt, 64);
    const storedBuf = Buffer.from(storedHash, 'hex');

    if (derivedBuf.length !== storedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedBuf, storedBuf);
  } catch (err) {
    return false;
  }
}

function generateToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('base64url');
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken
};
