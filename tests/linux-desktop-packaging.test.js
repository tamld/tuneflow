/**
 * TuneFlow Linux Desktop Packaging & Portable Archive Verification Suite
 * Authority: SPEC-0010 (REQ-DSK-04: Linux Tri-Format Distribution)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

describe('SPEC-0010: Linux Desktop Packaging Suite', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const desktopEntryPath = path.join(repoRoot, 'installer', 'linux', 'tuneflow.desktop');
  const packageScriptPath = path.join(repoRoot, 'scripts', 'package_linux.sh');
  const releaseYmlPath = path.join(repoRoot, '.github', 'workflows', 'release.yml');

  it('should verify installer/linux/tuneflow.desktop exists and conforms to FreeDesktop specifications', () => {
    assert.strictEqual(fs.existsSync(desktopEntryPath), true, 'tuneflow.desktop must exist in installer/linux/');
    const content = fs.readFileSync(desktopEntryPath, 'utf8');

    assert.match(content, /^\[Desktop Entry\]/m);
    assert.match(content, /^Type=Application/m);
    assert.match(content, /^Name=TuneFlow/m);
    assert.match(content, /^Exec=tuneflow/m);
    assert.match(content, /^Icon=tuneflow/m);
    assert.match(content, /^Categories=AudioVideo;Audio;/m);
    assert.match(content, /^Terminal=false/m);
  });

  it('should verify scripts/package_linux.sh exists, is executable, and creates portable tarball', () => {
    assert.strictEqual(fs.existsSync(packageScriptPath), true, 'package_linux.sh must exist in scripts/');
    const stat = fs.statSync(packageScriptPath);
    assert.ok((stat.mode & 0o111) !== 0, 'package_linux.sh must be executable');

    const content = fs.readFileSync(packageScriptPath, 'utf8');
    assert.match(content, /tar -czf/, 'Must produce compressed tar.gz');
    assert.match(content, /bin\/tuneflow/, 'Must generate launcher wrapper');
    assert.match(content, /share\/applications/, 'Must bundle FreeDesktop desktop entry');
    assert.match(content, /share\/icons/, 'Must bundle application icon');
  });

  it('should verify release.yml contains linux-desktop-build job and includes tar.gz in release assets', () => {
    const content = fs.readFileSync(releaseYmlPath, 'utf8');
    assert.match(content, /linux-desktop-build:/);
    assert.match(content, /runs-on:\s*ubuntu-latest/);
    assert.match(content, /package_linux\.sh/);
    assert.match(content, /tuneflow-linux-artifacts/);
    assert.match(content, /release-assets\/\*\.tar\.gz/);
  });
});
