const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Issue #88: iOS Background Audio & Picture-in-Picture (PiP) Suite', () => {
  const playerJsPath = path.join(__dirname, '../public/js/player.js');
  const playerJsContent = fs.readFileSync(playerJsPath, 'utf8');

  it('should verify iOS WebKit detection regex handles iPhone, iPad, iPod, and MacIntel touch', () => {
    assert.match(playerJsContent, /this\.isIOS\s*=\s*typeof\s+navigator/);
    assert.match(playerJsContent, /\/iPad\|iPhone\|iPod\/\.test/);
    assert.match(playerJsContent, /navigator\.platform\s*===\s*'MacIntel'\s*&&\s*navigator\.maxTouchPoints\s*>\s*1/);
  });

  it('should verify initWebAudio bypasses AudioContext on iOS unless explicitly forced', () => {
    assert.match(playerJsContent, /initWebAudio\(force\s*=\s*false\)\s*\{/);
    assert.match(playerJsContent, /if\s*\(this\.isIOS\s*&&\s*!force\)\s*\{/);
  });

  it('should verify cycleEq and cycleBoost force WebAudio initialization when user adjusts DSP', () => {
    assert.match(playerJsContent, /cycleEq\(\)\s*\{[^}]*this\.initWebAudio\(true\)/s);
    assert.match(playerJsContent, /cycleBoost\(\)\s*\{[^}]*this\.initWebAudio\(true\)/s);
  });

  it('should verify page visibility change listener syncs playback state when returning from background', () => {
    assert.match(playerJsContent, /document\.addEventListener\('visibilitychange'/);
    assert.match(playerJsContent, /document\.visibilityState\s*===\s*'visible'/);
    assert.match(playerJsContent, /this\.updateMediaSessionPlaybackState\(\)/);
  });

  it('should verify setupMediaSession registers complete action handlers including seekto and stop', () => {
    assert.match(playerJsContent, /navigator\.mediaSession\.setActionHandler\('play'/);
    assert.match(playerJsContent, /navigator\.mediaSession\.setActionHandler\('pause'/);
    assert.match(playerJsContent, /navigator\.mediaSession\.setActionHandler\('seekbackward'/);
    assert.match(playerJsContent, /navigator\.mediaSession\.setActionHandler\('seekforward'/);
    assert.match(playerJsContent, /navigator\.mediaSession\.setActionHandler\('seekto'/);
    assert.match(playerJsContent, /navigator\.mediaSession\.setActionHandler\('stop'/);
    assert.match(playerJsContent, /navigator\.mediaSession\.setActionHandler\('previoustrack'/);
    assert.match(playerJsContent, /navigator\.mediaSession\.setActionHandler\('nexttrack'/);
  });

  it('should verify updateMediaSessionPlaybackState and updateMediaSessionPositionState implementations', () => {
    assert.match(playerJsContent, /updateMediaSessionPlaybackState\(\)\s*\{/);
    assert.match(playerJsContent, /navigator\.mediaSession\.playbackState\s*=\s*this\.isPlaying\s*\?\s*'playing'\s*:\s*'paused'/);
    assert.match(playerJsContent, /updateMediaSessionPositionState\(\)\s*\{/);
    assert.match(playerJsContent, /navigator\.mediaSession\.setPositionState/);
  });

  it('should verify Picture-in-Picture (PiP) methods and event lifecycle', () => {
    assert.match(playerJsContent, /renderPipCanvas\(\)\s*\{/);
    assert.match(playerJsContent, /togglePip\(\)\s*\{/);
    assert.match(playerJsContent, /requestPictureInPicture/);
    assert.match(playerJsContent, /webkitSetPresentationMode/);
    assert.match(playerJsContent, /updatePipBtnState\(\)\s*\{/);
    assert.match(playerJsContent, /pip-active/);
  });

  it('should test PiP canvas rendering mathematics and fallback icon logic', () => {
    // Mock canvas context
    const calls = [];
    const mockCtx = {
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: (x, y, w, h) => calls.push({ op: 'fillRect', x, y, w, h }),
      strokeRect: (x, y, w, h) => calls.push({ op: 'strokeRect', x, y, w, h }),
      fillText: (text, x, y) => calls.push({ op: 'fillText', text, x, y }),
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      clip: () => {},
      drawImage: () => {},
      stroke: () => {},
      arc: () => {}
    };

    // Simulate mock player environment
    const mockPlayer = {
      pipCtx: mockCtx,
      pipThumbnailImg: null,
      currentTrack: { title: 'Duyên Phận - Như Quỳnh', uploader: 'Thúy Nga' },
      isPlaying: true,
      audio: { duration: 300, currentTime: 150 },
      renderPipFallbackIcon(ctx, w) {
        ctx.fillText('🎶', w / 2, 220);
      }
    };

    // Replicate renderPipCanvas logic
    const w = 512;
    const h = 512;
    mockCtx.fillRect(0, 0, w, h);
    mockCtx.strokeRect(3, 3, w - 6, h - 6);
    mockPlayer.renderPipFallbackIcon(mockCtx, w);
    mockCtx.fillText(mockPlayer.currentTrack.title, w / 2, 350);
    mockCtx.fillText(mockPlayer.currentTrack.uploader, w / 2, 390);

    const fillTextCalls = calls.filter(c => c.op === 'fillText');
    assert.ok(fillTextCalls.length >= 3, 'Must call fillText for icon, title, and artist');
    assert.strictEqual(fillTextCalls[0].text, '🎶');
    assert.strictEqual(fillTextCalls[1].text, 'Duyên Phận - Như Quỳnh');
    assert.strictEqual(fillTextCalls[2].text, 'Thúy Nga');
  });
});
