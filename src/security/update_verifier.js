const crypto = require('crypto');

/**
 * Generate Ed25519 key pair for signing release manifests
 */
function generateKeyPairEd25519() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKey, privateKey };
}

/**
 * Sign data with Ed25519 private key
 * @param {string|Buffer} data
 * @param {string} privateKeyPem
 * @returns {string} base64 encoded signature
 */
function signEd25519(data, privateKeyPem) {
  if (!data) throw new Error('Data to sign cannot be empty');
  if (!privateKeyPem) throw new Error('Private key cannot be empty');
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  return crypto.sign(null, buffer, privateKeyPem).toString('base64');
}

/**
 * Verify Ed25519 signature over binary data or manifest
 * @param {string|Buffer} data
 * @param {string} signatureBase64
 * @param {string} publicKeyPem
 * @returns {boolean} true if authentic, false if tampered or invalid
 */
function verifyEd25519(data, signatureBase64, publicKeyPem) {
  if (!data || !signatureBase64 || !publicKeyPem) return false;
  try {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    return crypto.verify(null, buffer, publicKeyPem, signatureBuffer);
  } catch (_err) {
    return false;
  }
}

/**
 * Verify a release manifest and parse checksums if signature is authentic
 * @param {string} manifestText
 * @param {string} signatureBase64
 * @param {string} publicKeyPem
 * @returns {Map<string, string>} map of filename -> sha256 checksum
 */
function verifyAndParseManifest(manifestText, signatureBase64, publicKeyPem) {
  if (!verifyEd25519(manifestText, signatureBase64, publicKeyPem)) {
    throw new Error('SECURITY_INTEGRITY_VIOLATION: Ed25519 signature verification failed for update manifest');
  }

  const checksums = new Map();
  const lines = manifestText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const hash = parts[0].toLowerCase();
      const filename = parts.slice(1).join(' ').replace(/^[*]/, '').trim();
      checksums.set(filename, hash);
    }
  }
  return checksums;
}

/**
 * Check if an error message indicates a YouTube 403 / cipher signature extraction failure
 * @param {string} errorText
 * @returns {boolean}
 */
function isCipher403Error(errorText) {
  if (!errorText || typeof errorText !== 'string') return false;
  const lower = errorText.toLowerCase();
  return (
    lower.includes('http error 403') ||
    lower.includes('403: forbidden') ||
    lower.includes('unable to extract signature') ||
    lower.includes('unable to extract n-token') ||
    lower.includes('confirm you’re not a bot') ||
    lower.includes('sign in to confirm you’re not a bot')
  );
}

module.exports = {
  generateKeyPairEd25519,
  signEd25519,
  verifyEd25519,
  verifyAndParseManifest,
  isCipher403Error
};
