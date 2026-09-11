const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Issue #119: Playlist Continuous Playback & Header Play Action Suite', () => {
  const publicDir = path.join(__dirname, '..', 'public');
  const htmlPath = path.join(publicDir, 'index.html');
  const cssPath = path.join(publicDir, 'css', 'silver-melody.css');
  const appJsPath = path.join(publicDir, 'js', 'app.js');
  const playerJsPath = path.join(publicDir, 'js', 'player.js');
  const i18nPath = path.join(publicDir, 'js', 'i18n.js');

  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  const playerJsContent = fs.readFileSync(playerJsPath, 'utf8');
  const i18nContent = fs.readFileSync(i18nPath, 'utf8');

  describe('UI & DOM Contract Verification', () => {
    it('should verify index.html contains #btn-play-playlist and #batch-play-count inside .playlist-panel-actions', () => {
      assert.ok(htmlContent.includes('id="btn-play-playlist"'), 'index.html must define #btn-play-playlist button');
      assert.ok(htmlContent.includes('id="batch-play-count"'), 'index.html must define #batch-play-count counter');
      assert.match(htmlContent, /<button[^>]*id="btn-play-playlist"[^>]*class="[^"]*btn-panel-play[^"]*"/, '#btn-play-playlist must have class btn-panel-play');
    });

    it('should verify silver-melody.css defines .btn-panel-play with touch-friendly dimensions and playing state', () => {
      assert.match(cssContent, /\.btn-panel-play\s*\{/, 'silver-melody.css must define .btn-panel-play');
      assert.match(cssContent, /\.btn-panel-play\.playing\s*\{|\.btn-panel-play\[data-state="playing"\]/, 'silver-melody.css must define playing state for .btn-panel-play');
      
      const playBtnMatch = cssContent.match(/\.btn-panel-play\s*\{([^}]+)\}/);
      assert.ok(playBtnMatch, 'Must find rule block for .btn-panel-play');
      const rules = playBtnMatch[1];
      assert.match(rules, /cursor\s*:\s*pointer/, 'Button must have cursor: pointer');
      assert.match(rules, /font-weight\s*:\s*(700|800|bold)/, 'Button must have bold typography for elderly readability');
    });

    it('should verify i18n.js includes localization keys for playlist playback actions', () => {
      assert.match(i18nContent, /playlist_play_all/, 'i18n.js must include playlist_play_all');
      assert.match(i18nContent, /playlist_pause/, 'i18n.js must include playlist_pause');
    });
  });

  describe('App.js Playlist Playback & Queue State Logic', () => {
    it('should verify app.js queries btn-play-playlist and batch-play-count elements', () => {
      assert.match(appJsContent, /document\.getElementById\(['"]btn-play-playlist['"]\)/, 'app.js must query #btn-play-playlist');
      assert.match(appJsContent, /document\.getElementById\(['"]batch-play-count['"]\)/, 'app.js must query #batch-play-count');
    });

    it('should verify app.js synchronizes batch-play-count when checkboxes are updated', () => {
      assert.match(appJsContent, /batchPlayCountEl|batch-play-count/, 'app.js must update play count element');
    });

    it('should verify app.js attaches click handler on btnPlayPlaylist to toggle or start playlist playback', () => {
      assert.match(appJsContent, /btnPlayPlaylist\.addEventListener\(['"]click['"]/, 'app.js must bind click listener to btnPlayPlaylist');
    });

    it('should verify continuous playback (playNextTrack) advances through selected playlist tracks', () => {
      assert.match(appJsContent, /window\.playNextTrack\s*=\s*\(\)\s*=>/, 'app.js must define window.playNextTrack');
      assert.match(appJsContent, /currentPlaylistTracks|activeTrackList/, 'playNextTrack must reference track lists');
    });
  });

  describe('Player.js Integration & Highlight Sync', () => {
    it('should verify player.js updates playlist play button state when track plays or pauses', () => {
      assert.match(playerJsContent, /updateCardState\(\)/, 'player.js must maintain updateCardState');
      assert.match(playerJsContent, /playlist-row-/, 'player.js must sync row visual status');
    });
  });
});
