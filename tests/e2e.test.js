const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const { app } = require('../src/server');

async function runE2ETest() {
  console.log('🚀 Starting TuneFlow End-to-End & Elderly Accessibility Tests...');

  // Start local test server on dynamic port (prevents port conflicts)
  const server = http.createServer(app);
  const port = await new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
  console.log(`📡 Local test server running on dynamic port http://127.0.0.1:${port}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const launchOptions = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  };

  if (process.platform === 'win32' && fs.existsSync(chromePath)) {
    launchOptions.executablePath = chromePath;
  }

  const browser = await puppeteer.launch(launchOptions);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    // 1. Navigate to TuneFlow (using domcontentloaded since SSE stream stays persistently open)
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('✅ Navigated to TuneFlow homepage successfully.');

    // Wait for brand title element
    await page.waitForSelector('.brand-title', { timeout: 5000 });
    const title = await page.$eval('.brand-title', el => el.textContent.trim());
    console.log(`✅ Verified Brand Title: "${title}"`);
    if (title !== 'TuneFlow') throw new Error(`Unexpected title: ${title}`);

    // 2. Verify Accessibility: Click target heights of buttons (>= 50px for elderly users)
    await page.waitForSelector('#search-btn', { timeout: 5000 });
    const searchBtnHeight = await page.$eval('#search-btn', el => el.getBoundingClientRect().height);
    console.log(`✅ Verified Search Button Height: ${searchBtnHeight}px (Target >= 50px for elderly motor accessibility)`);
    if (searchBtnHeight < 50) throw new Error(`Search button is too small: ${searchBtnHeight}px`);

    // 3. Verify Category Pills (Bố & Mẹ curation)
    const pillsCount = await page.$$eval('.pill-btn', els => els.length);
    console.log(`✅ Verified Category Recommendation Pills: Found ${pillsCount} pills.`);
    if (pillsCount < 6) throw new Error(`Too few category pills: ${pillsCount}`);

    // 4. Verify Accessible Guidance Modal (Issue #10)
    await page.click('#btn-help');
    const modalDisplay = await page.$eval('#help-modal', el => window.getComputedStyle(el).display);
    console.log(`✅ Verified Guidance Modal opens: display = ${modalDisplay}`);
    if (modalDisplay === 'none') throw new Error('Help modal failed to open');

    await page.click('#btn-help-close');
    const modalClosedDisplay = await page.$eval('#help-modal', el => window.getComputedStyle(el).display);
    console.log(`✅ Verified Guidance Modal closes: display = ${modalClosedDisplay}`);
    if (modalClosedDisplay !== 'none') throw new Error('Help modal failed to close');

    // 5. Verify Persistent Queue Drawer (Issue #9)
    await page.click('#btn-floating-queue');
    const drawerDisplay = await page.$eval('#queue-drawer-overlay', el => window.getComputedStyle(el).display);
    console.log(`✅ Verified Queue Drawer opens: display = ${drawerDisplay}`);
    if (drawerDisplay === 'none') throw new Error('Queue drawer failed to open');

    // Wait for drawer slide-in animation (250ms) to settle
    await new Promise(r => setTimeout(r, 300));
    await page.$eval('#btn-close-drawer', el => el.click());
    const drawerClosedDisplay = await page.$eval('#queue-drawer-overlay', el => window.getComputedStyle(el).display);
    console.log(`✅ Verified Queue Drawer closes: display = ${drawerClosedDisplay}`);
    if (drawerClosedDisplay !== 'none') throw new Error('Queue drawer failed to close');

    // 6. Verify Clear Search Button Interaction (Issue #12)
    await page.type('#search-input', 'Nhạc Bolero');
    const clearBtnDisplay = await page.$eval('#btn-clear-search', el => window.getComputedStyle(el).display);
    console.log(`✅ Verified Clear Search button appears upon typing: display = ${clearBtnDisplay}`);
    if (clearBtnDisplay === 'none') throw new Error('Clear search button did not appear');

    await page.click('#btn-clear-search');
    const searchValAfterClear = await page.$eval('#search-input', el => el.value);
    console.log(`✅ Verified Clear Search clears input value: "${searchValAfterClear}"`);
    if (searchValAfterClear !== '') throw new Error('Search input was not cleared');

    // 7. Verify Font Size Scaler (Issue #12)
    await page.click('#btn-font-inc');
    const scaledFontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    console.log(`✅ Verified Font Scaling (A+ button): html font-size = ${scaledFontSize}`);
    if (!scaledFontSize) throw new Error('Font size scaler did not set font-size');

    // 8. Verify Sticky Bottom Player elements & controls (Issue #12 & #16)
    const playerExists = await page.$('#bottom-player') !== null;
    const playPauseBtnExists = await page.$('#btn-player-play-pause') !== null;
    const repeatBtnExists = await page.$('#btn-player-repeat') !== null;
    const volumeBtnExists = await page.$('#btn-player-volume') !== null;
    const sleepBtnExists = await page.$('#btn-player-sleep') !== null;
    console.log(`✅ Verified Player Controls (Play, Repeat, Volume, Sleep Timer): Exists = ${
      playerExists && playPauseBtnExists && repeatBtnExists && volumeBtnExists && sleepBtnExists
    }`);
    if (!repeatBtnExists || !volumeBtnExists || !sleepBtnExists) {
      throw new Error('Bottom player extended controls missing.');
    }

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

      // Track calls to playTrack
      let playTrackCalls = 0;
      let lastTrackPassed = null;
      const originalPlayTrack = window.previewPlayer.playTrack;
      window.previewPlayer.playTrack = function(track) {
        playTrackCalls++;
        lastTrackPassed = track;
      };

      // Render the test song card
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

      // Click thumbnail -> triggers playTrack
      thumbWrapper.click();
      const calledAfterThumb = playTrackCalls === 1 && lastTrackPassed && lastTrackPassed.id === mockSong.id;

      // Click title -> triggers playTrack
      titleEl.click();
      const calledAfterTitle = playTrackCalls === 2;

      // Restore original method
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

    console.log(`✅ Verified Song Card Click-to-Play Affordance:`, cardAffordanceResult);
    if (!cardAffordanceResult.calledAfterThumb || !cardAffordanceResult.calledAfterTitle) {
      throw new Error('Clicking thumbnail or title failed to trigger playTrack!');
    }
    if (cardAffordanceResult.thumbCursor !== 'pointer' || cardAffordanceResult.titleCursor !== 'pointer') {
      throw new Error(`Expected cursor: pointer, got thumb=${cardAffordanceResult.thumbCursor}, title=${cardAffordanceResult.titleCursor}`);
    }

    console.log('\n🎉 ALL E2E & ACCESSIBILITY TESTS PASSED SUCCESSFULLY! (100% GREEN)');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    console.log('🏁 Test server closed cleanly.');
  }
}

runE2ETest().catch(err => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});
