const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Issue #90: Unified 3-Stage Remote CI/CD & Android Packaging Suite', () => {
  const rootDir = path.join(__dirname, '..');
  const releaseYmlPath = path.join(rootDir, '.github/workflows/release.yml');
  const androidYmlPath = path.join(rootDir, '.github/workflows/android.yml');
  const packageJsonPath = path.join(rootDir, 'package.json');
  const manifestXmlPath = path.join(rootDir, 'android/app/src/main/AndroidManifest.xml');
  const appBuildGradlePath = path.join(rootDir, 'android/app/build.gradle');

  it('should verify package.json is synchronized to version 2.4.3', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    assert.strictEqual(pkg.version, '2.4.3', 'package.json version must be 2.4.3');
  });

  it('should verify obsolete standalone android.yml is removed to prevent race conditions', () => {
    assert.strictEqual(fs.existsSync(androidYmlPath), false,
      'Standalone android.yml must not exist; release logic is unified in release.yml');
  });

  it('should verify release.yml contains 3-stage lifecycle jobs with strict dependency hierarchy', () => {
    assert.strictEqual(fs.existsSync(releaseYmlPath), true, 'release.yml must exist');
    const content = fs.readFileSync(releaseYmlPath, 'utf8');

    // Stage 0: Pre-Flight Test Gate
    assert.match(content, /test-gate:\s*\n\s*name:/, 'Must contain test-gate job');
    assert.match(content, /npm test/, 'test-gate must execute full test suite');

    // Stage 1: Container Image
    assert.match(content, /container-image:\s*\n\s*name:/, 'Must contain container-image job');
    assert.match(content, /needs:\s*test-gate/, 'container-image must depend on test-gate');
    assert.match(content, /platforms:\s*linux\/amd64,linux\/arm64/, 'Must build multi-arch container');
    assert.match(content, /ghcr\.io\/\$\{\{\s*github\.repository\s*\}\}/, 'Must publish to GHCR');

    // Stage 2: Android APK
    assert.match(content, /apk-build:\s*\n\s*name:/, 'Must contain apk-build job');
    assert.match(content, /needs:\s*test-gate/, 'apk-build must depend on test-gate');
    assert.match(content, /android-actions\/setup-android/, 'Must set up Android SDK');
    assert.match(content, /apksigner/, 'Must sign APK with apksigner or jarsigner');
    assert.match(content, /SHA256SUMS\.txt/, 'Must generate SHA-256 checksums manifest');

    // Stage 3: Unified GitHub Release
    assert.match(content, /github-release:\s*\n\s*name:/, 'Must contain github-release job');
    assert.match(content, /needs:\s*\[.*container-image.*apk-build.*\]/,
      'github-release must depend on both container-image and apk-build completing first');
    assert.match(content, /softprops\/action-gh-release/, 'Must publish release via action-gh-release');
    assert.match(content, /release-assets\/\*\.apk/, 'Release must attach all compiled APKs');
    assert.match(content, /release-assets\/SHA256SUMS\.txt/, 'Release must attach SHA256 checksums');
  });

  it('should verify Android Manifest declares both Touchscreen Mobile and Leanback TV support', () => {
    assert.strictEqual(fs.existsSync(manifestXmlPath), true, 'AndroidManifest.xml must exist');
    const xml = fs.readFileSync(manifestXmlPath, 'utf8');

    assert.match(xml, /android:name="android\.hardware\.touchscreen"\s+android:required="false"/,
      'Touchscreen must be optional for Android TV support');
    assert.match(xml, /android:name="android\.software\.leanback"\s+android:required="false"/,
      'Leanback must be optional for Smartphone support');
    assert.match(xml, /android\.intent\.category\.LAUNCHER/, 'Must support standard Mobile launcher');
    assert.match(xml, /android\.intent\.category\.LEANBACK_LAUNCHER/, 'Must support Android TV Leanback launcher');
  });

  it('should verify android/app/build.gradle configures mobile and tv product flavors', () => {
    assert.strictEqual(fs.existsSync(appBuildGradlePath), true, 'app/build.gradle must exist');
    const gradle = fs.readFileSync(appBuildGradlePath, 'utf8');

    assert.match(gradle, /productFlavors\s*\{/, 'Must define product flavors');
    assert.match(gradle, /mobile\s*\{/, 'Must define mobile flavor');
    assert.match(gradle, /tv\s*\{/, 'Must define tv flavor');
  });
});
