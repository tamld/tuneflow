const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Issue #146 & Directive D-02: Android Zero-Typing QR Pairing & Tunnel URL Removal', () => {
  const rootDir = path.join(__dirname, '..');
  const mainActivityPath = path.join(rootDir, 'android/app/src/main/java/com/tamld/tuneflow/MainActivity.java');
  const manifestPath = path.join(rootDir, 'android/app/src/main/AndroidManifest.xml');
  const guideEnPath = path.join(rootDir, 'docs/USER_GUIDE.md');
  const guideViPath = path.join(rootDir, 'docs/USER_GUIDE.vi.md');

  it('Directive D-02: MainActivity.java must not contain hardcoded trycloudflare.com URLs', () => {
    const javaSource = fs.readFileSync(mainActivityPath, 'utf8');
    assert.ok(
      !javaSource.includes('trycloudflare.com'),
      'D-02 violation: MainActivity.java must not hardcode ephemeral trycloudflare.com URLs'
    );
  });

  it('Issue #146: MainActivity.java persists server_url in SharedPreferences and provides Quét mã ghép nối QR scanner flow', () => {
    const javaSource = fs.readFileSync(mainActivityPath, 'utf8');
    assert.match(javaSource, /SharedPreferences/, 'Must use SharedPreferences for server_url persistence');
    assert.match(javaSource, /"tuneflow_prefs"/, 'Must use tuneflow_prefs store');
    assert.match(javaSource, /"server_url"/, 'Must store server_url key');
    assert.match(javaSource, /Quét mã ghép nối/, 'Must provide elderly-friendly "Quét mã ghép nối" zero-typing QR button on phone');
    assert.match(javaSource, /launchQrScanner/, 'Must implement QR scanner intent launcher');
    assert.match(javaSource, /KEYCODE_MENU/, 'Must preserve MENU key fallback for manual entry on Android TV');
    assert.match(javaSource, /showServerSetupDialog/, 'Must provide manual entry fallback dialog');
  });

  it('Issue #146: AndroidManifest.xml registers tuneflow://pair deep-link intent filter', () => {
    const xml = fs.readFileSync(manifestPath, 'utf8');
    assert.match(xml, /android:scheme="tuneflow"/, 'Must declare tuneflow:// scheme');
    assert.match(xml, /android:host="pair"/, 'Must declare pair host');
  });

  it('Issue #146: USER_GUIDE.md and USER_GUIDE.vi.md document QR pairing and TV MENU fallback', () => {
    const guideEn = fs.readFileSync(guideEnPath, 'utf8');
    const guideVi = fs.readFileSync(guideViPath, 'utf8');

    assert.match(guideEn, /Quét mã ghép nối|Scan Pairing QR/, 'English guide must document QR pairing button');
    assert.match(guideEn, /\/api\/system\/pairing-qr/, 'English guide must reference contract pairing endpoint');
    assert.match(guideEn, /MENU/, 'English guide must document TV MENU fallback');

    assert.match(guideVi, /Quét mã ghép nối/, 'Vietnamese guide must document "Quét mã ghép nối" button');
    assert.match(guideVi, /\/api\/system\/pairing-qr/, 'Vietnamese guide must reference contract pairing endpoint');
    assert.match(guideVi, /MENU/, 'Vietnamese guide must document TV MENU fallback');
  });
});
