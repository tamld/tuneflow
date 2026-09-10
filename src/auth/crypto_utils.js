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

const DEFAULT_SECRET = process.env.TUNEFLOW_SECRET_KEY || 'tuneflow_production_secret_key_32b_salt';

function getEncryptionKey(secret = DEFAULT_SECRET) {
  return crypto.createHash('sha256').update(String(secret)).digest();
}

function encryptField(plaintext, secret = DEFAULT_SECRET, deterministic = false) {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return plaintext;
  }
  const str = String(plaintext);
  const key = getEncryptionKey(secret);
  const iv = deterministic
    ? crypto.createHmac('sha256', key).update(str).digest().subarray(0, 12)
    : crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(str, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `enc:v1:${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decryptField(ciphertext, secret = DEFAULT_SECRET) {
  if (!ciphertext || typeof ciphertext !== 'string' || !ciphertext.startsWith('enc:v1:')) {
    return ciphertext;
  }
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 5) return ciphertext;
    const iv = Buffer.from(parts[2], 'hex');
    const tag = Buffer.from(parts[3], 'hex');
    const encrypted = parts[4];
    const key = getEncryptionKey(secret);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (_e) {
    return ciphertext;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  encryptField,
  decryptField
};
