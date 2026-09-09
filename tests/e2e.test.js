const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const { app } = require('../src/server');

/**
 * Resolve Chrome/Chromium executable across Windows, Linux, and Puppeteer cache environments.
 */
async function resolveChromeExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignore permission or file-system probe errors
    }
  }

  // Probe Puppeteer's internal browser cache if available
  if (typeof puppeteer.executablePath === 'function') {
    try {
      const pPath = await puppeteer.executablePath();
      if (pPath && fs.existsSync(pPath)) {
        return pPath;
      }
    } catch {
      // Cache probe ignored
    }
  }

  return null;
}

describe('TuneFlow End-to-End & Elderly Accessibility Suite', () => {
  it('should verify homepage UI, accessibility targets, modals, and playback affordances', async (t) => {
    // Start local test server on dynamic port (prevents port conflicts)
    const server = http.createServer(app);
    const port = await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    });

    const chromePath = await resolveChromeExecutable();
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    };

    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }

    let browser;
    try {
      browser = await puppeteer.launch(launchOptions);
    } catch (err) {
      await new Promise((resolve) => server.close(resolve));
      t.skip(`Skipping browser E2E test (Chrome executable unavailable or unable to launch: ${err.message})`);
      return;
    }

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      // 1. Navigate to TuneFlow (using domcontentloaded since SSE stream stays persistently open)
      await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Wait for brand title element
      await page.waitForSelector('.brand-title', { timeout: 5000 });
      const title = await page.$eval('.brand-title', (el) => el.textContent.trim());
      assert.strictEqual(title, 'TuneFlow', `Unexpected title: ${title}`);

      // 2. Verify Accessibility: Click target heights of buttons (>= 50px for elderly users)
      await page.waitForSelector('#search-btn', { timeout: 5000 });
      const searchBtnHeight = await page.$eval('#search-btn', (el) => el.getBoundingClientRect().height);
      assert.ok(searchBtnHeight >= 50, `Search button is too small: ${searchBtnHeight}px (Target >= 50px)`);

      // 3. Verify Category Pills (Bố & Mẹ curation) and Initial Load Click (Issue #40)
      const pillsCount = await page.$$eval('.pill-btn', (els) => els.length);
      assert.ok(pillsCount >= 6, `Too few category pills: ${pillsCount}`);

      // Verify clicking category pill on initial load immediately populates search input and sets active
      const secondPill = (await page.$$('.pill-btn'))[1];
      const secondPillQuery = await page.evaluate(el => el.getAttribute('data-query'), secondPill);
      await secondPill.click();
      const inputValAfterPillClick = await page.$eval('#search-input', el => el.value);
      assert.strictEqual(inputValAfterPillClick, secondPillQuery, 'Clicking category pill on initial load did not populate search input');

      // 4. Verify Accessible Guidance Modal (Issue #10)
      await page.click('#btn-help');
      const modalDisplay = await page.$eval('#help-modal', (el) => window.getComputedStyle(el).display);
      assert.notStrictEqual(modalDisplay, 'none', 'Help modal failed to open');

      await page.click('#btn-help-close');
      const modalClosedDisplay = await page.$eval('#help-modal', (el) => window.getComputedStyle(el).display);
      assert.strictEqual(modalClosedDisplay, 'none', 'Help modal failed to close');

      // 5. Verify Persistent Queue Drawer (Issue #9)
      await page.click('#btn-floating-queue');
      const drawerDisplay = await page.$eval('#queue-drawer-overlay', (el) => window.getComputedStyle(el).display);
      assert.notStrictEqual(drawerDisplay, 'none', 'Queue drawer failed to open');

      // Wait for drawer slide-in animation (250ms) to settle
      await new Promise((r) => setTimeout(r, 300));
      await page.$eval('#btn-close-drawer', (el) => el.click());
      const drawerClosedDisplay = await page.$eval('#queue-drawer-overlay', (el) => window.getComputedStyle(el).display);
      assert.strictEqual(drawerClosedDisplay, 'none', 'Queue drawer failed to close');

      // 6. Verify Clear Search Button Interaction (Issue #12)
      await page.type('#search-input', 'Nhạc Bolero');
      const clearBtnDisplay = await page.$eval('#btn-clear-search', (el) => window.getComputedStyle(el).display);
      assert.notStrictEqual(clearBtnDisplay, 'none', 'Clear search button did not appear');

      await page.click('#btn-clear-search');
      const searchValAfterClear = await page.$eval('#search-input', (el) => el.value);
      assert.strictEqual(searchValAfterClear, '', 'Search input was not cleared');

      // 7. Verify Font Size Scaler (Issue #12)
      await page.click('#btn-font-inc');
      const scaledFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
      assert.ok(scaledFontSize, 'Font size scaler did not set font-size');

      // 8. Verify Sticky Bottom Player elements & controls (Issue #12 & #16)
      const playerExists = (await page.$('#bottom-player')) !== null;
      const playPauseBtnExists = (await page.$('#btn-player-play-pause')) !== null;
      const repeatBtnExists = (await page.$('#btn-player-repeat')) !== null;
      const volumeBtnExists = (await page.$('#btn-player-volume')) !== null;
      const sleepBtnExists = (await page.$('#btn-player-sleep')) !== null;
      assert.ok(
        playerExists && playPauseBtnExists && repeatBtnExists && volumeBtnExists && sleepBtnExists,
        'Bottom player extended controls missing.'
      );

      // 9. Verify Song Card Click-to-Play on Thumbnail and Title (Issue #26)
      const cardAffordanceResult = await page.evaluate(async () => {
        const mockSong = {
          id: 'mock_e2e_play_123',
          title: 'Thành Phố Buồn - Chế Linh',
          uploader: 'Chế Linh',
          thumbnail: 'data:image/svg+xml;utf8,<svg></svg>',
          duration: 270,
          duration_string: '04:30',
          url: 'https://www.youtube.com/watch?v=mock_e2e_play_123'
        };

        let playTrackCalls = 0;
        let lastTrackPassed = null;
        const originalPlayTrack = window.previewPlayer.playTrack;
        window.previewPlayer.playTrack = function (track) {
          playTrackCalls++;
          lastTrackPassed = track;
        };

        window.renderResults([mockSong]);

        const card = document.getElementById(`card-${mockSong.id}`);
        if (!card) return { success: false, reason: 'Card not rendered' };

        const thumbWrapper = card.querySelector('.song-thumbnail-wrapper');
        const titleEl = card.querySelector('.song-title');
        const overlayEl = card.querySelector('.song-thumb-overlay');
        const playIconOverlay = card.querySelector('.play-icon-overlay');

        const thumbHasRole = thumbWrapper.getAttribute('role') === 'button';
        const thumbHasTabIndex = thumbWrapper.getAttribute('tabindex') === '0';
        const titleHasRole = titleEl.getAttribute('role') === 'button';
        const titleHasTabIndex = titleEl.getAttribute('tabindex') === '0';
        const thumbCursor = window.getComputedStyle(thumbWrapper).cursor;
        const titleCursor = window.getComputedStyle(titleEl).cursor;

        thumbWrapper.click();
        const calledAfterThumb = playTrackCalls === 1 && lastTrackPassed && lastTrackPassed.id === mockSong.id;

        titleEl.click();
        const calledAfterTitle = playTrackCalls === 2;

        window.previewPlayer.playTrack = originalPlayTrack;

        return {
          success: true,
          thumbHasRole,
          thumbHasTabIndex,
          titleHasRole,
          titleHasTabIndex,
          thumbCursor,
          titleCursor,
          hasOverlay: !!overlayEl,
          hasPlayIcon: !!playIconOverlay,
          calledAfterThumb,
          calledAfterTitle
        };
      });

      assert.ok(
        cardAffordanceResult.calledAfterThumb && cardAffordanceResult.calledAfterTitle,
        'Clicking thumbnail or title failed to trigger playTrack!'
      );
      assert.strictEqual(
        cardAffordanceResult.thumbCursor,
        'pointer',
        `Expected cursor: pointer, got thumb=${cardAffordanceResult.thumbCursor}`
      );
      assert.strictEqual(
        cardAffordanceResult.titleCursor,
        'pointer',
        `Expected cursor: pointer, got title=${cardAffordanceResult.titleCursor}`
      );

      // Verify real PreviewPlayer pipeline updates audio src and state (Issue #68)
      const playerPipelineResult = await page.evaluate(() => {
        const testTrack = {
          id: 'test_pipeline_video_id',
          title: 'Test Pipeline Song',
          uploader: 'Test Artist',
          thumbnail: 'data:image/svg+xml;utf8,<svg></svg>',
          duration: 180,
          duration_string: '03:00'
        };
        window.previewPlayer.playTrack(testTrack);
        return {
          currentTrackId: window.previewPlayer.currentTrack ? window.previewPlayer.currentTrack.id : null,
          audioSrc: window.previewPlayer.audio ? window.previewPlayer.audio.src : null,
          trackTitle: document.getElementById('player-track-title').textContent
        };
      });

      assert.strictEqual(playerPipelineResult.currentTrackId, 'test_pipeline_video_id');
      assert.ok(playerPipelineResult.audioSrc.includes('/api/preview/test_pipeline_video_id'));
      assert.strictEqual(playerPipelineResult.trackTitle, 'Test Pipeline Song');
    } finally {
      if (browser) {
        await browser.close();
      }
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
