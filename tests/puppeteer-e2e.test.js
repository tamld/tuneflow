const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { app } = require('../src/server');

function getSystemChromePath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const candidatePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

describe('Gate 2: Headless Browser Puppeteer Real DOM & E2E Validation', () => {
  let server;
  let baseUrl;
  let browser;
  let page;
  const chromePath = getSystemChromePath();

  before(async () => {
    // Spin up isolated Express server on ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });

    if (chromePath) {
      browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      });
      page = await browser.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    }
  });

  after(async () => {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  it('should verify document meta referrer policy is set to no-referrer', async (t) => {
    if (!page) return t.skip('Chrome executable not available in environment');

    const metaReferrer = await page.$eval('meta[name="referrer"]', (el) => el.getAttribute('content'));
    assert.strictEqual(metaReferrer, 'no-referrer', 'Document must enforce no-referrer policy');
  });

  it('should dynamically switch language and update real DOM text', async (t) => {
    if (!page) return t.skip('Chrome executable not available in environment');

    // Switch to English
    await page.evaluate(() => {
      window.TuneFlowI18n.setLanguage('en');
    });

    const langAttr = await page.$eval('html', (el) => el.getAttribute('lang'));
    assert.strictEqual(langAttr, 'en', 'HTML lang attribute must be en');

    const helpBtnText = await page.$eval('#btn-help', (el) => el.textContent.trim());
    assert.ok(helpBtnText.includes('Easy Guide'), `Help button must display English, got: ${helpBtnText}`);

    const allTypeChip = await page.$eval('[data-search-type="all"]', (el) => el.textContent.trim());
    assert.strictEqual(allTypeChip, 'All', 'Search type chip must be localized to English');

    const playlistTypeChip = await page.$eval('[data-search-type="playlist"]', (el) => el.textContent.trim());
    assert.ok(playlistTypeChip.includes('Playlists / Albums'), `Playlist type chip must be English, got: ${playlistTypeChip}`);

    // Switch back to Vietnamese
    await page.evaluate(() => {
      window.TuneFlowI18n.setLanguage('vi');
    });

    const langAttrVi = await page.$eval('html', (el) => el.getAttribute('lang'));
    assert.strictEqual(langAttrVi, 'vi', 'HTML lang attribute must revert to vi');

    const helpBtnTextVi = await page.$eval('#btn-help', (el) => el.textContent.trim());
    assert.ok(helpBtnTextVi.includes('Hướng Dẫn'), `Help button must revert to Vietnamese, got: ${helpBtnTextVi}`);
  });

  it('should enforce referrerpolicy="no-referrer" on all rendered img elements', async (t) => {
    if (!page) return t.skip('Chrome executable not available in environment');

    const imgReferrers = await page.$$eval('img', (imgs) =>
      imgs.map((img) => img.getAttribute('referrerpolicy'))
    );

    assert.ok(imgReferrers.length > 0, 'Page must contain at least 1 image element');
    for (const ref of imgReferrers) {
      assert.strictEqual(ref, 'no-referrer', 'Every img element must specify referrerpolicy="no-referrer"');
    }
  });

  it('should verify elderly touch target accessibility (>= 40px height)', async (t) => {
    if (!page) return t.skip('Chrome executable not available in environment');

    const searchBtnHeight = await page.$eval('#search-btn', (el) => el.offsetHeight);
    assert.ok(searchBtnHeight >= 40, `Search button height must be >= 40px for elderly touch target, got: ${searchBtnHeight}`);

    const helpBtnHeight = await page.$eval('#btn-help', (el) => el.offsetHeight);
    assert.ok(helpBtnHeight >= 40, `Help button height must be >= 40px for elderly touch target, got: ${helpBtnHeight}`);
  });

  it('should verify 100% complete English localization on header buttons, auth status, and card re-render', async (t) => {
    if (!page) return t.skip('Chrome executable not available in environment');

    // Switch to English
    await page.evaluate(() => {
      window.TuneFlowI18n.setLanguage('en');
    });

    const headerTexts = await page.evaluate(() => {
      return {
        btnLang: document.getElementById('btn-lang-toggle')?.textContent.trim(),
        installPwa: document.getElementById('btn-install-pwa')?.textContent.trim(),
        toggleTv: document.getElementById('btn-toggle-tv')?.textContent.trim(),
        adminText: document.getElementById('admin-trigger-text')?.textContent.trim(),
        authStatus: document.getElementById('auth-status-text')?.textContent.trim(),
        floatingQueue: document.getElementById('btn-floating-queue')?.textContent.trim(),
        contentLabel: document.querySelector('.search-filter-group span')?.textContent.trim(),
        sortLabel: document.querySelector('.search-sort-group span')?.textContent.trim()
      };
    });

    assert.strictEqual(headerTexts.btnLang, '🇻🇳 Tiếng Việt', 'Language switcher must invite to switch to Vietnamese');
    assert.strictEqual(headerTexts.installPwa, '📲 Install App', 'PWA install text must be localized to English');
    assert.strictEqual(headerTexts.toggleTv, '📺 TV Mode', 'TV mode button must be localized to English');
    assert.strictEqual(headerTexts.adminText, 'Admin', 'Admin text must be localized to English');
    assert.ok(headerTexts.authStatus.startsWith('Guest:'), `Auth status must start with Guest:, got: ${headerTexts.authStatus}`);
    assert.ok(headerTexts.floatingQueue.includes('Queue'), `Queue button must contain Queue, got: ${headerTexts.floatingQueue}`);
    assert.strictEqual(headerTexts.contentLabel, 'Content:', 'Filter content label must be Content:');
    assert.strictEqual(headerTexts.sortLabel, 'Sort by:', 'Sort label must be Sort by:');

    // Simulate search and test dynamic reRenderActiveCards on language toggle
    await page.evaluate(() => {
      const dummyResults = [
        { id: 'track1', title: 'Moonlight Romance', uploader: 'Singer', duration: 180, thumbnail: 'data:image/svg+xml,<svg></svg>' },
        { id: 'PLtest', title: 'Golden Hits Collection', uploader: 'Singer', isPlaylist: true, thumbnail: 'data:image/svg+xml,<svg></svg>' }
      ];
      // Inject into app
      document.getElementById('search-input').value = 'Moonlight';
      window.executeSearchTest = true;
      if (typeof window.setLastSearchResults === 'function') {
        window.setLastSearchResults(dummyResults);
      } else {
        const header = document.getElementById('results-header');
        const foundTemplate = window.TuneFlowI18n.t('search_results_found');
        header.textContent = foundTemplate.replace('{count}', dummyResults.length);
        window.reRenderActiveCards();
      }
    });

    const resultsHeaderTextEn = await page.$eval('#results-header', el => el.textContent.trim());
    assert.ok(resultsHeaderTextEn.includes('Found 2 lovely songs'), `Results header must be in English, got: ${resultsHeaderTextEn}`);

    // Switch back to Vietnamese and verify reRenderActiveCards dynamic update
    await page.evaluate(() => {
      window.TuneFlowI18n.setLanguage('vi');
    });

    const resultsHeaderTextVi = await page.$eval('#results-header', el => el.textContent.trim());
    assert.ok(resultsHeaderTextVi.includes('Tìm thấy 2 bài hát'), `Results header must re-translate to Vietnamese, got: ${resultsHeaderTextVi}`);
  });

  it('should verify Web Audio API initialization, proactive resume, and Equalizer preset gain adjustments', async (t) => {
    if (!page) return t.skip('Chrome executable not available in environment');

    const dspResult = await page.evaluate(() => {
      const player = window.previewPlayer;
      if (!player) return { error: 'PreviewPlayer not found' };

      // Verify audio crossOrigin setting
      const crossOrigin = player.audio.crossOrigin;

      // Force WebAudio initialization
      player.initWebAudio(true);
      const hasAudioCtx = Boolean(player.audioCtx);
      const ctxState = player.audioCtx ? player.audioCtx.state : null;
      const hasFilters = Boolean(player.lowFilter && player.midFilter && player.highFilter && player.gainNode);

      // Verify standard preset
      const stdLow = player.lowFilter.gain.value;
      const stdMid = player.midFilter.gain.value;
      const stdHigh = player.highFilter.gain.value;

      // Cycle to clarity preset
      player.cycleEq();
      const clarityPreset = player.eqPresets[player.eqIndex];
      const clarityLow = player.lowFilter.gain.value;
      const clarityMid = player.midFilter.gain.value;
      const clarityHigh = player.highFilter.gain.value;

      // Cycle to warm preset
      player.cycleEq();
      const warmPreset = player.eqPresets[player.eqIndex];
      const warmLow = player.lowFilter.gain.value;
      const warmMid = player.midFilter.gain.value;
      const warmHigh = player.highFilter.gain.value;

      // Cycle to volume boost 125%
      player.cycleBoost();
      const boostLevel = player.gainNode.gain.value;

      return {
        crossOrigin,
        hasAudioCtx,
        ctxState,
        hasFilters,
        stdLow,
        stdMid,
        stdHigh,
        clarityPreset,
        clarityLow,
        clarityMid,
        clarityHigh,
        warmPreset,
        warmLow,
        warmMid,
        warmHigh,
        boostLevel
      };
    });

    assert.strictEqual(dspResult.crossOrigin, 'anonymous', 'Audio element must set crossOrigin="anonymous"');
    assert.strictEqual(dspResult.hasAudioCtx, true, 'AudioContext must be initialized');
    assert.strictEqual(dspResult.ctxState, 'running', 'AudioContext must be in running state');
    assert.strictEqual(dspResult.hasFilters, true, 'All Biquad and Gain filters must exist');

    assert.strictEqual(dspResult.stdLow, 0, 'Standard low gain must be 0dB');
    assert.strictEqual(dspResult.stdMid, 0, 'Standard mid gain must be 0dB');
    assert.strictEqual(dspResult.stdHigh, 0, 'Standard high gain must be 0dB');

    assert.strictEqual(dspResult.clarityPreset, 'clarity');
    assert.strictEqual(dspResult.clarityLow, -3, 'Clarity low gain must be -3dB');
    assert.strictEqual(dspResult.clarityMid, 4.5, 'Clarity mid gain must be +4.5dB');
    assert.strictEqual(dspResult.clarityHigh, 2, 'Clarity high gain must be +2dB');

    assert.strictEqual(dspResult.warmPreset, 'warm');
    assert.strictEqual(dspResult.warmLow, 4, 'Warm low gain must be +4dB');
    assert.strictEqual(dspResult.warmMid, 0, 'Warm mid gain must be 0dB');
    assert.strictEqual(dspResult.warmHigh, -2, 'Warm high gain must be -2dB');

    assert.strictEqual(dspResult.boostLevel, 1.25, 'Volume boost tier 1 must be 1.25x (125%)');
  });

  it('should render volume boost button as an elegant capsule pill without text overflow or aspect distortion', async (t) => {
    if (!page) return t.skip('Chrome executable not available in environment');

    // 1. Test Desktop Viewport
    await page.setViewport({ width: 1280, height: 800 });
    const deskMetrics = await page.evaluate(() => {
      const player = window.previewPlayer;
      if (!player) return null;

      if (player.playerContainer) {
        player.playerContainer.classList.add('visible');
      }

      // Set Boost to 125%
      player.setBoostPreset(1);

      const btn = document.getElementById('btn-player-boost');
      if (!btn) return null;

      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      const isBoosted = btn.classList.contains('boosted');
      const hasIcon = Boolean(btn.querySelector('.boost-icon'));
      const hasPct = Boolean(btn.querySelector('.boost-pct'));
      const text = btn.textContent;
      const scrollWidth = btn.scrollWidth;
      const clientWidth = btn.clientWidth;
      const borderRadius = style.borderRadius;

      return {
        isBoosted,
        hasIcon,
        hasPct,
        text,
        width: rect.width,
        height: rect.height,
        scrollWidth,
        clientWidth,
        borderRadius,
        whiteSpace: style.whiteSpace
      };
    });

    assert.ok(deskMetrics, 'Desktop boost button metrics must be retrieved');
    assert.strictEqual(deskMetrics.isBoosted, true, 'Boost button must have "boosted" class');
    assert.strictEqual(deskMetrics.hasIcon, true, 'Boost button must render .boost-icon element');
    assert.strictEqual(deskMetrics.hasPct, true, 'Boost button must render .boost-pct element');
    assert.ok(deskMetrics.text.includes('125%'), 'Boost button text must include 125%');
    assert.ok(deskMetrics.width >= 66, `Boost button width (${deskMetrics.width}px) must be >= 66px capsule pill`);
    assert.strictEqual(deskMetrics.height, 44, 'Boost button height must be 44px');
    assert.strictEqual(Math.round(parseFloat(deskMetrics.borderRadius)), 22, 'Capsule pill border radius must be 22px');
    assert.strictEqual(deskMetrics.whiteSpace, 'nowrap', 'Text must not wrap inside capsule pill');
    assert.ok(deskMetrics.scrollWidth <= deskMetrics.clientWidth + 1, 'Content must not overflow capsule boundaries');

    // 2. Test Mobile Viewport (max-width 768px)
    await page.setViewport({ width: 390, height: 844 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const mobMetrics = await page.evaluate(() => {
      const btn = document.getElementById('btn-player-boost');
      if (!btn) return null;
      const rect = btn.getBoundingClientRect();
      const style = window.getComputedStyle(btn);
      return {
        width: rect.width,
        height: rect.height,
        borderRadius: style.borderRadius,
        scrollWidth: btn.scrollWidth,
        clientWidth: btn.clientWidth
      };
    });

    assert.ok(mobMetrics, 'Mobile boost button metrics must be retrieved');
    assert.ok(mobMetrics.width >= 58, `Mobile boost button width (${mobMetrics.width}px) must be >= 58px`);
    assert.strictEqual(Math.round(mobMetrics.height), 42, 'Mobile boost button height must be 42px');
    assert.strictEqual(Math.round(parseFloat(mobMetrics.borderRadius)), 21, 'Mobile border radius must be 21px');
    assert.ok(mobMetrics.scrollWidth <= mobMetrics.clientWidth + 1, 'Mobile content must not overflow boundaries');

    // Reset back to default boost
    await page.evaluate(() => {
      window.previewPlayer.setBoostPreset(0);
    });
  });
});
