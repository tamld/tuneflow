/**
 * TuneFlow macOS Desktop Packaging & DMG Verification Suite
 * Authority: SPEC-0010 (REQ-DSK-03: Turn-key macOS Drag-to-Applications DMG)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

describe('SPEC-0010: macOS Native Desktop Packaging Suite', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const infoPlistPath = path.join(repoRoot, 'installer', 'macos', 'Info.plist');
  const launcherPath = path.join(repoRoot, 'installer', 'macos', 'tuneflow-launcher.sh');
  const icnsPath = path.join(repoRoot, 'assets', 'branding', 'icon.icns');
  const packageScriptPath = path.join(repoRoot, 'scripts', 'package_macos.sh');

  it('should verify installer/macos/Info.plist exists and contains required Apple CFBundle properties', () => {
    assert.strictEqual(fs.existsSync(infoPlistPath), true, 'Info.plist must exist in installer/macos/');
    const content = fs.readFileSync(infoPlistPath, 'utf8');

    // XML Structure
    assert.match(content, /<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(content, /<!DOCTYPE plist PUBLIC "-\/\/Apple\/\/DTD PLIST 1\.0\/\/EN"/);

    // Essential Bundle Metadata
    assert.match(content, /<key>CFBundlePackageType<\/key>\s*<string>APPL<\/string>/);
    assert.match(content, /<key>CFBundleIdentifier<\/key>\s*<string>com\.tamld\.tuneflow<\/string>/);
    assert.match(content, /<key>CFBundleName<\/key>\s*<string>TuneFlow<\/string>/);
    assert.match(content, /<key>CFBundleExecutable<\/key>\s*<string>TuneFlow<\/string>/);
    assert.match(content, /<key>CFBundleIconFile<\/key>\s*<string>icon\.icns<\/string>/);
    assert.match(content, /<key>LSMinimumSystemVersion<\/key>\s*<string>12\.0<\/string>/);
    assert.match(content, /<key>NSHighResolutionCapable<\/key>\s*<true\/>/);
  });

  it('should verify installer/macos/tuneflow-launcher.sh is executable and handles Node resolution', () => {
    assert.strictEqual(fs.existsSync(launcherPath), true, 'tuneflow-launcher.sh must exist');
    const content = fs.readFileSync(launcherPath, 'utf8');

    assert.ok(content.startsWith('#!/bin/bash'), 'Must have bash shebang');
    assert.match(content, /\/opt\/homebrew\/bin\/node/, 'Must search Apple Silicon homebrew node');
    assert.match(content, /\/usr\/local\/bin\/node/, 'Must search Intel homebrew node');
    assert.match(content, /osascript.*display alert/, 'Must notify user via AppleScript if node is missing');
    assert.match(content, /exec "\$NODE_CMD" "\$APP_DIR\/bin\/tuneflow\.js" "\$@"/, 'Must exec tuneflow.js forwarding arguments');
  });

  it('should verify assets/branding/icon.icns exists and has valid Apple ICNS magic header', () => {
    assert.strictEqual(fs.existsSync(icnsPath), true, 'assets/branding/icon.icns must exist');
    const buffer = fs.readFileSync(icnsPath);
    assert.ok(buffer.length > 5000, 'icon.icns must be a substantial multi-layer icon');

    // Apple ICNS Magic Bytes: 0x69 0x63 0x6e 0x73 ("icns")
    const magic = buffer.toString('ascii', 0, 4);
    assert.strictEqual(magic, 'icns', 'ICNS file must begin with magic header "icns"');
  });

  it('should verify scripts/package_macos.sh exists, is executable, and configures UDZO DMG', () => {
    assert.strictEqual(fs.existsSync(packageScriptPath), true, 'package_macos.sh must exist in scripts/');
    const stat = fs.statSync(packageScriptPath);
    // Mode should have executable permission
    assert.ok((stat.mode & 0o111) !== 0, 'package_macos.sh must be executable');

    const script = fs.readFileSync(packageScriptPath, 'utf8');
    assert.match(script, /TuneFlow\.app/, 'Must assemble TuneFlow.app');
    assert.match(script, /ln -s \/Applications/, 'Must create Applications symlink for drag-to-install');
    assert.match(script, /hdiutil create/, 'Must invoke hdiutil create');
    assert.match(script, /-format UDZO/, 'Must use compressed UDZO DMG format');
  });

  it('should verify release.yml contains macos-desktop-build job with macos-latest runner', () => {
    const releaseYml = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8');
    assert.match(releaseYml, /macos-desktop-build:/);
    assert.match(releaseYml, /runs-on:\s*macos-latest/);
    assert.match(releaseYml, /package_macos\.sh/);
    assert.match(releaseYml, /tuneflow-macos-artifacts/);
    assert.match(releaseYml, /release-assets\/\*\.dmg/);
  });
});
