const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Resolves standard persistence storage paths based on OS and portable mode flags.
 */
function resolveStoragePaths(platform, env = process.env, isPortableOverride = null) {
  const isPortable = isPortableOverride !== null
    ? isPortableOverride
    : (env.PORTABLE_MODE === '1' || fs.existsSync(path.join(process.cwd(), '.portable')));

  if (isPortable) {
    const baseDir = process.cwd();
    return {
      isPortable: true,
      dataDir: path.join(baseDir, 'data'),
      downloadsDir: path.join(baseDir, 'downloads')
    };
  }

  if (platform === 'win32') {
    const p = path.win32;
    const localAppData = env.LOCALAPPDATA || p.join(env.USERPROFILE || 'C:\\', 'AppData', 'Local');
    const root = p.join(localAppData, 'TuneFlow');
    return {
      isPortable: false,
      dataDir: p.join(root, 'data'),
      downloadsDir: p.join(root, 'downloads')
    };
  }

  const p = path.posix;
  if (platform === 'darwin') {
    const home = env.HOME || '/';
    const root = p.join(home, 'Library', 'Application Support', 'TuneFlow');
    return {
      isPortable: false,
      dataDir: p.join(root, 'data'),
      downloadsDir: p.join(root, 'downloads')
    };
  }

  // linux and other unix
  const home = env.HOME || '/';
  const dataHome = env.XDG_DATA_HOME || p.join(home, '.local', 'share');
  const root = p.join(dataHome, 'tuneflow');
  return {
    isPortable: false,
    dataDir: p.join(root, 'data'),
    downloadsDir: p.join(root, 'downloads')
  };
}

/**
 * Computes SHA-256 and verifies executable integrity before execution.
 * Throws on failure (Fail-Closed).
 */
function verifyBinaryIntegrity(binaryPath, expectedSha256) {
  if (!fs.existsSync(binaryPath)) {
    throw new Error('BINARY_NOT_FOUND: Sidecar binary missing at ' + binaryPath);
  }

  const fileBuffer = fs.readFileSync(binaryPath);
  const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  if (actualHash.toLowerCase() !== expectedSha256.toLowerCase()) {
    throw new Error(
      'SECURITY_INTEGRITY_VIOLATION: Expected SHA256 ' + expectedSha256 + ', got ' + actualHash
    );
  }

  return true;
}

/**
 * Validates Ed25519 signature of release manifest.
 */
function validateUpdateManifestSignature(manifestPayload, base64Signature, publicKeyPem) {
  try {
    const verifier = crypto.verify(
      null,
      Buffer.from(manifestPayload, 'utf8'),
      publicKeyPem,
      Buffer.from(base64Signature, 'base64')
    );
    return verifier;
  } catch (_err) {
    return false;
  }
}

/**
 * Performs atomic executable swap on filesystem to evade Windows in-use file lock.
 * Strategy:
 * 1. Rename running current.exe -> current.exe.old
 * 2. Copy/move new.exe -> current.exe
 * Returns backup file path.
 */
function atomicSwapExecutable(currentExePath, newExePath) {
  const backupPath = currentExePath + '.old';

  if (fs.existsSync(backupPath)) {
    try {
      fs.unlinkSync(backupPath);
    } catch (_e) {}
  }

  // Step 1: Rename current
  fs.renameSync(currentExePath, backupPath);

  // Step 2: Move new into place
  fs.renameSync(newExePath, currentExePath);

  return backupPath;
}

/**
 * Strips dangerous injection and interception flags from child environment.
 * Inspired by g8s capability harness.
 */
function getSanitizedEnv(baseEnv = process.env) {
  const sanitized = { ...baseEnv };
  // Dangerous Node.js flags that could execute untrusted code or proxy requests
  delete sanitized.NODE_OPTIONS;
  delete sanitized.NODE_EXTRA_CA_CERTS;
  // Dangerous scripting runtime injection vectors
  delete sanitized.PYTHONPATH;
  delete sanitized.PYTHONSTARTUP;
  delete sanitized.RUBYOPT;
  delete sanitized.PERL5OPT;
  return sanitized;
}

/**
 * Resolves path to a sidecar binary, preferring local bin/ directory if present,
 * and verifies integrity against SHA256SUMS.json when present.
 */
function resolveSidecarBinary(name, customBinDir = null) {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const binDir = customBinDir || path.join(process.cwd(), 'bin');
  const candidatePath = path.join(binDir, `${name}${ext}`);

  if (fs.existsSync(candidatePath)) {
    // Check if manifest exists for verification
    const manifestPath = path.join(binDir, 'SHA256SUMS.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const expectedHash = manifest[`${name}${ext}`] || manifest[name];
        if (expectedHash) {
          verifyBinaryIntegrity(candidatePath, expectedHash);
        }
      } catch (err) {
        if (err.message && err.message.startsWith('SECURITY_INTEGRITY_VIOLATION')) {
          throw err;
        }
      }
    }
    return candidatePath;
  }

  // Check known standard candidate locations if not found in default local bin/
  if (!customBinDir) {
    const os = require('os');
    const candidateDirs = [
      '/opt/homebrew/bin',
      '/usr/local/bin',
      path.join(os.homedir(), '.local', 'bin')
    ];
    for (const dir of candidateDirs) {
      const full = path.join(dir, `${name}${ext}`);
      if (fs.existsSync(full)) {
        return full;
      }
    }
  }

  // Fallback to system PATH binary
  return name;
}

module.exports = {
  resolveStoragePaths,
  verifyBinaryIntegrity,
  validateUpdateManifestSignature,
  atomicSwapExecutable,
  getSanitizedEnv,
  resolveSidecarBinary
};

