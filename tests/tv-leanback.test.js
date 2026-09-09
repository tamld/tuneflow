const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('TuneFlow Phase 7: Android TV D-Pad Leanback & Mobile Audio Ecosystem', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const tvScriptPath = path.join(publicDir, 'js', 'tv-leanback.js');
  const htmlPath = path.join(publicDir, 'index.html');
  const cssPath = path.join(publicDir, 'css', 'silver-melody.css');
  const i18nPath = path.join(publicDir, 'js', 'i18n.js');

  it('should verify tv-leanback.js exists and exports clean spatial navigation module', () => {
    assert.ok(fs.existsSync(tvScriptPath), 'public/js/tv-leanback.js must exist');
    const content = fs.readFileSync(tvScriptPath, 'utf8');

    assert.ok(content.includes('TVLeanbackEngine') || content.includes('tvLeanback'), 'Must define TVLeanbackEngine');
    assert.ok(content.includes('ArrowUp'), 'Must handle ArrowUp');
    assert.ok(content.includes('ArrowDown'), 'Must handle ArrowDown');
    assert.ok(content.includes('ArrowLeft'), 'Must handle ArrowLeft');
    assert.ok(content.includes('ArrowRight'), 'Must handle ArrowRight');
    assert.ok(content.includes('Enter'), 'Must handle Enter');
    assert.ok(content.includes('Escape'), 'Must handle Escape');
  });

  it('should verify HTML includes TV mode button and ambient overlay container', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(html.includes('btn-toggle-tv') || html.includes('id="btn-tv-mode"'), 'Must have TV mode toggle button in header');
    assert.ok(html.includes('tv-ambient-player') || html.includes('id="ambient-player"'), 'Must have Ambient Player overlay markup');
    assert.ok(html.includes('js/tv-leanback.js'), 'Must load tv-leanback.js script');
  });

  it('should verify CSS contains WCAG AAA 10-foot Leanback styles and focused-tv state', () => {
    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('.focused-tv'), 'CSS must define .focused-tv focus ring');
    assert.ok(css.includes('--accent-gold'), 'Focus ring must use --accent-gold');
    assert.ok(css.includes('scale'), 'Focus ring must have scale transform for 3-meter visibility');
    assert.ok(css.includes('.tv-mode'), 'CSS must define .tv-mode scoped layout adjustments');
    assert.ok(css.includes('tv-ambient-player') || css.includes('#ambient-player'), 'CSS must style ambient player');
  });

  it('should verify i18n contains localized strings for TV mode and ambient player', () => {
    const i18n = fs.readFileSync(i18nPath, 'utf8');

    assert.ok(i18n.includes('tv_mode') || i18n.includes('tvMode'), 'i18n must include tv_mode');
    assert.ok(i18n.includes('ambient_mode') || i18n.includes('ambientPlayer'), 'i18n must include ambient mode string');
  });

  it('should verify SpatialNavigation keycode and spatial math logic', () => {
    const content = fs.readFileSync(tvScriptPath, 'utf8');
    assert.ok(content.includes('focused-tv'), 'Engine must toggle focused-tv class');
    assert.ok(content.includes('scrollIntoView'), 'Engine must scroll focused elements into view smoothly');
  });

  it('should verify TVLeanbackEngine class instantiation and state machine defaults', () => {
    const { TVLeanbackEngine } = require('../public/js/tv-leanback.js');
    assert.ok(TVLeanbackEngine, 'TVLeanbackEngine must be exportable in CommonJS');

    const engine = new TVLeanbackEngine();
    assert.strictEqual(engine.isTVMode, false);
    assert.strictEqual(engine.isAmbientOpen, false);
    assert.strictEqual(engine.currentFocusElement, null);
    assert.deepStrictEqual(engine.spatialZones, ['header', 'search', 'categories', 'results', 'player']);
    assert.strictEqual(engine.currentZoneIndex, 1);
  });

  it('should guard spatial navigation boundary limits (no crash on out-of-bound indexes)', () => {
    const { TVLeanbackEngine } = require('../public/js/tv-leanback.js');
    const engine = new TVLeanbackEngine();

    // Mock zone getter to return empty arrays
    engine.getZoneElements = () => [];

    // Attempt moving UP from index 0
    engine.currentZoneIndex = 0;
    engine.navigateSpatial('up');
    assert.strictEqual(engine.currentZoneIndex, 0, 'Cannot navigate up past zone 0');

    // Attempt moving DOWN past last zone
    engine.currentZoneIndex = engine.spatialZones.length - 1;
    engine.navigateSpatial('down');
    assert.strictEqual(engine.currentZoneIndex, engine.spatialZones.length - 1, 'Cannot navigate down past max zone');
  });

  it('should manage setFocus correctly with fallback when scrollIntoView throws or is missing', () => {
    const { TVLeanbackEngine } = require('../public/js/tv-leanback.js');
    const engine = new TVLeanbackEngine();

    const mockClassList = new Set();
    const mockEl = {
      classList: {
        add: (c) => mockClassList.add(c),
        remove: (c) => mockClassList.delete(c)
      },
      focus: () => {},
      scrollIntoView: () => {
        throw new Error('scrollIntoView not supported in mock');
      }
    };

    assert.doesNotThrow(() => {
      engine.setFocus(mockEl);
    });
    assert.strictEqual(engine.currentFocusElement, mockEl);
    assert.ok(mockClassList.has('focused-tv'), 'Element must have focused-tv class');
  });
});
