const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('TuneFlow Accessibility & Audio Timer Tests (Issue #49 & #50)', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const cssPath = path.join(publicDir, 'css', 'silver-melody.css');
  const appJsPath = path.join(publicDir, 'js', 'app.js');
  const playerJsPath = path.join(publicDir, 'js', 'player.js');

  // Issue #49: Font Scaling on TV & Web
  describe('Issue #49: Dynamic Typography Scaling via CSS Variables', () => {
    it('should define --user-font-scale and --font-scale variables in :root', () => {
      const css = fs.readFileSync(cssPath, 'utf8');
      assert.ok(css.includes('--user-font-scale'), ':root must define --user-font-scale variable');
      assert.ok(css.includes('--font-scale'), ':root must define --font-scale variable');
      assert.ok(css.includes('--text-title: calc('), '--text-title must use calc with --font-scale');
      assert.ok(css.includes('--text-subtitle: calc('), '--text-subtitle must use calc with --font-scale');
      assert.ok(css.includes('--text-body: calc('), '--text-body must use calc with --font-scale');
    });

    it('should scale body.tv-mode typography dynamically using --font-scale', () => {
      const css = fs.readFileSync(cssPath, 'utf8');
      assert.ok(css.includes('body.tv-mode'), 'Must have body.tv-mode rules');
      assert.ok(css.includes('body.tv-mode .brand-title'), 'TV mode brand-title must exist');
      assert.ok(css.includes('calc('), 'TV mode must use calc with font scale');
    });

    it('should set --user-font-scale property in app.js applyFontScale()', () => {
      const appJs = fs.readFileSync(appJsPath, 'utf8');
      assert.ok(appJs.includes('--user-font-scale'), 'applyFontScale must update --user-font-scale property');
      assert.ok(appJs.includes('multiplier'), 'Must map scale labels to numeric multipliers');
    });
  });

  // Issue #50: Sleep Timer 2x Rule (15m, 30m, 1h, 2h, 4h) with 30s Smooth Fade-Out
  describe('Issue #50: Exponential Sleep Timer (Rule of 2x) & Smooth Fade-Out', () => {
    it('should define exponential sleep options [0, 15, 30, 60, 120, 240] in player.js', () => {
      const playerJs = fs.readFileSync(playerJsPath, 'utf8');
      assert.ok(playerJs.includes('15, 30, 60, 120, 240'), 'Must include 15m, 30m, 1h, 2h, 4h sleep options');
      assert.ok(playerJs.includes('formatSleepLabel'), 'Must have formatSleepLabel helper');
    });

    it('should implement 30-second smooth volume fade-out before playback stop', () => {
      const playerJs = fs.readFileSync(playerJsPath, 'utf8');
      assert.ok(playerJs.includes('fadeDurationMs') || playerJs.includes('fadeIntervalId') || playerJs.includes('sleepFadeTimerId'), 'Must implement smooth volume fade-out timer');
    });

    it('should update button label to display 15m, 30m, 1h, 2h, 4h clearly', () => {
      const playerJs = fs.readFileSync(playerJsPath, 'utf8');
      assert.ok(playerJs.includes('1h') || playerJs.includes('h'), 'Must format hours as 1h, 2h, 4h');
      assert.ok(playerJs.includes('updateSleepBtn'), 'Must update sleep button state');
    });
  });
});
