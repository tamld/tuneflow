const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('TuneFlow Admin Control Panel UI & Operations Suite (Issue #71)', () => {
  const htmlPath = path.join(__dirname, '../public/index.html');
  const jsPath = path.join(__dirname, '../public/js/admin.js');
  const cssPath = path.join(__dirname, '../public/css/silver-melody.css');
  const authJsPath = path.join(__dirname, '../public/js/auth.js');

  it('should verify index.html includes Admin Control Panel modal and all tabs', () => {
    assert.ok(fs.existsSync(htmlPath), 'index.html must exist');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Modal container
    assert.ok(html.includes('id="modal-admin-panel"'), 'modal-admin-panel missing in HTML');
    assert.ok(html.includes('id="btn-close-admin-modal"'), 'btn-close-admin-modal missing in HTML');
    assert.ok(html.includes('id="btn-admin-logout"'), 'btn-admin-logout missing in HTML');

    // Tab buttons
    assert.ok(html.includes('data-tab="accounts"'), 'Accounts tab button missing');
    assert.ok(html.includes('data-tab="guests"'), 'Guests tab button missing');
    assert.ok(html.includes('data-tab="system"'), 'System tab button missing');

    // Tab content containers
    assert.ok(html.includes('id="admin-tab-accounts"'), 'admin-tab-accounts container missing');
    assert.ok(html.includes('id="admin-tab-guests"'), 'admin-tab-guests container missing');
    assert.ok(html.includes('id="admin-tab-system"'), 'admin-tab-system container missing');

    // Account creation form
    assert.ok(html.includes('id="form-admin-create-user"'), 'form-admin-create-user missing');
    assert.ok(html.includes('id="input-admin-new-username"'), 'input-admin-new-username missing');
    assert.ok(html.includes('id="input-admin-new-password"'), 'input-admin-new-password missing');
    assert.ok(html.includes('id="select-admin-new-role"'), 'select-admin-new-role missing');
    assert.ok(html.includes('id="admin-user-list-body"'), 'admin-user-list-body missing');

    // Guest & System elements
    assert.ok(html.includes('id="admin-guest-list-body"'), 'admin-guest-list-body missing');
    assert.ok(html.includes('id="admin-sys-node"'), 'admin-sys-node missing');
    assert.ok(html.includes('id="btn-admin-update-ytdlp"'), 'btn-admin-update-ytdlp missing');

    // Script tag inclusion
    assert.ok(html.includes('src="/js/admin.js"'), 'script /js/admin.js missing in HTML');
  });

  it('should verify admin.js exists and exports AdminPanel class', () => {
    assert.ok(fs.existsSync(jsPath), 'admin.js must exist');
    const js = fs.readFileSync(jsPath, 'utf8');

    assert.ok(js.includes('class AdminPanel'), 'AdminPanel class missing');
    assert.ok(js.includes('open()'), 'open method missing');
    assert.ok(js.includes('close()'), 'close method missing');
    assert.ok(js.includes('switchTab('), 'switchTab method missing');
    assert.ok(js.includes('loadUsers()'), 'loadUsers method missing');
    assert.ok(js.includes('handleCreateUser()'), 'handleCreateUser method missing');
    assert.ok(js.includes('handleDeleteUser('), 'handleDeleteUser method missing');
    assert.ok(js.includes('loadGuests()'), 'loadGuests method missing');
    assert.ok(js.includes('handleResetGuest('), 'handleResetGuest method missing');
    assert.ok(js.includes('loadSystemStatus()'), 'loadSystemStatus method missing');
    assert.ok(js.includes('handleUpdateYtdlp()'), 'handleUpdateYtdlp method missing');
    assert.ok(js.includes('window.adminPanel = new AdminPanel();'), 'Global window.adminPanel instantiation missing');
  });

  it('should verify silver-melody.css contains admin panel styles', () => {
    assert.ok(fs.existsSync(cssPath), 'silver-melody.css must exist');
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('.admin-tab-btn'), '.admin-tab-btn styling missing');
    assert.ok(css.includes('.admin-tab-btn.active'), '.admin-tab-btn.active styling missing');
  });

  it('should verify auth.js connects admin badge to open AdminPanel', () => {
    assert.ok(fs.existsSync(authJsPath), 'auth.js must exist');
    const authJs = fs.readFileSync(authJsPath, 'utf8');

    assert.ok(authJs.includes('window.adminPanel.open()'), 'auth.js must call window.adminPanel.open() when admin badge is clicked');
  });

  it('should verify index.html has prominent admin trigger button in header (Issue #76)', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(html.includes('id="btn-admin-panel-trigger"'), 'btn-admin-panel-trigger missing in HTML header');
    assert.ok(html.includes('id="admin-trigger-icon"'), 'admin-trigger-icon missing in HTML');
    assert.ok(html.includes('id="admin-trigger-text"'), 'admin-trigger-text missing in HTML');
    assert.ok(html.includes('id="auth-login-subtitle"'), 'auth-login-subtitle missing in login modal');
  });

  it('should verify auth.js handles dedicated admin trigger button and /admin route detection (Issue #76)', () => {
    const authJs = fs.readFileSync(authJsPath, 'utf8');
    assert.ok(authJs.includes('btnAdminTrigger'), 'auth.js must bind to btnAdminTrigger');
    assert.ok(authJs.includes("'/admin'"), "auth.js must check '/admin' route for deep linking");
    assert.ok(authJs.includes('updateAdminTriggerBtn'), 'auth.js must update admin trigger button state');
    assert.ok(authJs.includes('postLoginRedirect'), 'auth.js must support post-login redirect/open for admin');
  });

  it('should verify admin.js handles history pushState and popstate on /admin route (Issue #76)', () => {
    const js = fs.readFileSync(jsPath, 'utf8');
    assert.ok(js.includes("'/admin'"), "admin.js must reference '/admin' route");
    assert.ok(js.includes('pushState'), 'admin.js must sync URL via history.pushState');
    assert.ok(js.includes('popstate'), 'admin.js must handle popstate browser navigation');
  });

  it('should verify silver-melody.css includes high-contrast admin trigger styling (Issue #76)', () => {
    const css = fs.readFileSync(cssPath, 'utf8');
    assert.ok(css.includes('.admin-panel-trigger-btn'), '.admin-panel-trigger-btn styling missing in CSS');
    assert.ok(css.includes('.admin-panel-trigger-btn.admin-active'), '.admin-active styling missing in CSS');
  });
});

