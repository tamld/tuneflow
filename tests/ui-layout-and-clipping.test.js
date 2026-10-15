const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');
const { app } = require('../src/server');

/**
 * Resolve Chrome/Chromium/Edge executable across Windows, macOS, Linux, and CI.
 */
async function resolveBrowserExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
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
    } catch {
      // Ignore fallback errors
    }
  }

  return null;
}

describe('UI Layout Geometry, Anti-Clipping & Multi-Viewport Regression Suite', () => {
  const i18nPath = path.join(__dirname, '../public/js/i18n.js');
  const appJsPath = path.join(__dirname, '../public/js/app.js');
  const playerJsPath = path.join(__dirname, '../public/js/player.js');
  const cssPath = path.join(__dirname, '../public/css/silver-melody.css');

  const i18nContent = fs.readFileSync(i18nPath, 'utf8');
  const appJsContent = fs.readFileSync(appJsPath, 'utf8');
  const playerJsContent = fs.readFileSync(playerJsPath, 'utf8');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('1. Static Contract: Concise button labels and wrap-safe category strip prevent horizontal text clipping', () => {
    assert.ok(
      i18nContent.includes("btnPreview: '▶ Nghe Thử'") && i18nContent.includes("btnDownload: '↓ Tải MP3'"),
      'i18n.js must define concise Vietnamese card button labels (▶ Nghe Thử / ↓ Tải MP3)'
    );
    assert.ok(
      i18nContent.includes("btnPreview: '▶ Preview'") && i18nContent.includes("btnDownload: '↓ Save MP3'"),
      'i18n.js must define concise English card button labels (▶ Preview / ↓ Save MP3)'
    );
    assert.ok(
      i18nContent.includes("btn_resume: '▶ Tiếp Tục'") && playerJsContent.includes("'▶ Tiếp Tục'"),
      'Resume state label must be concise (▶ Tiếp Tục) to fit 2-column card action grid'
    );
    assert.ok(
      appJsContent.includes("window.TuneFlowI18n.t('btn_pause')"),
      'renderResults in app.js must use concise btn_pause (⏸ Tạm Dừng) for playing song cards'
    );
    assert.match(
      cssContent,
      /\.category-section\s+\.category-pills\s*\{[^}]*flex-wrap:\s*wrap/s,
      'Desktop .category-section .category-pills must use flex-wrap: wrap so pills are never sliced in half'
    );
    assert.match(
      cssContent,
      /\.app-header\s+\.header-actions\s*\{[^}]*grid-auto-flow:\s*dense/s,
      'Desktop .app-header .header-actions must use grid-auto-flow: dense to prevent orphan half-empty rows'
    );
  });

  it('2. Real-DOM Geometry: Zero button clipping, zero sliced category pills, and symmetrical sidebar across desktop viewports & font scales', async () => {
    const server = http.createServer(app);
    const port = await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    });

    const executablePath = await resolveBrowserExecutable();
    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    };
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    const browser = await puppeteer.launch(launchOptions);
    try {
      const page = await browser.newPage();

      // Intercept /api/search with deterministic 6-track fixture (including screaming ALL-CAPS titles)
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/api/search')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              results: [
                {
                  id: 'vid-clip-01',
                  title: 'TÌNH QUÊ COVER | GIAI ĐIỆU QUÊ HƯƠNG NGỌT NGÀO SÂU LẮNG (OFFICIAL MV 4K)',
                  uploader: '19xx Miusic',
                  duration: 292,
                  duration_string: '04:52',
                  thumbnail: '/icons/icon-192.png',
                  url: 'https://www.youtube.com/watch?v=vid-clip-01'
                },
                {
                  id: 'vid-clip-02',
                  title: 'NHỮNG CA KHÚC QUÊ HƯƠNG NGỌT NGÀO SÂU LẮNG - BÙI LÊ MẬN [FULL HD]',
                  uploader: 'Bùi Lê Mận Official',
                  duration: 2631,
                  duration_string: '43:51',
                  thumbnail: '/icons/icon-192.png',
                  url: 'https://www.youtube.com/watch?v=vid-clip-02'
                },
                {
                  id: 'vid-clip-03',
                  title: 'NGỌT NGÀO TÌNH QUÊ | RUMBA BOLERO TRỮ TÌNH CHỌN LỌC HAY NHẤT',
                  uploader: 'VMUSIC',
                  duration: 300,
                  duration_string: '05:00',
                  thumbnail: '/icons/icon-192.png',
                  url: 'https://www.youtube.com/watch?v=vid-clip-03'
                },
                {
                  id: 'vid-clip-04',
                  title: 'ĐÒ SANG NGANG - DÂN CA QUÊ HƯƠNG MIỀN TÂY NGỌT NGÀO',
                  uploader: 'Dân Ca Việt',
                  duration: 315,
                  duration_string: '05:15',
                  thumbnail: '/icons/icon-192.png',
                  url: 'https://www.youtube.com/watch?v=vid-clip-04'
                },
                {
                  id: 'vid-clip-05',
                  title: 'ĐƯỜNG VỀ HAI THÔN - CA NHẠC TRỮ TÌNH QUÊ HƯƠNG CHỌN LỌC',
                  uploader: 'Hương Quê',
                  duration: 280,
                  duration_string: '04:40',
                  thumbnail: '/icons/icon-192.png',
                  url: 'https://www.youtube.com/watch?v=vid-clip-05'
                },
                {
                  id: 'vid-clip-06',
                  title: 'VỀ THĂM QUÊ EM - TUYỂN TẬP NHẠC TRỮ TÌNH QUÊ MẸ ÊM DỊU',
                  uploader: 'Giai Điệu Quê Hương',
                  duration: 340,
                  duration_string: '05:40',
                  thumbnail: '/icons/icon-192.png',
                  url: 'https://www.youtube.com/watch?v=vid-clip-06'
                }
              ]
            })
          });
          return;
        }
        req.continue();
      });

      const viewports = [
        { width: 1185, height: 798, label: 'User Desktop Window (1185x798)' },
        { width: 1024, height: 768, label: 'Compact Desktop Window (1024x768)' },
        { width: 1280, height: 800, label: 'Standard Desktop Window (1280x800)' }
      ];

      await page.setViewport({ width: 1185, height: 798 });
      await page.goto(`http://127.0.0.1:${port}/?desktop=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#category-pills .pill-btn:nth-child(4)', { timeout: 5000 });

      // Click the 4th category pill ("Trữ Tình Quê Mẹ") to trigger song card rendering
      await page.click('#category-pills .pill-btn:nth-child(4)');
      await page.waitForSelector('.results-grid .song-card .btn-preview', { timeout: 5000 });

      for (const vp of viewports) {
        await page.setViewport({ width: vp.width, height: vp.height });
        await new Promise((r) => setTimeout(r, 80));

        const geometry = await page.evaluate(() => {
          const rectOf = (el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
          };

          // 1. Check Left Sidebar Header Actions 2x2 Grid Symmetry
          const headerActions = document.querySelector('.app-header .header-actions');
          const headerBtns = [
            document.getElementById('btn-theme-toggle'),
            document.getElementById('btn-floating-queue'),
            document.getElementById('btn-help'),
            document.getElementById('btn-settings-trigger')
          ].filter(Boolean);
          const fontGroup = document.querySelector('.app-header .font-scale-group');

          const headerBtnMetrics = headerBtns.map((btn) => ({
            id: btn.id,
            text: btn.textContent.trim(),
            scrollWidth: btn.scrollWidth,
            clientWidth: btn.clientWidth,
            rect: rectOf(btn)
          }));

          // 2. Check Category Pills Visibility & Non-Clipping
          const pillsContainer = document.getElementById('category-pills');
          const pillsContainerRect = rectOf(pillsContainer);
          const headerRowRect = rectOf(document.querySelector('.category-section .category-header-row'));
          const pillMetrics = Array.from(document.querySelectorAll('#category-pills .pill-btn')).map((pill) => ({
            text: pill.textContent.trim(),
            scrollWidth: pill.scrollWidth,
            clientWidth: pill.clientWidth,
            rect: rectOf(pill)
          }));

          // 3. Check Song Cards & Action Buttons Non-Clipping
          const cardBtnMetrics = Array.from(document.querySelectorAll('.results-grid .song-card')).map((card) => {
            const previewBtn = card.querySelector('.btn-preview');
            const downloadBtn = card.querySelector('.btn-download');
            const titleEl = card.querySelector('.song-title');
            return {
              id: card.id,
              title: titleEl ? titleEl.textContent.trim() : '',
              previewScrollW: previewBtn ? previewBtn.scrollWidth : 0,
              previewClientW: previewBtn ? previewBtn.clientWidth : 0,
              previewRect: previewBtn ? rectOf(previewBtn) : null,
              downloadScrollW: downloadBtn ? downloadBtn.scrollWidth : 0,
              downloadClientW: downloadBtn ? downloadBtn.clientWidth : 0,
              downloadRect: downloadBtn ? rectOf(downloadBtn) : null
            };
          });

          return {
            docScrollWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            headerActionsRect: rectOf(headerActions),
            fontGroupRect: rectOf(fontGroup),
            headerBtnMetrics,
            pillsContainerRect,
            headerRowRect,
            pillMetrics,
            cardBtnMetrics
          };
        });

        // A. Zero page horizontal overflow
        assert.ok(
          geometry.docScrollWidth <= geometry.innerWidth + 1,
          `[${vp.label}] Page must have zero horizontal overflow (scrollWidth=${geometry.docScrollWidth}, innerWidth=${geometry.innerWidth})`
        );

        // B. Left Sidebar Header Actions: 2x2 symmetrical rows, zero empty holes, fontGroup on Row 3
        assert.strictEqual(geometry.headerBtnMetrics.length, 4, `[${vp.label}] Must have 4 utility buttons in .header-actions`);
        const [b0, b1, b2, b3] = geometry.headerBtnMetrics;
        assert.ok(
          Math.abs(b0.rect.top - b1.rect.top) <= 2,
          `[${vp.label}] Row 1 header buttons (${b0.id}, ${b1.id}) must sit on the same row (top ${b0.rect.top} vs ${b1.rect.top})`
        );
        assert.ok(
          Math.abs(b2.rect.top - b3.rect.top) <= 2,
          `[${vp.label}] Row 2 header buttons (${b2.id}, ${b3.id}) must sit on the same row (top ${b2.rect.top} vs ${b3.rect.top})`
        );
        assert.ok(
          geometry.fontGroupRect.top >= b2.rect.bottom - 1,
          `[${vp.label}] .font-scale-group must sit cleanly on Row 3 below the 2x2 button grid`
        );
        for (const hb of geometry.headerBtnMetrics) {
          assert.ok(
            hb.scrollWidth <= hb.clientWidth + 1,
            `[${vp.label}] Header button #${hb.id} ("${hb.text}") must not clip text (scrollWidth=${hb.scrollWidth}, clientWidth=${hb.clientWidth})`
          );
        }

        // C. Category Pills: All 6 pills 100% visible inside #category-pills, zero sliced pills
        assert.strictEqual(geometry.pillMetrics.length, 6, `[${vp.label}] All 6 category pills must be rendered`);
        for (const pill of geometry.pillMetrics) {
          assert.ok(
            pill.scrollWidth <= pill.clientWidth + 1,
            `[${vp.label}] Category pill "${pill.text}" must not clip its label (scrollWidth=${pill.scrollWidth}, clientWidth=${pill.clientWidth})`
          );
          assert.ok(
            pill.rect.left >= geometry.pillsContainerRect.left - 1 &&
              pill.rect.right <= geometry.pillsContainerRect.right + 1,
            `[${vp.label}] Category pill "${pill.text}" must be 100% visible inside #category-pills without right-edge slicing (pill.right=${pill.rect.right}, container.right=${geometry.pillsContainerRect.right})`
          );
        }
        assert.ok(
          geometry.pillsContainerRect.right <= geometry.headerRowRect.left + 1,
          `[${vp.label}] #category-pills must not overlap .category-header-row vocal filter chips`
        );

        // D. Song Cards & Action Buttons: Zero text clipping on Preview & Download buttons
        assert.strictEqual(geometry.cardBtnMetrics.length, 6, `[${vp.label}] All 6 song cards must be rendered`);
        for (const card of geometry.cardBtnMetrics) {
          assert.ok(
            card.previewScrollW <= card.previewClientW + 1,
            `[${vp.label}] Card ${card.id} preview button must not clip text (scrollWidth=${card.previewScrollW}, clientWidth=${card.previewClientW})`
          );
          assert.ok(
            card.downloadScrollW <= card.downloadClientW + 1,
            `[${vp.label}] Card ${card.id} download button must not clip text (scrollWidth=${card.downloadScrollW}, clientWidth=${card.downloadClientW})`
          );
          assert.ok(
            Math.abs(card.previewRect.top - card.downloadRect.top) <= 2 &&
              card.previewRect.right <= card.downloadRect.left + 1,
            `[${vp.label}] Card ${card.id} preview and download buttons must sit side-by-side without overlapping`
          );
          assert.notStrictEqual(
            card.title,
            card.title.toUpperCase(),
            `[${vp.label}] Card ${card.id} screaming ALL-CAPS title must be normalized to calm Title Case ("${card.title}")`
          );
        }
      }

      // E. Stress-test Playing / Paused / Completed states, all 5 themes, and 130% Font Scale at 1185x798
      await page.setViewport({ width: 1185, height: 798 });
      const stressCheck = await page.evaluate(() => {
        // Test playing & resume button states on card 1 & card 2
        if (window.previewPlayer) {
          window.previewPlayer.highlightCard('vid-clip-01', true, false);
          window.previewPlayer.highlightCard('vid-clip-02', false, false);
        }

        // Cycle through all 5 themes and verify #btn-theme-toggle never clips
        const themeToggleBtn = document.getElementById('btn-theme-toggle');
        const themeClips = [];
        for (let i = 0; i < 5; i++) {
          themeToggleBtn.click();
          if (themeToggleBtn.scrollWidth > themeToggleBtn.clientWidth + 1) {
            themeClips.push({
              theme: document.documentElement.getAttribute('data-theme'),
              text: themeToggleBtn.textContent.trim(),
              scrollWidth: themeToggleBtn.scrollWidth,
              clientWidth: themeToggleBtn.clientWidth
            });
          }
        }

        // Click A+ twice to test 130% font scale
        const btnFontInc = document.getElementById('btn-font-inc');
        btnFontInc.click();
        btnFontInc.click();

        const clippedButtonsAt130 = [];
        document.querySelectorAll('.results-grid .song-card .btn-preview, .results-grid .song-card .btn-download').forEach((btn) => {
          if (btn.scrollWidth > btn.clientWidth + 1) {
            clippedButtonsAt130.push({
              id: btn.id,
              text: btn.textContent.trim(),
              scrollWidth: btn.scrollWidth,
              clientWidth: btn.clientWidth
            });
          }
        });

        // Reset font scale back to 100%
        document.getElementById('btn-font-reset').click();

        return { themeClips, clippedButtonsAt130 };
      });

      assert.deepStrictEqual(
        stressCheck.themeClips,
        [],
        `#btn-theme-toggle must never clip across all 5 themes: ${JSON.stringify(stressCheck.themeClips)}`
      );
      assert.deepStrictEqual(
        stressCheck.clippedButtonsAt130,
        [],
        `Card buttons (including Playing/Resume states) must never clip at 130% font scale: ${JSON.stringify(stressCheck.clippedButtonsAt130)}`
      );

      // F. Search Bar Accessory Non-Overlap (with active query & visible clear button)
      await page.type('#search-input', 'Ca nhạc trữ tình quê hương ngọt ngào');
      const searchBarGeometry = await page.evaluate(() => {
        const rectOf = (el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
        };
        const clearBtn = document.getElementById('btn-clear-search');
        const voiceBtn = document.getElementById('btn-voice-search');
        const searchBtn = document.getElementById('search-btn');
        return {
          clearVisible: window.getComputedStyle(clearBtn).display !== 'none',
          clearRect: rectOf(clearBtn),
          voiceRect: rectOf(voiceBtn),
          searchBtnRect: rectOf(searchBtn),
          searchBtnScrollW: searchBtn.scrollWidth,
          searchBtnClientW: searchBtn.clientWidth
        };
      });

      assert.strictEqual(searchBarGeometry.clearVisible, true, '#btn-clear-search must be visible when #search-input has text');
      assert.ok(
        searchBarGeometry.clearRect.right <= searchBarGeometry.voiceRect.left + 1,
        `#btn-clear-search must not overlap #btn-voice-search (clear.right=${searchBarGeometry.clearRect.right}, voice.left=${searchBarGeometry.voiceRect.left})`
      );
      assert.ok(
        searchBarGeometry.voiceRect.right <= searchBarGeometry.searchBtnRect.left + 1,
        `#btn-voice-search must not overlap #search-btn (voice.right=${searchBarGeometry.voiceRect.right}, searchBtn.left=${searchBarGeometry.searchBtnRect.left})`
      );
      assert.ok(
        searchBarGeometry.searchBtnScrollW <= searchBarGeometry.searchBtnClientW + 1,
        '#search-btn must not clip its label'
      );

      // G. Dad Persona ("Bố Hay Nghe") Category Pills & English (en) Localization Non-Clipping
      const personaAndI18nCheck = await page.evaluate(() => {
        document.getElementById('btn-persona-dad').click();
        const containerRect = document.getElementById('category-pills').getBoundingClientRect();
        const dadPillClips = [];
        document.querySelectorAll('#category-pills .pill-btn').forEach((pill) => {
          const r = pill.getBoundingClientRect();
          if (pill.scrollWidth > pill.clientWidth + 1 || r.right > containerRect.right + 1) {
            dadPillClips.push({
              text: pill.textContent.trim(),
              scrollW: pill.scrollWidth,
              clientW: pill.clientWidth,
              right: r.right,
              containerRight: containerRect.right
            });
          }
        });

        // Switch to English and check card buttons & header buttons
        window.TuneFlowI18n.setLanguage('en');
        const enClips = [];
        document
          .querySelectorAll('.results-grid .song-card .btn-preview, .results-grid .song-card .btn-download, #category-pills .pill-btn')
          .forEach((el) => {
            if (el.scrollWidth > el.clientWidth + 1) {
              enClips.push({ text: el.textContent.trim(), scrollW: el.scrollWidth, clientW: el.clientWidth });
            }
          });

        // Restore Vietnamese & Mom persona
        window.TuneFlowI18n.setLanguage('vi');
        document.getElementById('btn-persona-mom').click();

        return { dadPillClips, enClips };
      });

      assert.deepStrictEqual(
        personaAndI18nCheck.dadPillClips,
        [],
        `Dad persona category pills must be 100% visible and unclipped: ${JSON.stringify(personaAndI18nCheck.dadPillClips)}`
      );
      assert.deepStrictEqual(
        personaAndI18nCheck.enClips,
        [],
        `English localized card buttons and category pills must never clip: ${JSON.stringify(personaAndI18nCheck.enClips)}`
      );

      // H. Bottom Hi-Fi Transport Dock Control Non-Overlap & Idle Visualizer Cleanliness
      const playerDockGeometry = await page.evaluate(() => {
        const visualizer = document.getElementById('player-visualizer');
        const visualizerStyle = window.getComputedStyle(visualizer);
        const ctrlBtns = Array.from(document.querySelectorAll('#bottom-player .player-controls .player-ctrl-btn')).filter(
          (btn) => window.getComputedStyle(btn).display !== 'none'
        );
        const rects = ctrlBtns.map((btn) => ({
          id: btn.id,
          rect: btn.getBoundingClientRect()
        }));
        const overlaps = [];
        for (let i = 0; i < rects.length - 1; i++) {
          if (rects[i].rect.right > rects[i + 1].rect.left + 1) {
            overlaps.push({ leftId: rects[i].id, rightId: rects[i + 1].id });
          }
        }
        return {
          visualizerBorderTopWidth: visualizerStyle.borderTopWidth,
          ctrlCount: rects.length,
          overlaps
        };
      });

      assert.strictEqual(
        playerDockGeometry.visualizerBorderTopWidth,
        '0px',
        '#player-visualizer must have 0px border in idle state so it does not look like an empty input box'
      );
      assert.ok(playerDockGeometry.ctrlCount >= 6, 'Bottom player must render transport control buttons');
      assert.deepStrictEqual(
        playerDockGeometry.overlaps,
        [],
        `Bottom player transport control buttons must not overlap: ${JSON.stringify(playerDockGeometry.overlaps)}`
      );
    } finally {
      await browser.close();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

