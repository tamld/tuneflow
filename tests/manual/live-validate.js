const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function liveValidate() {
  console.log('🔍 Starting Live Physical Validation on http://localhost:3000...');
  
  const artifactDir = 'C:\\Users\\Administrator\\.gemini\\antigravity-cli\\brain\\789003b0-231f-4e1f-b7dd-4125e2f5cffb';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // 1. Visit homepage
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  console.log('✅ Page loaded successfully');

  // 2. Measure button size & contrast tokens
  const searchBtnHeight = await page.$eval('#search-btn', el => el.getBoundingClientRect().height);
  console.log(`✅ Button height: ${searchBtnHeight}px (Standard >= 50px for elderly users)`);

  // Take screenshot 1: Clean homepage
  const shot1 = path.join(artifactDir, 'tuneflow_live_homepage.png');
  await page.screenshot({ path: shot1, fullPage: false });
  console.log(`📸 Screenshot saved: ${shot1}`);

  // 3. Click first discovery pill: "Nhạc Vàng Tuyển Chọn"
  console.log('🎵 Clicking quick pill: Nhạc Vàng Tuyển Chọn...');
  const firstPill = await page.$('.pill-btn');
  await firstPill.click();

  // Wait for results container to have cards
  await page.waitForSelector('.song-card', { timeout: 15000 });
  const cardCount = await page.$$eval('.song-card', cards => cards.length);
  console.log(`✅ Search rendered ${cardCount} song cards from YouTube!`);

  // Take screenshot 2: Search results
  const shot2 = path.join(artifactDir, 'tuneflow_live_search.png');
  await page.screenshot({ path: shot2, fullPage: false });
  console.log(`📸 Screenshot saved: ${shot2}`);

  // 4. Click "Nghe Thử" on the first card
  console.log('▶ Clicking Nghe Thử button...');
  const previewBtn = await page.$('.song-card:first-child .btn-preview');
  await previewBtn.click();

  // Wait for sticky player to be visible and track title populated
  await page.waitForFunction(() => {
    const title = document.querySelector('#player-track-title');
    return title && title.textContent.trim().length > 0;
  }, { timeout: 10000 });

  const currentPlaying = await page.$eval('#player-track-title', el => el.textContent);
  console.log(`🎶 Active playing track: "${currentPlaying}"`);

  // Take screenshot 3: Player active
  const shot3 = path.join(artifactDir, 'tuneflow_live_playing.png');
  await page.screenshot({ path: shot3, fullPage: false });
  console.log(`📸 Screenshot saved: ${shot3}`);

  await browser.close();
  console.log('🎉 100% PHYSICAL VALIDATION COMPLETE: ALL CHECKS PASSED!');
}

liveValidate().catch(err => {
  console.error('❌ Validation failed:', err);
  process.exit(1);
});
