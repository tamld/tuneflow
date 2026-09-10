const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('PWA Installability & Standalone Hardening Suite', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const manifestPath = path.join(publicDir, 'manifest.webmanifest');
  const swPath = path.join(publicDir, 'sw.js');
  const htmlPath = path.join(publicDir, 'index.html');
  const appJsPath = path.join(publicDir, 'js', 'app.js');
  const i18nPath = path.join(publicDir, 'js', 'i18n.js');

  it('should verify manifest.webmanifest satisfies Google PWA Installability Criteria', () => {
    assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist');
    const content = fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, '');
    const manifest = JSON.parse(content);

    assert.strictEqual(manifest.name, 'TuneFlow');
    assert.strictEqual(manifest.short_name, 'TuneFlow');
    assert.strictEqual(manifest.display, 'standalone');
    assert.strictEqual(manifest.start_url, '/');
    assert.strictEqual(manifest.scope, '/');
    assert.strictEqual(manifest.theme_color, '#f39c12');
    assert.strictEqual(manifest.background_color, '#0e1017');

    const has192 = manifest.icons.some(i => i.sizes === '192x192' && i.src.includes('192'));
    const has512 = manifest.icons.some(i => i.sizes === '512x512' && i.src.includes('512'));
    assert.ok(has192, 'Must include 192x192 icon');
    assert.ok(has512, 'Must include 512x512 icon');

    const hasMaskable = manifest.icons.some(i => i.purpose && i.purpose.includes('maskable'));
    assert.ok(hasMaskable, 'Must include maskable icon purpose for Android adaptive icons');
  });

  it('should verify index.html contains iOS & Android standalone meta tags', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(html.includes('rel="manifest"') || html.includes('manifest.webmanifest'), 'Must link manifest');
    assert.ok(html.includes('apple-touch-icon'), 'Must link apple-touch-icon for iOS Home Screen');
    assert.ok(html.includes('mobile-web-app-capable'), 'Must specify mobile-web-app-capable for Android Chrome standalone');
    assert.ok(html.includes('apple-mobile-web-app-capable'), 'Must specify apple-mobile-web-app-capable for iOS Safari');
    assert.ok(html.includes('apple-mobile-web-app-title'), 'Must specify apple-mobile-web-app-title');
  });

  it('should verify sw.js caches all critical static assets including admin.js', () => {
    const sw = fs.readFileSync(swPath, 'utf8');

    assert.ok(sw.includes('/js/admin.js'), 'sw.js STATIC_ASSETS must include /js/admin.js');
    assert.ok(sw.includes('/js/auth.js'), 'sw.js STATIC_ASSETS must include /js/auth.js');
    assert.ok(sw.includes('/js/player.js'), 'sw.js STATIC_ASSETS must include /js/player.js');
    assert.ok(sw.includes('/js/app.js'), 'sw.js STATIC_ASSETS must include /js/app.js');
    assert.ok(sw.includes('/js/tv-leanback.js'), 'sw.js STATIC_ASSETS must include /js/tv-leanback.js');
  });

  it('should verify in-app PWA install button exists in HTML and i18n', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(html.includes('id="btn-install-pwa"'), 'HTML must include #btn-install-pwa button');

    const i18n = fs.readFileSync(i18nPath, 'utf8');
    assert.ok(i18n.includes('install_app'), 'i18n must include install_app translation key');
  });

  it('should verify app.js handles beforeinstallprompt and appinstalled events', () => {
    const appJs = fs.readFileSync(appJsPath, 'utf8');

    assert.ok(appJs.includes('beforeinstallprompt'), 'app.js must listen to beforeinstallprompt event');
    assert.ok(appJs.includes('btn-install-pwa'), 'app.js must reference #btn-install-pwa');
    assert.ok(appJs.includes('appinstalled'), 'app.js must listen to appinstalled event');
  });
});
