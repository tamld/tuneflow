const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('TuneFlow Phase 6: Browser Extension MV3 & Compliance Suite', () => {
  const extensionDir = path.join(__dirname, '..', 'extension');
  const manifestPath = path.join(extensionDir, 'manifest.json');

  it('should verify manifest.json exists and adheres to Manifest V3 schema', () => {
    assert.ok(fs.existsSync(manifestPath), 'extension/manifest.json must exist');
    const content = fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, '');
    const manifest = JSON.parse(content);

    assert.strictEqual(manifest.manifest_version, 3, 'Must be Manifest V3');
    assert.strictEqual(typeof manifest.name, 'string');
    assert.strictEqual(typeof manifest.version, 'string');
    assert.ok(Array.isArray(manifest.permissions));
    assert.ok(Array.isArray(manifest.host_permissions));
  });

  it('should enforce zero-intrusive permissions for Chrome Web Store compliance', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));

    // Verify no invasive permissions like <all_urls>, cookies, or webRequest
    const forbiddenPerms = ['<all_urls>', 'cookies', 'webRequest', 'webRequestBlocking', 'debugger'];
    for (const perm of forbiddenPerms) {
      assert.strictEqual(manifest.permissions.includes(perm), false, `Forbidden permission requested: ${perm}`);
      assert.strictEqual(manifest.host_permissions.includes(perm), false, `Forbidden host permission requested: ${perm}`);
    }

    // Required minimal permissions
    assert.ok(manifest.permissions.includes('storage'));
    assert.ok(manifest.permissions.includes('notifications'));
  });

  it('should verify all referenced scripts, popups, and icons exist on disk', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));

    // Check background service worker
    assert.ok(manifest.background && manifest.background.service_worker);
    const bgPath = path.join(extensionDir, manifest.background.service_worker);
    assert.ok(fs.existsSync(bgPath), `Service worker missing: ${bgPath}`);

    // Check content scripts
    assert.ok(Array.isArray(manifest.content_scripts));
    for (const cs of manifest.content_scripts) {
      assert.ok(Array.isArray(cs.js));
      for (const jsFile of cs.js) {
        const jsPath = path.join(extensionDir, jsFile);
        assert.ok(fs.existsSync(jsPath), `Content script missing: ${jsPath}`);
      }
    }

    // Check popup
    assert.ok(manifest.action && manifest.action.default_popup);
    const popupPath = path.join(extensionDir, manifest.action.default_popup);
    assert.ok(fs.existsSync(popupPath), `Popup HTML missing: ${popupPath}`);
    assert.ok(fs.existsSync(path.join(extensionDir, 'popup.js')), 'popup.js missing');
    assert.ok(fs.existsSync(path.join(extensionDir, 'popup.css')), 'popup.css missing');

    // Check icons
    assert.ok(manifest.icons);
    for (const size of ['16', '48', '128']) {
      if (manifest.icons[size]) {
        const iconPath = path.join(extensionDir, manifest.icons[size]);
        assert.ok(fs.existsSync(iconPath), `Icon ${size} missing: ${iconPath}`);
      }
    }
  });

  it('should verify LEGAL_COMPLIANCE.md exists and covers Fair Use and Safe Harbor', () => {
    const legalDocPath = path.join(__dirname, '..', 'docs', 'LEGAL_COMPLIANCE.md');
    assert.ok(fs.existsSync(legalDocPath), 'docs/LEGAL_COMPLIANCE.md must exist');
    const doc = fs.readFileSync(legalDocPath, 'utf8');

    assert.ok(doc.includes('MIT License'));
    assert.ok(doc.includes('Personal Fair Use'));
    assert.ok(doc.includes('DMCA Safe Harbor'));
    assert.ok(doc.includes('512'));
  });
});
