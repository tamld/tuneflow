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
});
