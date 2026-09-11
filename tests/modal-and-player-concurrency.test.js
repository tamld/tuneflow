const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Issue #99: Modal Overlay & Active Player Concurrency Suite', () => {
  const cssPath = path.join(__dirname, '../public/css/silver-melody.css');
  const htmlPath = path.join(__dirname, '../public/index.html');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  it('should verify CSS defines .modal-backdrop with fixed positioning and high z-index', () => {
    // Both .modal-overlay and .modal-backdrop must be defined with position: fixed and z-index >= 9999
    assert.match(cssContent, /\.modal-backdrop/, 'silver-melody.css must define .modal-backdrop');
    assert.match(cssContent, /\.modal-overlay\s*,\s*\.modal-backdrop|\.modal-backdrop\s*\{/, '.modal-backdrop must have explicit CSS rules');
    
    // Extract rule block for modal overlay / backdrop
    const modalRuleMatch = cssContent.match(/(\.modal-overlay[\s\S]*?\{[\s\S]*?\})/);
    assert.ok(modalRuleMatch, 'Must find modal overlay rule');
    const ruleText = modalRuleMatch[1];
    assert.match(ruleText, /position\s*:\s*fixed/);
    assert.match(ruleText, /z-index\s*:\s*(9999|[1-9]\d{4,})/);
    assert.match(ruleText, /display\s*:\s*flex/);
    assert.match(ruleText, /align-items\s*:\s*center/);
    assert.match(ruleText, /justify-content\s*:\s*center/);
  });

  it('should verify all auth and admin modals in index.html use modal-overlay or styled modal-backdrop', () => {
    const requiredModals = [
      'modal-auth-login',
      'modal-auth-change-password',
      'modal-guest-cooldown',
      'modal-admin-panel',
      'help-modal'
    ];

    for (const modalId of requiredModals) {
      const regex = new RegExp(`id="${modalId}"[^>]*class="([^"]*)"`);
      const match = htmlContent.match(regex);
      assert.ok(match, `Modal ${modalId} must exist in index.html`);
      const classes = match[1].split(/\s+/);
      const hasOverlayClass = classes.includes('modal-overlay') || classes.includes('modal-backdrop');
      assert.ok(hasOverlayClass, `Modal ${modalId} must have modal-overlay or modal-backdrop class`);
    }
  });

  it('should verify z-index hierarchy invariant: modals (z >= 9999) > bottom-player (z = 1000) > persona-hero (z = 100)', () => {
    const playerMatch = cssContent.match(/\.bottom-player\s*\{[\s\S]*?z-index\s*:\s*(\d+)/);
    assert.ok(playerMatch, 'Must find .bottom-player z-index');
    const playerZIndex = parseInt(playerMatch[1], 10);

    const modalMatch = cssContent.match(/\.modal-(?:overlay|backdrop)[\s\S]*?z-index\s*:\s*(\d+)/);
    assert.ok(modalMatch, 'Must find modal z-index');
    const modalZIndex = parseInt(modalMatch[1], 10);

    assert.ok(modalZIndex > playerZIndex, `Modal z-index (${modalZIndex}) must be strictly higher than bottom-player (${playerZIndex})`);
    assert.strictEqual(playerZIndex, 1000, 'Bottom player z-index invariant is 1000');
    assert.ok(modalZIndex >= 9999, 'Modal z-index invariant is >= 9999');
  });

  it('should verify keyboard shortcuts guard against all modal password and auth input fields', () => {
    const { isEditableElement, handleGlobalKeydown } = require('../public/js/app.js');

    const modalInputIds = [
      'input-change-old-password',
      'input-change-new-password',
      'input-change-confirm-password',
      'input-auth-username',
      'input-auth-password',
      'input-admin-new-username',
      'input-admin-new-password'
    ];

    for (const inputId of modalInputIds) {
      assert.ok(htmlContent.includes(`id="${inputId}"`), `${inputId} must exist in index.html`);
      
      // Test isEditableElement directly
      const mockEl = { tagName: 'INPUT', id: inputId };
      assert.strictEqual(isEditableElement(mockEl), true, `Input #${inputId} must be identified as editable`);

      // Test that handleGlobalKeydown ignores keyboard shortcuts
      let playTriggered = false;
      const mockPlayer = {
        togglePlayPause: () => { playTriggered = true; },
        seekAudio: () => { playTriggered = true; },
        adjustVolume: () => { playTriggered = true; },
        toggleMute: () => { playTriggered = true; }
      };

      const keys = [' ', 'k', 'm', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      for (const key of keys) {
        const handled = handleGlobalKeydown({ key, target: mockEl, preventDefault: () => {} }, mockPlayer);
        assert.strictEqual(handled, false, `Shortcut '${key}' must NOT be handled when focused in #${inputId}`);
        assert.strictEqual(playTriggered, false, `Player action must NOT fire when focused in #${inputId}`);
      }
    }
  });

  it('should verify Change Password Modal lifecycle methods in auth.js', () => {
    const authJsPath = path.join(__dirname, '../public/js/auth.js');
    const authJs = fs.readFileSync(authJsPath, 'utf8');

    assert.match(authJs, /openChangePasswordModal\s*\(\)\s*\{/, 'auth.js must define openChangePasswordModal()');
    assert.match(authJs, /closeChangePasswordModal\s*\(\)\s*\{/, 'auth.js must define closeChangePasswordModal()');
    assert.match(authJs, /this\.modalChangePassword\.style\.display\s*=\s*'flex'/, 'openChangePasswordModal must set display to flex');
    assert.match(authJs, /this\.modalChangePassword\.style\.display\s*=\s*'none'/, 'closeChangePasswordModal must set display to none');
  });

  it('should verify Login Modal lifecycle methods in auth.js', () => {
    const authJsPath = path.join(__dirname, '../public/js/auth.js');
    const authJs = fs.readFileSync(authJsPath, 'utf8');

    assert.match(authJs, /openLoginModal\s*\([^)]*\)\s*\{/, 'auth.js must define openLoginModal()');
    assert.match(authJs, /closeLoginModal\s*\(\)\s*\{/, 'auth.js must define closeLoginModal()');
    assert.match(authJs, /this\.modalLogin\.style\.display\s*=\s*'flex'/, 'openLoginModal must set display to flex');
    assert.match(authJs, /this\.modalLogin\.style\.display\s*=\s*'none'/, 'closeLoginModal must set display to none');
  });

  it('should verify Guest Cooldown Modal lifecycle methods in auth.js', () => {
    const authJsPath = path.join(__dirname, '../public/js/auth.js');
    const authJs = fs.readFileSync(authJsPath, 'utf8');

    assert.match(authJs, /openCooldownModal\s*\([^)]*\)\s*\{/, 'auth.js must define openCooldownModal()');
    assert.match(authJs, /closeCooldownModal\s*\(\)\s*\{/, 'auth.js must define closeCooldownModal()');
    assert.match(authJs, /this\.modalCooldown\.style\.display\s*=\s*'flex'/, 'openCooldownModal must set display to flex');
    assert.match(authJs, /this\.modalCooldown\.style\.display\s*=\s*'none'/, 'closeCooldownModal must set display to none');
  });

  it('should verify Admin Panel Modal lifecycle methods in admin.js', () => {
    const adminJsPath = path.join(__dirname, '../public/js/admin.js');
    const adminJs = fs.readFileSync(adminJsPath, 'utf8');

    assert.match(adminJs, /open\s*\([^)]*\)\s*\{/, 'admin.js must define open()');
    assert.match(adminJs, /close\s*\([^)]*\)\s*\{/, 'admin.js must define close()');
    assert.match(adminJs, /this\.modal\.style\.display\s*=\s*'flex'/, 'open must set display to flex');
    assert.match(adminJs, /this\.modal\.style\.display\s*=\s*'none'/, 'close must set display to none');
  });
});
