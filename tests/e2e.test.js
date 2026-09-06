const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const { app } = require('../src/server');

async function runE2ETest() {
  console.log('🚀 Starting TuneFlow End-to-End & Elderly Accessibility Tests...');

  // Start local test server on port 3099
  const server = http.createServer(app);
  const port = 3099;
  await new Promise(resolve => server.listen(port, '127.0.0.1', resolve));
  console.log(`📡 Local test server running at http://127.0.0.1:${port}`);

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

    // 3. Verify Category Pills
    const pillsCount = await page.$$eval('.pill-btn', els => els.length);
    console.log(`✅ Verified Category Recommendation Pills: Found ${pillsCount} pills.`);
    if (pillsCount < 3) throw new Error(`Too few category pills: ${pillsCount}`);

    // 4. Verify Sticky Bottom Player elements
    const playerExists = await page.$('#bottom-player') !== null;
    const playPauseBtnExists = await page.$('#btn-player-play-pause') !== null;
    console.log(`✅ Verified Sticky Bottom Player & Play/Pause Controls: Exists = ${playerExists && playPauseBtnExists}`);
    if (!playerExists || !playPauseBtnExists) throw new Error('Bottom player components missing.');

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
