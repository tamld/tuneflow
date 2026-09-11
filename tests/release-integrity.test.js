const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { verifyBinaryIntegrity } = require('../src/security/binary_guard');

describe('Gate 4: Desktop Installer Integrity & Binary Checksum Release Gate', () => {
  const rootDir = path.join(__dirname, '..');
  const issPath = path.join(rootDir, 'installer', 'windows', 'setup.iss');
  const desktopPath = path.join(rootDir, 'installer', 'linux', 'tuneflow.desktop');
  const iconPath = path.join(rootDir, 'public', 'icons', 'favicon.ico');

  describe('Windows Inno Setup 6 Specification (SPEC-0010, ADR-0014)', () => {
    it('should verify installer/windows/setup.iss exists and has valid configuration', () => {
      assert.ok(fs.existsSync(issPath), 'setup.iss must exist in installer/windows/');
      const content = fs.readFileSync(issPath, 'utf8');

      assert.match(content, /AppId=\{\{E58F4B3C-9A82-4E19-88F4-A46D54B733D1\}/, 'Must define immutable AppId');
      assert.match(content, /PrivilegesRequired=lowest/, 'Must be Zero-Admin non-elevated install');
      assert.match(content, /DefaultDirName=\{localappdata\}\\Programs\\/, 'Must install to LocalAppData Programs');
      assert.match(content, /Compression=lzma2\/ultra64/, 'Must use solid lzma2 compression');
    });

    it('should verify icon file referenced by setup.iss physically exists', () => {
      assert.ok(fs.existsSync(iconPath), 'Setup icon must physically exist at public/icons/favicon.ico');
      const stats = fs.statSync(iconPath);
      assert.ok(stats.size > 1000, 'Icon file must not be empty or truncated');
    });
  });

  describe('Linux FreeDesktop Desktop Entry Specification', () => {
    it('should verify installer/linux/tuneflow.desktop contains valid standard metadata', () => {
      assert.ok(fs.existsSync(desktopPath), 'tuneflow.desktop must exist in installer/linux/');
      const content = fs.readFileSync(desktopPath, 'utf8');

      assert.match(content, /\[Desktop Entry\]/, 'Must have [Desktop Entry] section header');
      assert.match(content, /Type=Application/, 'Must specify Type=Application');
      assert.match(content, /Exec=tuneflow\s+%U/, 'Must execute binary with %U url argument');
      assert.match(content, /Categories=AudioVideo;Audio;/, 'Must belong to AudioVideo category');
    });
  });

  describe('Binary Guard Hash Checksum Verification (SPEC-0008)', () => {
    it('should fail-closed when binary does not exist on disk', () => {
      const missingPath = path.join(rootDir, 'bin', 'nonexistent_binary.exe');
      assert.throws(
        () => verifyBinaryIntegrity(missingPath, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
        /BINARY_NOT_FOUND/
      );
    });

    it('should fail-closed when binary SHA-256 does not match expected hash', () => {
      const tempPath = path.join(rootDir, '.temp_corrupt_test_binary.bin');
      fs.writeFileSync(tempPath, 'CORRUPTED_TAMPERED_BINARY_CONTENT');
      try {
        assert.throws(
          () => verifyBinaryIntegrity(tempPath, '0000000000000000000000000000000000000000000000000000000000000000'),
          /SECURITY_INTEGRITY_VIOLATION/
        );
      } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    });

    it('should pass cleanly when binary SHA-256 matches authentic digest', () => {
      const tempPath = path.join(rootDir, '.temp_valid_test_binary.bin');
      const testContent = 'AUTHENTIC_BINARY_CONTENT_STAMP';
      fs.writeFileSync(tempPath, testContent);
      const expectedHash = crypto.createHash('sha256').update(testContent).digest('hex');
      try {
        assert.doesNotThrow(
          () => verifyBinaryIntegrity(tempPath, expectedHash)
        );
      } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    });
  });
});
