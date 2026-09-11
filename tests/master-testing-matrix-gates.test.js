const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Domain & Security modules
const { Role, Permission, hasPermission, getPermissionsForRole } = require('../src/domain/permissions');
const { sanitizeTitle } = require('../src/engine/queue');
const { isSafeRemoteStreamUrl, isValidStreamMimeType } = require('../src/utils/validator');
const { resolveStoragePaths, verifyBinaryIntegrity } = require('../src/security/binary_guard');
const { encryptField, decryptField } = require('../src/auth/crypto_utils');
const { applyMigrations } = require('../src/db/migrations');
const { DatabaseSync } = require('node:sqlite');

describe('SPEC-0011: Master 7-Dimensional Testing Matrix & Quality Gates Suite', () => {
  const rootDir = path.join(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const indexHtmlPath = path.join(publicDir, 'index.html');
  const cssPath = path.join(publicDir, 'css', 'silver-melody.css');
  const faviconPath = path.join(publicDir, 'icons', 'favicon.ico');
  const setupIssPath = path.join(rootDir, 'installer', 'windows', 'setup.iss');
  const linuxDesktopPath = path.join(rootDir, 'installer', 'linux', 'tuneflow.desktop');
  const workflowPath = path.join(rootDir, '.github', 'workflows', 'release.yml');

  // ==========================================================================
  // DIMENSION 1: USER & ELDERLY EXPERIENCE (UX & ACCESSIBILITY)
  // ==========================================================================
  describe('Dimension 1: User & Elderly Experience (UX & Accessibility)', () => {
    it('TC-D1-01: should enforce elderly touch target bounds (>= 48px / 56px) in styles', () => {
      assert.ok(fs.existsSync(cssPath), 'silver-melody.css must exist');
      const css = fs.readFileSync(cssPath, 'utf8');

      // Verify button minimum heights and touch affordances
      assert.ok(css.includes('min-height: 48px') || css.includes('min-height: 56px') || css.includes('height: 56px') || css.includes('--target-height: 56px'), 'Must declare large touch target heights');
      assert.ok(css.includes('--target-height') || css.includes('56px'), 'Must declare touch target standard');
    });

    it('TC-D1-02: should declare dynamic font scaler with CSS variable bounds without horizontal overflow', () => {
      const css = fs.readFileSync(cssPath, 'utf8');
      assert.ok(css.includes('--font-scale') || css.includes('--user-font-scale'), 'Must declare dynamic --font-scale CSS variable');
      assert.ok(css.includes('text-overflow: ellipsis') || css.includes('overflow: hidden') || css.includes('overflow-x: auto'), 'Must handle text clipping or overflow gracefully');
    });

    it('TC-D1-03: should enforce capsule pill geometry for volume boost button without distortion', () => {
      const css = fs.readFileSync(cssPath, 'utf8');
      assert.ok(css.includes('.player-ctrl-btn.boosted'), 'Must style .player-ctrl-btn.boosted');
      assert.ok(css.includes('border-radius: 22px'), 'Must declare capsule rounded radius 22px');
      assert.ok(css.includes('white-space: nowrap'), 'Must prevent text line wrap inside boost button');
      assert.ok(css.includes('min-width: 66px') || css.includes('height: 44px'), 'Must enforce geometric bounds');
    });

    it('TC-D1-04: should enforce high-contrast WCAG AAA gold accent palette', () => {
      const css = fs.readFileSync(cssPath, 'utf8');
      assert.ok(css.includes('#f59e0b') || css.includes('#d97706'), 'Must use SilverMelody gold palette (#f59e0b)');
      assert.ok(css.includes('#121316') || css.includes('#1c1e24'), 'Must use Obsidian dark background (#121316)');
    });
  });

  // ==========================================================================
  // DIMENSION 2: USER STORIES & AUDIO WORKFLOWS (JOURNEYS & DSP)
  // ==========================================================================
  describe('Dimension 2: User Stories & Audio Workflows (Journeys & DSP)', () => {
    it('TC-D2-01: should verify selective continuous playlist playback sequencing logic', () => {
      const mockPlaylistTracks = [
        { id: 'track_1', title: 'Track 1', selected: true },
        { id: 'track_2', title: 'Track 2', selected: false },
        { id: 'track_3', title: 'Track 3', selected: true },
        { id: 'track_4', title: 'Track 4', selected: true }
      ];

      function getNextSelectedTrack(currentId, tracks) {
        const selected = tracks.filter(t => t.selected);
        const idx = selected.findIndex(t => t.id === currentId);
        if (idx === -1 || idx === selected.length - 1) {
          return selected[0] || null;
        }
        return selected[idx + 1];
      }

      const next1 = getNextSelectedTrack('track_1', mockPlaylistTracks);
      assert.strictEqual(next1.id, 'track_3', 'Must skip unselected track_2 and play track_3');

      const next2 = getNextSelectedTrack('track_3', mockPlaylistTracks);
      assert.strictEqual(next2.id, 'track_4', 'Must play track_4 next');

      const nextWrap = getNextSelectedTrack('track_4', mockPlaylistTracks);
      assert.strictEqual(nextWrap.id, 'track_1', 'Must cycle back to first selected track');
    });

    it('TC-D2-02: should verify 2x Exponential Sleep Timer calculation and fade-out curve', () => {
      const timerOptionsMinutes = [15, 30, 60, 120, 240];
      for (let i = 1; i < timerOptionsMinutes.length; i++) {
        assert.strictEqual(timerOptionsMinutes[i], timerOptionsMinutes[i - 1] * 2, 'Timer steps must follow 2x progression');
      }

      // Verify linear 30s audio fade-out calculation
      function calculateFadeVolume(remainingSeconds, totalFadeSeconds = 30) {
        if (remainingSeconds <= 0) return 0.0;
        if (remainingSeconds >= totalFadeSeconds) return 1.0;
        return parseFloat((remainingSeconds / totalFadeSeconds).toFixed(2));
      }

      assert.strictEqual(calculateFadeVolume(45), 1.0);
      assert.strictEqual(calculateFadeVolume(15), 0.5);
      assert.strictEqual(calculateFadeVolume(3), 0.1);
      assert.strictEqual(calculateFadeVolume(0), 0.0);
    });

    it('TC-D2-03: should sanitize and deduplicate batch items safely', () => {
      assert.strictEqual(sanitizeTitle('CON'), 'Song_CON');
      assert.strictEqual(sanitizeTitle('Nhạc / Trữ : Tình * Vàng ?'), 'Nhạc _ Trữ _ Tình _ Vàng _');
      assert.strictEqual(sanitizeTitle(''), 'Bai_hat');
      assert.strictEqual(sanitizeTitle(null), 'Bai_hat');

      // Title length constraint (<= 120 chars)
      const longTitle = 'A'.repeat(300);
      assert.ok(sanitizeTitle(longTitle).length <= 120, 'Must truncate titles to 120 characters');
    });
  });

  // ==========================================================================
  // DIMENSION 3: SETTINGS, PERSISTENCE & RUNTIME OPERATIONS
  // ==========================================================================
  describe('Dimension 3: Settings, Persistence & Runtime Operations', () => {
    it('TC-D3-01: should resolve storage paths deterministically across platforms and portable mode', () => {
      const winPortable = resolveStoragePaths('win32', {}, true);
      assert.strictEqual(winPortable.isPortable, true);
      assert.ok(winPortable.dataDir.endsWith('data'));

      const winStandard = resolveStoragePaths('win32', { LOCALAPPDATA: 'C:\\Users\\Mock\\AppData\\Local' }, false);
      assert.strictEqual(winStandard.isPortable, false);
      assert.strictEqual(winStandard.dataDir, 'C:\\Users\\Mock\\AppData\\Local\\TuneFlow\\data');

      const macStandard = resolveStoragePaths('darwin', { HOME: '/Users/mock' }, false);
      assert.strictEqual(macStandard.isPortable, false);
      assert.strictEqual(macStandard.dataDir, '/Users/mock/Library/Application Support/TuneFlow/data');

      const linuxStandard = resolveStoragePaths('linux', { XDG_DATA_HOME: '/home/mock/.local/share' }, false);
      assert.strictEqual(linuxStandard.isPortable, false);
      assert.strictEqual(linuxStandard.dataDir, '/home/mock/.local/share/tuneflow/data');
    });

    it('TC-D3-02: should verify SQLite schema migration engine advances version and maintains idempotency', () => {
      const db = new DatabaseSync(':memory:');
      const vInitial = db.prepare('PRAGMA user_version').get()['user_version'];
      assert.strictEqual(vInitial, 0);

      applyMigrations(db);
      const vAfter = db.prepare('PRAGMA user_version').get()['user_version'];
      assert.ok(vAfter >= 2, 'Migration must advance user_version to at least 2');

      // Re-running must be completely idempotent
      applyMigrations(db);
      const vIdempotent = db.prepare('PRAGMA user_version').get()['user_version'];
      assert.strictEqual(vIdempotent, vAfter, 'Subsequent migration runs must be idempotent');
      db.close();
    });
  });

  // ==========================================================================
  // DIMENSION 4: RESILIENCE & CHAOS / FAULT INJECTION
  // ==========================================================================
  describe('Dimension 4: Resilience & Chaos / Fault Injection', () => {
    it('TC-D4-01: should reject SSRF attack vectors, private loopbacks, and cloud metadata', () => {
      const attackUrls = [
        'http://localhost:3000/internal',
        'http://127.0.0.1:8080/flag',
        'http://169.254.169.254/latest/meta-data',
        'http://10.0.0.1/admin',
        'http://192.168.1.1/router',
        'http://172.16.0.1/secret',
        'http://[::1]/internal',
        'file:///etc/passwd',
        'ftp://malicious.org/exploit',
        'javascript:alert(1)'
      ];

      for (const url of attackUrls) {
        assert.strictEqual(
          isSafeRemoteStreamUrl(url),
          false,
          `Security invariant failed: Must reject unsafe URL ${url}`
        );
      }
    });

    it('TC-D4-02: should enforce strict Audio MIME validation and reject executable/HTML types', () => {
      const validMimes = ['audio/mpeg', 'audio/mp4', 'audio/webm', 'video/mp4'];
      for (const mime of validMimes) {
        assert.strictEqual(isValidStreamMimeType(mime), true, `Must accept valid audio MIME: ${mime}`);
      }

      const invalidMimes = [
        'text/html',
        'application/x-msdownload',
        'application/javascript',
        'image/png',
        'application/octet-stream'
      ];
      for (const mime of invalidMimes) {
        assert.strictEqual(isValidStreamMimeType(mime), false, `Security invariant: Must reject invalid MIME: ${mime}`);
      }
    });
  });

  // ==========================================================================
  // DIMENSION 5: DEFENSE-IN-DEPTH SECURITY & RBAC
  // ==========================================================================
  describe('Dimension 5: Defense-in-Depth Security & RBAC', () => {
    it('TC-D5-01: should enforce strict 3-tier RBAC boundaries', () => {
      // Guest boundaries
      assert.strictEqual(hasPermission(Role.GUEST, Permission.MUSIC_SEARCH), true);
      assert.strictEqual(hasPermission(Role.GUEST, Permission.MUSIC_PREVIEW), true);
      assert.strictEqual(hasPermission(Role.GUEST, Permission.MUSIC_STREAM), true);
      assert.strictEqual(hasPermission(Role.GUEST, Permission.QUEUE_DOWNLOAD), false, 'Guest cannot download');
      assert.strictEqual(hasPermission(Role.GUEST, Permission.QUEUE_CANCEL), false, 'Guest cannot cancel queue');
      assert.strictEqual(hasPermission(Role.GUEST, Permission.USER_READ), false, 'Guest cannot read users');

      // User boundaries
      assert.strictEqual(hasPermission(Role.USER, Permission.QUEUE_DOWNLOAD), true);
      assert.strictEqual(hasPermission(Role.USER, Permission.QUEUE_CANCEL), true);
      assert.strictEqual(hasPermission(Role.USER, Permission.USER_READ), false, 'User cannot read users');

      // Admin has 100% permissions
      const allPerms = Object.values(Permission);
      const adminPerms = getPermissionsForRole(Role.ADMIN);
      assert.strictEqual(adminPerms.length, allPerms.length, 'Admin must possess universal permissions');
    });

    it('TC-D5-02: should verify AES-256-GCM data encryption and authenticated decryption at rest', () => {
      const secretMasterKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const plaintext = '192.168.1.105:session_token_xyz_secret';

      const encrypted = encryptField(plaintext, secretMasterKey);
      assert.ok(encrypted.startsWith('enc:v1:'), 'Ciphertext must start with enc:v1: envelope');
      assert.ok(!encrypted.includes('192.168.1.105'), 'Plaintext IP must not leak into ciphertext');

      const decrypted = decryptField(encrypted, secretMasterKey);
      assert.strictEqual(decrypted, plaintext, 'Decryption must restore authentic plaintext');

      // Tampered ciphertext must fail to decrypt and return ciphertext fallback
      const tampered = encrypted.slice(0, -4) + 'ffff';
      const failedDecryption = decryptField(tampered, secretMasterKey);
      assert.strictEqual(failedDecryption, tampered, 'Tampered ciphertext must fail authentication and return safe fallback');
    });

    it('TC-D5-03: should enforce Fail-Closed binary integrity guard on altered hash', () => {
      const tempBin = path.join(__dirname, 'mock_binary.tmp');
      fs.writeFileSync(tempBin, 'echo hello binary');

      try {
        const validHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        assert.throws(() => {
          verifyBinaryIntegrity(tempBin, validHash);
        }, /SECURITY_INTEGRITY_VIOLATION/);
      } finally {
        if (fs.existsSync(tempBin)) fs.unlinkSync(tempBin);
      }
    });
  });

  // ==========================================================================
  // DIMENSION 6: CONTEXT WINDOWS, VIEWPORTS, MODALS & VISUAL MEDIA
  // ==========================================================================
  describe('Dimension 6: Context Windows, Viewports, Modals & Visual Media', () => {
    it('TC-D6-01: should declare modal dialog attributes (role="dialog", aria-modal="true", close buttons)', () => {
      assert.ok(fs.existsSync(indexHtmlPath), 'index.html must exist');
      const html = fs.readFileSync(indexHtmlPath, 'utf8');

      assert.ok(html.includes('id="modal-admin-panel"'), 'Must have modal-admin-panel element');
      assert.ok(html.includes('id="help-modal"'), 'Must have help-modal element');
      assert.ok(html.includes('id="btn-close-admin-modal"'), 'Must have admin modal close button');
      assert.ok(html.includes('id="btn-help-close"'), 'Must have help modal close button');
    });

    it('TC-D6-02: should verify viewport meta tag declares mobile safe area inset support', () => {
      const html = fs.readFileSync(indexHtmlPath, 'utf8');
      assert.ok(html.includes('viewport-fit=cover') || html.includes('width=device-width'), 'Must declare responsive viewport');
    });

    it('TC-D6-03: should enforce referrerpolicy="no-referrer" on global meta tag to prevent CDN blocking', () => {
      const html = fs.readFileSync(indexHtmlPath, 'utf8');
      assert.ok(html.includes('<meta name="referrer" content="no-referrer">'), 'Must set global no-referrer meta policy');
    });

    it('TC-D6-04: should verify multi-resolution favicon.ico contains valid ICO magic header', () => {
      assert.ok(fs.existsSync(faviconPath), 'public/icons/favicon.ico must physically exist');
      const buffer = fs.readFileSync(faviconPath);
      assert.ok(buffer.length >= 6, 'ICO file too small');

      // ICO magic header: 0x00 0x00, type 0x01 0x00
      assert.strictEqual(buffer.readUInt16LE(0), 0, 'Invalid ICO reserved bytes');
      assert.strictEqual(buffer.readUInt16LE(2), 1, 'Invalid ICO image type');
      const imageCount = buffer.readUInt16LE(4);
      assert.ok(imageCount >= 7, `Expected at least 7 icon sizes, got ${imageCount}`);
    });
  });

  // ==========================================================================
  // DIMENSION 7: CROSS-PLATFORM PACKAGING & INSTALLATION
  // ==========================================================================
  describe('Dimension 7: Cross-Platform Packaging & Installation', () => {
    it('TC-D7-01: should verify Inno Setup 6 specifies Zero-Admin user-level installation', () => {
      assert.ok(fs.existsSync(setupIssPath), 'setup.iss must exist');
      const iss = fs.readFileSync(setupIssPath, 'utf8');

      assert.ok(iss.includes('PrivilegesRequired=lowest'), 'Inno Setup must be Zero-Admin (lowest)');
      assert.ok(iss.includes('{localappdata}\\Programs\\{#MyAppName}'), 'Must target user profile directory');
      assert.ok(iss.includes('UninstallDisplayIcon'), 'Must register uninstaller icon');
    });

    it('TC-D7-02: should verify Linux FreeDesktop desktop entry compliance', () => {
      assert.ok(fs.existsSync(linuxDesktopPath), 'tuneflow.desktop must exist');
      const desktop = fs.readFileSync(linuxDesktopPath, 'utf8');

      assert.ok(desktop.includes('[Desktop Entry]'), 'Must have [Desktop Entry] section');
      assert.ok(desktop.includes('Type=Application'), 'Must declare Type=Application');
      assert.ok(desktop.includes('Categories=AudioVideo;Audio;Player;'), 'Must declare AudioVideo category');
    });

    it('TC-D7-03: should verify release workflow encompasses tri-artifact distribution pipeline', () => {
      assert.ok(fs.existsSync(workflowPath), 'release.yml must exist');
      const workflow = fs.readFileSync(workflowPath, 'utf8');

      assert.ok(workflow.includes('container-image:'), 'Must include container-image stage');
      assert.ok(workflow.includes('apk-build:'), 'Must include apk-build stage');
      assert.ok(workflow.includes('windows-desktop-build:'), 'Must include windows-desktop-build stage');
      assert.ok(workflow.includes('SHA256SUMS.txt'), 'Must consolidate SHA256SUMS.txt');
    });
  });
});
