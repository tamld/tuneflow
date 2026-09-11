const fs = require('fs');
const path = require('path');
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

async function capture() {
  const chromePath = getSystemChromePath();
  if (!chromePath) {
    throw new Error('No compatible Chrome/Edge browser found for screenshot capture.');
  }

  const server = app.listen(0, '127.0.0.1');
  await new Promise(r => server.on('listening', r));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const outDir = path.join(__dirname, '..', 'docs', 'assets', 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });

  const svgThumb1 = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#831843"/><stop offset="100%" stop-color="#1e1b4b"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g1)"/><circle cx="160" cy="90" r="45" fill="#f43f5e" opacity="0.8"/><circle cx="160" cy="90" r="20" fill="#111827"/><circle cx="160" cy="90" r="6" fill="#f59e0b"/><text x="160" y="155" font-family="sans-serif" font-size="14" font-weight="bold" fill="#fef08a" text-anchor="middle">BOLERO TRỮ TÌNH</text></svg>');
  const svgThumb2 = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#064e3b"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g2)"/><path d="M110 130 L160 50 L210 130 Z" fill="#10b981" opacity="0.7"/><circle cx="210" cy="70" r="24" fill="#fbbf24" opacity="0.85"/><text x="160" y="155" font-family="sans-serif" font-size="14" font-weight="bold" fill="#a7f3d0" text-anchor="middle">NHẠC VÀNG QUÊ HƯƠNG</text></svg>');
  const svgThumb3 = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4c1d95"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g3)"/><circle cx="160" cy="85" r="40" fill="#d97706" opacity="0.8"/><polygon points="152,70 176,85 152,100" fill="#fff"/><text x="160" y="155" font-family="sans-serif" font-size="14" font-weight="bold" fill="#fed7aa" text-anchor="middle">TUYỆT PHẨM ALBUM</text></svg>');

  try {
    // 1. Desktop Screenshot (1440x900, 2x retina)
    console.log('Capturing Desktop Player UI...');
    const pageDesk = await browser.newPage();
    await pageDesk.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await pageDesk.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await pageDesk.evaluate((t1, t2, t3) => {
      window.setLastSearchResults([
        { id: 'track1', title: 'Sầu Tím Thiệp Hồng (Song Ca Bất Hủ)', uploader: 'Quang Lê & Lệ Quyên', duration: 312, thumbnail: t1 },
        { id: 'track2', title: 'Thành Phố Buồn (Thu Âm Trước 1975)', uploader: 'Chế Linh', duration: 295, thumbnail: t2 },
        { id: 'PLbolero', title: 'Tuyển Tập 20 Bản Bolero Bất Hủ Hay Nhất', uploader: 'Sài Gòn Bolero', isPlaylist: true, duration: 3600, thumbnail: t3 }
      ], 'Nhạc Vàng & Bolero');

      if (window.previewPlayer) {
        window.previewPlayer.currentTrack = { id: 'track1', title: 'Sầu Tím Thiệp Hồng (Song Ca Bất Hủ)', uploader: 'Quang Lê & Lệ Quyên', duration: 312 };
        window.previewPlayer.isPlaying = true;
        if (window.previewPlayer.playerContainer) {
          window.previewPlayer.playerContainer.classList.add('visible');
        }
        if (window.previewPlayer.trackTitle) {
          window.previewPlayer.trackTitle.textContent = 'Sầu Tím Thiệp Hồng (Song Ca Bất Hủ) - Quang Lê & Lệ Quyên';
        }
        if (window.previewPlayer.trackStatus) {
          window.previewPlayer.trackStatus.textContent = '🟢 Đang nghe thử trực tiếp...';
        }
        if (window.previewPlayer.timeCurrent) {
          window.previewPlayer.timeCurrent.textContent = '01:28';
        }
        if (window.previewPlayer.timeTotal) {
          window.previewPlayer.timeTotal.textContent = '05:12';
        }
        if (window.previewPlayer.progressBar) {
          window.previewPlayer.progressBar.value = 28;
        }
        window.previewPlayer.updatePlayPauseIcon();
        if (window.previewPlayer.btnEq) {
          window.previewPlayer.btnEq.textContent = '🗣️';
          window.previewPlayer.btnEq.classList.add('active');
        }
        if (window.previewPlayer.btnBoost) {
          window.previewPlayer.btnBoost.textContent = '⚡ 125%';
          window.previewPlayer.btnBoost.classList.add('active');
        }
      }
      window.scrollBy(0, 220);
    }, svgThumb1, svgThumb2, svgThumb3);
    await new Promise(r => setTimeout(r, 600));
    await pageDesk.screenshot({ path: path.join(outDir, 'desktop-player.png') });
    await pageDesk.close();

    // 2. Mobile Screenshot (390x844, 2x retina)
    console.log('Capturing Mobile PWA UI...');
    const pageMob = await browser.newPage();
    await pageMob.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pageMob.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await pageMob.evaluate((t1, t2) => {
      window.setLastSearchResults([
        { id: 'track1', title: 'Sầu Tím Thiệp Hồng (Song Ca)', uploader: 'Quang Lê & Lệ Quyên', duration: 312, thumbnail: t1 },
        { id: 'track2', title: 'Thành Phố Buồn (Pre-1975)', uploader: 'Chế Linh', duration: 295, thumbnail: t2 }
      ], 'Bolero Chọn Lọc');
      if (window.previewPlayer) {
        window.previewPlayer.currentTrack = { id: 'track1', title: 'Sầu Tím Thiệp Hồng (Song Ca)', uploader: 'Quang Lê & Lệ Quyên', duration: 312 };
        window.previewPlayer.isPlaying = true;
        if (window.previewPlayer.playerContainer) {
          window.previewPlayer.playerContainer.classList.add('visible');
        }
        if (window.previewPlayer.trackTitle) {
          window.previewPlayer.trackTitle.textContent = 'Sầu Tím Thiệp Hồng - Quang Lê & Lệ Quyên';
        }
        if (window.previewPlayer.timeCurrent) {
          window.previewPlayer.timeCurrent.textContent = '01:28';
        }
        if (window.previewPlayer.timeTotal) {
          window.previewPlayer.timeTotal.textContent = '05:12';
        }
        if (window.previewPlayer.progressBar) {
          window.previewPlayer.progressBar.value = 28;
        }
        window.previewPlayer.updatePlayPauseIcon();
      }
      const grid = document.getElementById('results-grid');
      if (grid) {
        grid.scrollIntoView({ block: 'center' });
      } else {
        window.scrollBy(0, 500);
      }
    }, svgThumb1, svgThumb2);
    await new Promise(r => setTimeout(r, 600));
    await pageMob.screenshot({ path: path.join(outDir, 'mobile-pwa.png') });
    await pageMob.close();

    // 3. Android TV Leanback Screenshot (1920x1080, 1.5x)
    console.log('Capturing Android TV Leanback UI...');
    const pageTv = await browser.newPage();
    await pageTv.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1.5 });
    await pageTv.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await pageTv.evaluate((t1, t2, t3) => {
      window.setLastSearchResults([
        { id: 'track1', title: 'Sầu Tím Thiệp Hồng', uploader: 'Quang Lê & Lệ Quyên', duration: 312, thumbnail: t1 },
        { id: 'track2', title: 'Thành Phố Buồn', uploader: 'Chế Linh', duration: 295, thumbnail: t2 },
        { id: 'PLbolero', title: 'Tuyển Tập 20 Bản Bolero Bất Hủ Hay Nhất', uploader: 'Sài Gòn Bolero', isPlaylist: true, duration: 3600, thumbnail: t3 }
      ], 'Nhạc Tuyển Chọn');
      if (window.tvLeanback) {
        window.tvLeanback.enableTVMode(false);
        const playBtn = document.querySelector('.btn-preview');
        if (playBtn) {
          window.tvLeanback.setFocus(playBtn);
        } else {
          const firstCard = document.querySelector('.song-card');
          if (firstCard) window.tvLeanback.setFocus(firstCard);
        }
      }
      window.scrollBy(0, 180);
    }, svgThumb1, svgThumb2, svgThumb3);
    await new Promise(r => setTimeout(r, 800));
    await pageTv.screenshot({ path: path.join(outDir, 'tv-leanback.png') });
    await pageTv.close();

    console.log('✅ All screenshots captured successfully in docs/assets/screenshots/');
  } finally {
    await browser.close();
    server.close();
  }
}

if (require.main === module) {
  capture().catch(err => {
    console.error('❌ Capture error:', err);
    process.exit(1);
  });
}

module.exports = { capture };
