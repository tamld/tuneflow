const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Issue #97: Senior Desktop Keyboard Navigation & Shortcuts Suite', () => {
  const appJsPath = path.join(__dirname, '../public/js/app.js');
  const playerJsPath = path.join(__dirname, '../public/js/player.js');

  it('should verify public/js/app.js exports isEditableElement and handleGlobalKeydown', () => {
    const appModule = require('../public/js/app.js');
    assert.strictEqual(typeof appModule.isEditableElement, 'function', 'isEditableElement must be a function');
    assert.strictEqual(typeof appModule.handleGlobalKeydown, 'function', 'handleGlobalKeydown must be a function');
  });

  it('should ignore keyboard shortcuts when document.activeElement is an INPUT, TEXTAREA, SELECT, or contentEditable', () => {
    const { isEditableElement, handleGlobalKeydown } = require('../public/js/app.js');

    assert.strictEqual(isEditableElement({ tagName: 'INPUT' }), true);
    assert.strictEqual(isEditableElement({ tagName: 'textarea' }), true);
    assert.strictEqual(isEditableElement({ tagName: 'SELECT' }), true);
    assert.strictEqual(isEditableElement({ isContentEditable: true }), true);
    assert.strictEqual(isEditableElement({ tagName: 'DIV' }), false);
    assert.strictEqual(isEditableElement({ tagName: 'BUTTON' }), false);
    assert.strictEqual(isEditableElement(null), false);

    let playCalled = false;
    const mockPlayer = {
      togglePlayPause: () => { playCalled = true; },
      togglePlay: () => { playCalled = true; }
    };

    const mockEvent = {
      key: ' ',
      target: { tagName: 'INPUT' },
      preventDefault: () => {}
    };

    const handled = handleGlobalKeydown(mockEvent, mockPlayer);
    assert.strictEqual(handled, false, 'Must not handle keydown when target is an INPUT');
    assert.strictEqual(playCalled, false, 'Player action must not be triggered');
  });

  it('should route Space and k to player togglePlayPause() with preventDefault', () => {
    const { handleGlobalKeydown } = require('../public/js/app.js');

    let actions = [];
    let preventDefaultCalled = 0;
    const mockPlayer = {
      togglePlayPause: () => actions.push('togglePlayPause')
    };

    // Test Space
    const spaceEvent = {
      key: ' ',
      target: { tagName: 'BODY' },
      preventDefault: () => { preventDefaultCalled++; }
    };
    const spaceResult = handleGlobalKeydown(spaceEvent, mockPlayer);
    assert.strictEqual(spaceResult, true);
    assert.strictEqual(preventDefaultCalled, 1);
    assert.deepStrictEqual(actions, ['togglePlayPause']);

    // Test 'k'
    const kEvent = {
      key: 'k',
      target: { tagName: 'DIV' },
      preventDefault: () => { preventDefaultCalled++; }
    };
    const kResult = handleGlobalKeydown(kEvent, mockPlayer);
    assert.strictEqual(kResult, true);
    assert.strictEqual(preventDefaultCalled, 2);
    assert.deepStrictEqual(actions, ['togglePlayPause', 'togglePlayPause']);

    // Test 'K' (uppercase)
    const capKEvent = {
      key: 'K',
      target: { tagName: 'DIV' },
      preventDefault: () => { preventDefaultCalled++; }
    };
    const capKResult = handleGlobalKeydown(capKEvent, mockPlayer);
    assert.strictEqual(capKResult, true);
    assert.strictEqual(preventDefaultCalled, 3);
    assert.deepStrictEqual(actions, ['togglePlayPause', 'togglePlayPause', 'togglePlayPause']);
  });

  it('should route m to player toggleMute()', () => {
    const { handleGlobalKeydown } = require('../public/js/app.js');

    let muteCount = 0;
    let prevented = false;
    const mockPlayer = {
      toggleMute: () => { muteCount++; }
    };

    const mEvent = {
      key: 'm',
      target: { tagName: 'DIV' },
      preventDefault: () => { prevented = true; }
    };

    const result = handleGlobalKeydown(mEvent, mockPlayer);
    assert.strictEqual(result, true);
    assert.strictEqual(prevented, true);
    assert.strictEqual(muteCount, 1);

    // Test 'M' (uppercase)
    const capMEvent = {
      key: 'M',
      target: { tagName: 'DIV' },
      preventDefault: () => {}
    };
    const capMResult = handleGlobalKeydown(capMEvent, mockPlayer);
    assert.strictEqual(capMResult, true);
    assert.strictEqual(muteCount, 2);
  });

  it('should route ArrowLeft / ArrowRight to player seekAudio(-5 / +5)', () => {
    const { handleGlobalKeydown } = require('../public/js/app.js');

    let seekOffsets = [];
    let preventedCount = 0;
    const mockPlayer = {
      seekAudio: (offset) => { seekOffsets.push(offset); }
    };

    const leftEvent = {
      key: 'ArrowLeft',
      target: { tagName: 'DIV' },
      preventDefault: () => { preventedCount++; }
    };
    const leftResult = handleGlobalKeydown(leftEvent, mockPlayer);
    assert.strictEqual(leftResult, true);
    assert.strictEqual(preventedCount, 1);
    assert.deepStrictEqual(seekOffsets, [-5]);

    const rightEvent = {
      key: 'ArrowRight',
      target: { tagName: 'DIV' },
      preventDefault: () => { preventedCount++; }
    };
    const rightResult = handleGlobalKeydown(rightEvent, mockPlayer);
    assert.strictEqual(rightResult, true);
    assert.strictEqual(preventedCount, 2);
    assert.deepStrictEqual(seekOffsets, [-5, 5]);
  });

  it('should route ArrowUp / ArrowDown to player adjustVolume(+0.05 / -0.05)', () => {
    const { handleGlobalKeydown } = require('../public/js/app.js');

    let volumeDeltas = [];
    let preventedCount = 0;
    const mockPlayer = {
      adjustVolume: (delta) => { volumeDeltas.push(delta); }
    };

    const upEvent = {
      key: 'ArrowUp',
      target: { tagName: 'DIV' },
      preventDefault: () => { preventedCount++; }
    };
    const upResult = handleGlobalKeydown(upEvent, mockPlayer);
    assert.strictEqual(upResult, true);
    assert.strictEqual(preventedCount, 1);
    assert.deepStrictEqual(volumeDeltas, [0.05]);

    const downEvent = {
      key: 'ArrowDown',
      target: { tagName: 'DIV' },
      preventDefault: () => { preventedCount++; }
    };
    const downResult = handleGlobalKeydown(downEvent, mockPlayer);
    assert.strictEqual(downResult, true);
    assert.strictEqual(preventedCount, 2);
    assert.deepStrictEqual(volumeDeltas, [0.05, -0.05]);
  });

  it('should verify player.js implements togglePlayPause, toggleMute, seekAudio, and adjustVolume', () => {
    const playerContent = fs.readFileSync(playerJsPath, 'utf8');
    assert.match(playerContent, /toggleMute\s*\(\)\s*\{/, 'PreviewPlayer must implement toggleMute()');
    assert.match(playerContent, /seekAudio\s*\([^)]*\)\s*\{/, 'PreviewPlayer must implement seekAudio()');
    assert.match(playerContent, /adjustVolume\s*\([^)]*\)\s*\{/, 'PreviewPlayer must implement adjustVolume()');
  });

  it('should verify app.js registers global keydown listener calling handleGlobalKeydown', () => {
    const appContent = fs.readFileSync(appJsPath, 'utf8');
    assert.match(appContent, /window\.addEventListener\s*\(\s*['"]keydown['"]/, 'app.js must register window keydown listener');
    assert.match(appContent, /handleGlobalKeydown/, 'app.js must use handleGlobalKeydown');
  });
});
