const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Import target security modules to be implemented
const {
  resolveStoragePaths,
  verifyBinaryIntegrity,
  validateUpdateManifestSignature,
  atomicSwapExecutable,
  getSanitizedEnv,
  resolveSidecarBinary
} = require('../src/security/binary_guard');

describe('SPEC-0008: Portable Binary Security & AV Defense Suite', () => {

  describe('Storage & Persistence Isolation', () => {
    it('should resolve OS-standard persistence directory when not in portable mode', () => {
      const pathsWin = resolveStoragePaths('win32', { LOCALAPPDATA: 'C:\\Users\\User\\AppData\\Local' }, false);
      assert.strictEqual(pathsWin.dataDir, 'C:\\Users\\User\\AppData\\Local\\TuneFlow\\data');
      assert.strictEqual(pathsWin.downloadsDir, 'C:\\Users\\User\\AppData\\Local\\TuneFlow\\downloads');

      const pathsMac = resolveStoragePaths('darwin', { HOME: '/Users/testuser' }, false);
      assert.strictEqual(pathsMac.dataDir, path.normalize('/Users/testuser/Library/Application Support/TuneFlow/data'));

      const pathsLinux = resolveStoragePaths('linux', { HOME: '/home/testuser' }, false);
      assert.strictEqual(pathsLinux.dataDir, path.normalize('/home/testuser/.local/share/tuneflow/data'));
    });

    it('should stay strictly local in portable mode or when .portable marker exists', () => {
      const paths = resolveStoragePaths('win32', {}, true);
      assert.strictEqual(paths.isPortable, true);
      assert.strictEqual(path.isAbsolute(paths.dataDir), true);
      assert.match(paths.dataDir, /data$/);
    });
  });

  describe('Binary Integrity Guard (Fail-Closed Execution)', () => {
    it('should verify binary hash against expected SHA-256 before allowing spawn', () => {
      const tempBinary = path.join(__dirname, 'mock_ytdlp.exe');
      const fakeContent = 'MOCK_BINARY_PAYLOAD_FOR_TESTING';
      fs.writeFileSync(tempBinary, fakeContent);
      const expectedHash = crypto.createHash('sha256').update(fakeContent).digest('hex');

      try {
        const isValid = verifyBinaryIntegrity(tempBinary, expectedHash);
        assert.strictEqual(isValid, true, 'Valid binary hash must be verified');

        // Tampered payload
        assert.throws(() => {
          verifyBinaryIntegrity(tempBinary, '0000000000000000000000000000000000000000000000000000000000000000');
        }, /SECURITY_INTEGRITY_VIOLATION/, 'Tampered binary must trigger fail-closed error');
      } finally {
        if (fs.existsSync(tempBinary)) fs.unlinkSync(tempBinary);
      }
    });

    it('should reject missing sidecar binary with explicit error', () => {
      assert.throws(() => {
        verifyBinaryIntegrity('path/to/nonexistent/binary.exe', 'abc123hash');
      }, /BINARY_NOT_FOUND/);
    });
  });

  describe('Ed25519 Signature Verification for Updates', () => {
    it('should verify cryptographic signature of release manifest before accepting binary update', () => {
      // Generate Ed25519 keypair for test
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
      const pubKeyDer = publicKey.export({ type: 'spki', format: 'pem' });

      const manifestPayload = JSON.stringify({
        version: '2.5.0',
        url: 'https://github.com/tamld/tuneflow/releases/download/v2.5.0/tuneflow-win64.zip',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      });

      const signature = crypto.sign(null, Buffer.from(manifestPayload), privateKey).toString('base64');

      const verified = validateUpdateManifestSignature(manifestPayload, signature, pubKeyDer);
      assert.strictEqual(verified, true, 'Authentic signature must verify');

      // Tampered payload
      const tamperedPayload = manifestPayload.replace('2.5.0', '2.5.1-malicious');
      assert.strictEqual(
        validateUpdateManifestSignature(tamperedPayload, signature, pubKeyDer),
        false,
        'Tampered manifest must fail verification'
      );
    });
  });

  describe('Atomic Binary Swap Execution (Windows Lock Evasion)', () => {
    it('should perform safe atomic file rename without in-use collision', () => {
      const currentExe = path.join(__dirname, 'current_app.exe');
      const newExe = path.join(__dirname, 'new_app.exe');
      fs.writeFileSync(currentExe, 'VERSION_2.4.3');
      fs.writeFileSync(newExe, 'VERSION_2.5.0');

      try {
        const backupPath = atomicSwapExecutable(currentExe, newExe);
        assert.strictEqual(fs.existsSync(currentExe), true);
        assert.strictEqual(fs.readFileSync(currentExe, 'utf8'), 'VERSION_2.5.0', 'Current executable must now contain new version');
        assert.strictEqual(fs.existsSync(backupPath), true, 'Backup .old executable must exist for rollback');
        assert.strictEqual(fs.readFileSync(backupPath, 'utf8'), 'VERSION_2.4.3');
      } finally {
        if (fs.existsSync(currentExe)) fs.unlinkSync(currentExe);
        if (fs.existsSync(newExe)) fs.unlinkSync(newExe);
        const oldFile = currentExe + '.old';
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
    });
  });

  describe('Process Environment Sanitization (g8s Capability Boundary)', () => {
    it('should strip dangerous runtime injection variables', () => {
      const dirtyEnv = {
        PATH: 'C:\\Windows\\system32',
        NODE_OPTIONS: '--inspect=0.0.0.0:9229',
        PYTHONPATH: '/tmp/malicious',
        PYTHONSTARTUP: '/tmp/startup.py',
        RUBYOPT: '-r/tmp/malicious',
        PERL5OPT: '-Mmalicious',
        SAFE_CUSTOM_VAR: 'hello'
      };

      const cleanEnv = getSanitizedEnv(dirtyEnv);
      assert.strictEqual(cleanEnv.PATH, 'C:\\Windows\\system32');
      assert.strictEqual(cleanEnv.SAFE_CUSTOM_VAR, 'hello');
      assert.strictEqual(cleanEnv.NODE_OPTIONS, undefined);
      assert.strictEqual(cleanEnv.PYTHONPATH, undefined);
      assert.strictEqual(cleanEnv.PYTHONSTARTUP, undefined);
      assert.strictEqual(cleanEnv.RUBYOPT, undefined);
      assert.strictEqual(cleanEnv.PERL5OPT, undefined);
    });
  });

  describe('Sidecar Resolution & CAS Manifest Gate', () => {
    it('should fallback to system binary name when no local bin exists', () => {
      const res = resolveSidecarBinary('ffmpeg', path.join(__dirname, 'nonexistent_bin'));
      assert.strictEqual(res, 'ffmpeg');
    });

    it('should resolve local binary and verify against manifest when present', () => {
      const testBinDir = path.join(__dirname, 'test_sandbox_bin');
      if (!fs.existsSync(testBinDir)) fs.mkdirSync(testBinDir, { recursive: true });

      const ext = process.platform === 'win32' ? '.exe' : '';
      const fakeBinaryPath = path.join(testBinDir, `mocktool${ext}`);
      const payload = 'VALID_MOCK_TOOL_PAYLOAD';
      fs.writeFileSync(fakeBinaryPath, payload);
      const hash = crypto.createHash('sha256').update(payload).digest('hex');

      const manifestPath = path.join(testBinDir, 'SHA256SUMS.json');
      fs.writeFileSync(manifestPath, JSON.stringify({
        [`mocktool${ext}`]: hash
      }));

      try {
        const resolved = resolveSidecarBinary('mocktool', testBinDir);
        assert.strictEqual(resolved, fakeBinaryPath);

        // Tamper manifest with wrong hash
        fs.writeFileSync(manifestPath, JSON.stringify({
          [`mocktool${ext}`]: '0000000000000000000000000000000000000000000000000000000000000000'
        }));

        assert.throws(() => {
          resolveSidecarBinary('mocktool', testBinDir);
        }, /SECURITY_INTEGRITY_VIOLATION/);
      } finally {
        if (fs.existsSync(fakeBinaryPath)) fs.unlinkSync(fakeBinaryPath);
        if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
        if (fs.existsSync(testBinDir)) fs.rmdirSync(testBinDir);
      }
    });
  });
});

