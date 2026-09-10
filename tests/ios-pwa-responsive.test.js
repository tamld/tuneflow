const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');
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
      // Ignore probe errors
    }
  }

  if (typeof puppeteer.executablePath === 'function') {
    try {
      const pPath = await puppeteer.executablePath();
      if (pPath && fs.existsSync(pPath)) {
        return pPath;
      }
    } catch {}
  }

  return null;
}

describe('Issue #87: iOS PWA Mobile Responsive & Safe Area Insets Suite', () => {
  const htmlPath = path.join(__dirname, '../public/index.html');
  const cssPath = path.join(__dirname, '../public/css/silver-melody.css');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('should verify index.html contains viewport-fit=cover in viewport meta tag', () => {
    assert.match(htmlContent, /<meta\s+name="viewport"[^>]*viewport-fit=cover/i,
      'Viewport meta tag must contain viewport-fit=cover for iPhone notch and Dynamic Island coverage');
  });

  it('should verify index.html contains PiP button and playsinline video element', () => {
    assert.match(htmlContent, /id="btn-player-pip"/, 'Must contain btn-player-pip button in player DOM');
    assert.match(htmlContent, /<video\s+id="player-pip-video"[^>]*playsinline/i,
      'Must contain playsinline video element for iOS Picture-in-Picture');
  });

  it('should verify silver-melody.css enforces safe-area insets across top, bottom, and horizontal edges', () => {
    assert.match(cssContent, /env\(safe-area-inset-top/i, 'CSS must reference safe-area-inset-top');
    assert.match(cssContent, /env\(safe-area-inset-bottom/i, 'CSS must reference safe-area-inset-bottom');
    assert.match(cssContent, /env\(safe-area-inset-left/i, 'CSS must reference safe-area-inset-left');
    assert.match(cssContent, /env\(safe-area-inset-right/i, 'CSS must reference safe-area-inset-right');
  });

  it('should verify silver-melody.css defines mobile 2-tier bottom player grid', () => {
    assert.match(cssContent, /@media\s*\(max-width:\s*679px\)/, 'Must contain mobile media query for <= 679px');
    assert.match(cssContent, /grid-template-columns:\s*52px\s+1fr/i, 'Bottom player on mobile must use 2-column grid tier');
    assert.match(cssContent, /grid-template-rows:\s*auto\s+auto\s+auto/i, 'Bottom player on mobile must use 3-row grid tier');
  });

  it('should verify mobile search accessory buttons are correctly aligned to 56px input field', () => {
    assert.match(cssContent, /\.btn-voice-search\s*\{[^}]*top:\s*28px/s, 'Voice search button must align at top 28px on mobile');
    assert.match(cssContent, /\.btn-clear-search\s*\{[^}]*top:\s*28px/s, 'Clear search button must align at top 28px on mobile');
  });

  it('should verify header actions form a scrollable chip bar on mobile viewports', () => {
    assert.match(cssContent, /\.header-actions\s*\{[^}]*overflow-x:\s*auto/s, 'Header actions must support horizontal scroll');
    assert.match(cssContent, /\.header-actions\s*\{[^}]*flex-wrap:\s*nowrap/s, 'Header actions must be nowrap on mobile');
  });

  it('should verify mobile layout rendering in headless browser emulation (iPhone 14 Pro: 393x852)', async (t) => {
    const server = http.createServer(app);
    const port = await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    });

    const chromePath = await resolveChromeExecutable();
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    };
    if (chromePath) launchOptions.executablePath = chromePath;

    let browser;
    try {
      browser = await puppeteer.launch(launchOptions);
    } catch (err) {
      await new Promise((resolve) => server.close(resolve));
      t.skip(`Skipping Puppeteer mobile viewport test (browser launch unavailable: ${err.message})`);
      return;
    }

    try {
      const page = await browser.newPage();
      await page.setViewport({
        width: 393,
        height: 852,
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      });

      await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded', timeout: 15000 });

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      assert.ok(scrollWidth <= clientWidth + 1, `Document overflows horizontally: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);

      await page.waitForSelector('.header-actions', { timeout: 5000 });
      const headerDisplay = await page.$eval('.header-actions', el => window.getComputedStyle(el).display);
      assert.strictEqual(headerDisplay, 'flex');

      const pipBtnExists = await page.$eval('#btn-player-pip', el => Boolean(el));
      assert.strictEqual(pipBtnExists, true, 'PiP button must exist in DOM');

      const pipVideoPlaysinline = await page.$eval('#player-pip-video', el => el.hasAttribute('playsinline'));
      assert.strictEqual(pipVideoPlaysinline, true, 'PiP video must have playsinline attribute');
    } finally {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
