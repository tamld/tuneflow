const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
  generateKeyPairEd25519,
  signEd25519,
  verifyEd25519,
  verifyAndParseManifest,
  isCipher403Error
} = require('../src/security/update_verifier');
const { atomicSwapExecutable } = require('../src/security/binary_guard');

describe('SPEC-0012: Phase 14 Two-Tier Update & Packaging Verification Suite', () => {
  const rootDir = path.join(__dirname, '..');
  const wingetPath = path.join(rootDir, 'packaging', 'winget', 'tamld.TuneFlow.yaml');
  const scoopPath = path.join(rootDir, 'packaging', 'scoop', 'tuneflow.json');
  const specPath = path.join(rootDir, 'docs', 'spec', 'SPEC-0012-two-tier-self-update-and-winget-distribution.md');

  // ==========================================================================
  // TIER 1: YOUTUBE 403 CIPHER ERROR DETECTION
  // ==========================================================================
  describe('Tier 1: YouTube 403 Cipher Self-Healing Detector', () => {
    it('should detect standard HTTP 403 Forbidden YouTube error', () => {
      const err = 'ERROR: [youtube] 12345: HTTP Error 403: Forbidden';
      assert.strictEqual(isCipher403Error(err), true);
    });

    it('should detect YouTube signature / n-token extraction failures', () => {
      const err1 = 'WARNING: [youtube] n-token challenge failed: Unable to extract signature';
      const err2 = 'ERROR: [youtube] Unable to extract n-token cipher from player js';
      assert.strictEqual(isCipher403Error(err1), true);
      assert.strictEqual(isCipher403Error(err2), true);
    });

    it('should detect YouTube bot verification challenge prompts', () => {
      const err = 'ERROR: [youtube] Sign in to confirm you’re not a bot. This helps protect our community.';
      assert.strictEqual(isCipher403Error(err), true);
    });

    it('should return false for unrelated errors (e.g. 404, invalid URL, DNS timeout)', () => {
      assert.strictEqual(isCipher403Error('ERROR: [youtube] Video unavailable 404'), false);
      assert.strictEqual(isCipher403Error('getaddrinfo ENOTFOUND www.youtube.com'), false);
      assert.strictEqual(isCipher403Error(''), false);
      assert.strictEqual(isCipher403Error(null), false);
    });
  });

  // ==========================================================================
  // TIER 2: ED25519 CRYPTOGRAPHIC MANIFEST VERIFICATION
  // ==========================================================================
  describe('Tier 2: Ed25519 Cryptographic Manifest Verification', () => {
    const { publicKey, privateKey } = generateKeyPairEd25519();
    const sampleManifest = `
# TuneFlow Release Manifest
a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0  TuneFlow-Setup-2.5.0.exe
f0e1d2c3b4a5968776554433221100ffeeddccbbaa99887766554433221100ff  tuneflow-mobile-2.5.0.apk
`;

    it('should verify authentic Ed25519 signature successfully', () => {
      const signature = signEd25519(sampleManifest, privateKey);
      assert.ok(typeof signature === 'string', 'Signature must be a string');
      assert.ok(signature.length > 30, 'Signature must have valid base64 length');

      const isValid = verifyEd25519(sampleManifest, signature, publicKey);
      assert.strictEqual(isValid, true, 'Genuine signature must verify as true');
    });

    it('should reject tampered manifest content with false', () => {
      const signature = signEd25519(sampleManifest, privateKey);
      const tamperedManifest = sampleManifest + '\nmalicious_hash *backdoor.exe';

      const isValid = verifyEd25519(tamperedManifest, signature, publicKey);
      assert.strictEqual(isValid, false, 'Tampered data must fail signature verification');
    });

    it('should verify and parse manifest checksums into map on valid signature', () => {
      const signature = signEd25519(sampleManifest, privateKey);
      const checksums = verifyAndParseManifest(sampleManifest, signature, publicKey);

      assert.ok(checksums instanceof Map, 'Result must be a Map');
      assert.strictEqual(checksums.size, 2);
      assert.strictEqual(
        checksums.get('TuneFlow-Setup-2.5.0.exe'),
        'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0'
      );
      assert.strictEqual(
        checksums.get('tuneflow-mobile-2.5.0.apk'),
        'f0e1d2c3b4a5968776554433221100ffeeddccbbaa99887766554433221100ff'
      );
    });

    it('should throw Fail-Closed SECURITY_INTEGRITY_VIOLATION when parsing tampered manifest', () => {
      const signature = signEd25519(sampleManifest, privateKey);
      const tampered = sampleManifest.replace('2.5.0', '2.5.1');

      assert.throws(() => {
        verifyAndParseManifest(tampered, signature, publicKey);
      }, /SECURITY_INTEGRITY_VIOLATION/);
    });
  });

  // ==========================================================================
  // WINDOWS ATOMIC SWAP FILE REPLACEMENT
  // ==========================================================================
  describe('Windows Atomic Swap (.old Rename Pattern)', () => {
    it('should atomically swap running binary without file locks', () => {
      const tempDir = path.join(__dirname, 'temp_swap_test');
      fs.mkdirSync(tempDir, { recursive: true });

      const currentExe = path.join(tempDir, 'TuneFlow.exe');
      const newExe = path.join(tempDir, 'TuneFlow.exe.new');

      try {
        fs.writeFileSync(currentExe, 'RUNNING_VERSION_OLD');
        fs.writeFileSync(newExe, 'NEW_VERIFIED_VERSION');

        const backup = atomicSwapExecutable(currentExe, newExe);

        assert.strictEqual(backup, currentExe + '.old');
        assert.strictEqual(fs.existsSync(currentExe), true);
        assert.strictEqual(fs.readFileSync(currentExe, 'utf8'), 'NEW_VERIFIED_VERSION');
        assert.strictEqual(fs.readFileSync(backup, 'utf8'), 'RUNNING_VERSION_OLD');
      } finally {
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }
    });
  });

  // ==========================================================================
  // PACKAGE MANAGER MANIFESTS (WINGET & SCOOP)
  // ==========================================================================
  describe('Windows Package Manager Manifests Compliance', () => {
    it('should verify SPEC-0012 document exists and defines architecture', () => {
      assert.strictEqual(fs.existsSync(specPath), true, 'SPEC-0012 must exist');
      const content = fs.readFileSync(specPath, 'utf8');
      assert.ok(content.includes('SPEC-0012'), 'Must declare SPEC-0012');
      assert.ok(content.includes('Ed25519'), 'Must declare Ed25519 cryptographic update');
    });

    it('should verify WinGet manifest complies with Microsoft WinGet 1.6.0 schema', () => {
      assert.strictEqual(fs.existsSync(wingetPath), true, 'WinGet manifest must exist');
      const content = fs.readFileSync(wingetPath, 'utf8');

      assert.ok(content.includes('PackageIdentifier: tamld.TuneFlow'), 'Must define PackageIdentifier');
      assert.ok(content.includes('InstallerType: inno'), 'Must declare inno installer type');
      assert.ok(content.includes('Scope: user'), 'Must enforce user scope for zero-admin');
      assert.ok(content.includes('/VERYSILENT'), 'Must define silent flags');
      assert.ok(content.includes('InstallLocation'), 'Must specify user profile install location');
    });

    it('should verify Scoop manifest is valid JSON and declares 64-bit inno installer', () => {
      assert.strictEqual(fs.existsSync(scoopPath), true, 'Scoop manifest must exist');
      const scoop = JSON.parse(fs.readFileSync(scoopPath, 'utf8'));

      assert.strictEqual(typeof scoop.version, 'string');
      assert.strictEqual(scoop.innosetup, true, 'Must declare innosetup: true');
      assert.ok(scoop.architecture['64bit'], 'Must configure 64bit architecture');
      assert.ok(scoop.autoupdate, 'Must configure autoupdate');
      assert.ok(scoop.checkver, 'Must configure checkver');
    });
  });
});
