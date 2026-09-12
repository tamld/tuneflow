const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Elderly Visual Ergonomics, Header Declutter & Warm Cream Theme (Issue #133)', () => {
  const indexPath = path.join(__dirname, '../public/index.html');
  const cssPath = path.join(__dirname, '../public/css/silver-melody.css');
  const appJsPath = path.join(__dirname, '../public/js/app.js');
  const i18nJsPath = path.join(__dirname, '../public/js/i18n.js');

  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const appJs = fs.readFileSync(appJsPath, 'utf-8');
  const i18nJs = fs.readFileSync(i18nJsPath, 'utf-8');

  test('1. Streamlined header contains only primary controls for seniors', () => {
    const headerMatch = indexHtml.match(/<header[\s\S]*?<\/header>/i);
    assert.ok(headerMatch, 'Header element must exist');
    const headerHtml = headerMatch[0];

    // Primary senior controls MUST exist in header
    assert.ok(headerHtml.includes('id="btn-theme-toggle"'), 'Theme toggle must be present in header');
    assert.ok(headerHtml.includes('class="font-scale-group"'), 'Font scale group must be present in header');
    assert.ok(headerHtml.includes('id="btn-floating-queue"'), 'Floating queue trigger must be present in header');
    assert.ok(headerHtml.includes('id="btn-help"'), 'Help button must be present in header');
    assert.ok(headerHtml.includes('id="btn-settings-trigger"'), 'Settings trigger button must be present in header');

    // Secondary technical controls MUST NOT be directly in header
    assert.ok(!headerHtml.includes('id="btn-admin-panel-trigger"'), 'Admin trigger must be moved out of direct header');
    assert.ok(!headerHtml.includes('id="btn-auth-status"'), 'Auth status button must be moved out of direct header');
    assert.ok(!headerHtml.includes('id="btn-lang-toggle"'), 'Language toggle must be moved out of direct header');
    assert.ok(!headerHtml.includes('id="btn-toggle-tv"'), 'TV mode toggle must be moved out of direct header');
    assert.ok(!headerHtml.includes('id="btn-server-endpoint-trigger"'), 'Server config trigger must be moved out of direct header');
  });

  test('2. Unified Settings Modal (#modal-settings) preserves all relocated controls and IDs', () => {
    const modalMatch = indexHtml.match(/<div[^>]*id="modal-settings"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i);
    assert.ok(modalMatch, '#modal-settings element must exist');
    const modalHtml = modalMatch[0];

    // Verify all preserved IDs for existing automated test suites and features
    assert.ok(modalHtml.includes('id="btn-settings-close"'), 'Settings close button must exist');
    assert.ok(modalHtml.includes('id="btn-lang-toggle"'), 'btn-lang-toggle must exist in modal');
    assert.ok(modalHtml.includes('id="btn-toggle-tv"'), 'btn-toggle-tv must exist in modal');
    assert.ok(modalHtml.includes('id="btn-install-pwa"'), 'btn-install-pwa must exist in modal');
    assert.ok(modalHtml.includes('id="btn-server-endpoint-trigger"'), 'btn-server-endpoint-trigger must exist in modal');
    assert.ok(modalHtml.includes('id="btn-auth-status"'), 'btn-auth-status must exist in modal');
    assert.ok(modalHtml.includes('id="btn-change-password-trigger"'), 'btn-change-password-trigger must exist in modal');
    assert.ok(modalHtml.includes('id="btn-admin-panel-trigger"'), 'btn-admin-panel-trigger must exist in modal');
  });

  test('3. Warm Cream Day Theme is declared in silver-melody.css with WCAG AAA contrast', () => {
    assert.ok(cssContent.includes(':root[data-theme="cream"]'), ':root[data-theme="cream"] must be defined');
    assert.ok(cssContent.includes('body.theme-cream'), 'body.theme-cream selector must be defined');
    assert.ok(cssContent.includes('--bg-main: #fcf9f2;'), 'Cream day background #fcf9f2 must be configured');
    assert.ok(cssContent.includes('--text-main: #14171f;'), 'High contrast dark text #14171f must be configured');
    assert.ok(cssContent.includes('body.theme-cream .theme-toggle-btn'), 'Theme toggle button cream styling must be defined');
    assert.ok(cssContent.includes('body.theme-cream .settings-trigger-btn'), 'Settings trigger button cream styling must be defined');
  });

  test('4. JavaScript wires theme toggle, modal settings, and song duration badge', () => {
    // Theme switching logic
    assert.ok(appJs.includes('function applyTheme(theme)'), 'applyTheme function must exist in app.js');
    assert.ok(appJs.includes('function initTheme()'), 'initTheme function must exist in app.js');
    assert.ok(appJs.includes('tuneflow_theme'), 'tuneflow_theme localStorage key must be used');

    // Settings modal open/close logic
    assert.ok(appJs.includes('function openSettingsModal()'), 'openSettingsModal must exist');
    assert.ok(appJs.includes('function closeSettingsModal()'), 'closeSettingsModal must exist');
    assert.ok(appJs.includes('btnSettingsTrigger.addEventListener'), 'btnSettingsTrigger must have event listener');
    assert.ok(appJs.includes('btnSettingsClose.addEventListener'), 'btnSettingsClose must have event listener');

    // Escape shortcut closes settings modal
    assert.ok(appJs.includes('closeSettingsModal();'), 'Escape handler must close settings modal');

    // Song duration badge inside song-uploader
    assert.ok(appJs.includes('song-duration-badge'), 'song-duration-badge class must be rendered in song card');
  });

  test('5. i18n localization includes settings and theme toggle translations', () => {
    assert.ok(i18nJs.includes('settings_btn_text'), 'settings_btn_text key must be defined in i18n');
    assert.ok(i18nJs.includes('settings_modal_title'), 'settings_modal_title key must be defined in i18n');
    assert.ok(i18nJs.includes('theme_day'), 'theme_day key must be defined in i18n');
    assert.ok(i18nJs.includes('theme_night'), 'theme_night key must be defined in i18n');
  });
});
