const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('SPEC-0016: 3-Zone Desktop App Shell, Instant Curated Shelf & Native Windows DWM Host', () => {
  const indexPath = path.join(__dirname, '../public/index.html');
  const cssPath = path.join(__dirname, '../public/css/silver-melody.css');
  const appJsPath = path.join(__dirname, '../public/js/app.js');
  const swJsPath = path.join(__dirname, '../public/sw.js');
  const launcherCsPath = path.join(__dirname, '../installer/windows/TuneFlowLauncher.cs');

  const indexHtml = fs.readFileSync(indexPath, 'utf-8');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const appJs = fs.readFileSync(appJsPath, 'utf-8');
  const swJs = fs.readFileSync(swJsPath, 'utf-8');
  const launcherCs = fs.readFileSync(launcherCsPath, 'utf-8');

  test('1. Desktop 3-Zone App Shell (@media min-width: 960px) locks 100vh viewport with Sidebar + Main Stage Grid', () => {
    assert.ok(
      cssContent.includes('@media (min-width: 960px)'),
      'silver-melody.css must define @media (min-width: 960px) Desktop App Shell breakpoint'
    );
    assert.ok(
      cssContent.includes('grid-template-columns: 288px minmax(0, 1fr)'),
      'Desktop .container must use 2-column App Shell grid (288px sidebar + 1fr main stage)'
    );
    assert.ok(
      cssContent.includes('user-select: none'),
      'Desktop App Shell must disable accidental webpage text selection on UI controls'
    );
  });

  test('2. Persistent Bottom Hi-Fi Transport Dock (#player-bar) stays visible on Desktop in idle state', () => {
    assert.ok(
      cssContent.includes('.player-bar.hidden') && cssContent.includes('display: flex !important'),
      'Desktop #player-bar must remain docked and visible in idle state via @media (min-width: 960px)'
    );
    assert.ok(
      indexHtml.includes('id="meta-theme-color"'),
      'index.html must include <meta name="theme-color" id="meta-theme-color"> for dynamic OS titlebar tinting'
    );
  });

  test('3. Instant Curated Music Shelf renders showcase album cards on startup before search', () => {
    assert.ok(
      appJs.includes('function renderCuratedStarterShelf('),
      'app.js must define renderCuratedStarterShelf(personaKey) for instant startup music cards'
    );
    assert.ok(
      appJs.includes('curated-shelf-card'),
      'renderCuratedStarterShelf must render .curated-shelf-card items inside #results-grid'
    );
    assert.ok(
      cssContent.includes('.curated-shelf-card'),
      'silver-melody.css must style .curated-shelf-card for the startup album shelf'
    );
  });

  test('4. Service Worker (sw.js) bypasses cache lock-in on local desktop engine (127.0.0.1 / localhost)', () => {
    assert.ok(
      swJs.includes("CACHE_NAME = 'tuneflow-v2.5.0'"),
      'sw.js must align CACHE_NAME with package.json version tuneflow-v2.5.0'
    );
    assert.ok(
      swJs.includes("url.hostname === '127.0.0.1' || url.hostname === 'localhost'"),
      'sw.js must bypass stale cache lock-in when running on local desktop engine'
    );
  });

  test('5. Native Windows Host (TuneFlowLauncher.cs) enforces Win32 DWM Dark Titlebar & SW Cache Sanitizer', () => {
    assert.ok(
      launcherCs.includes('DwmSetWindowAttribute'),
      'TuneFlowLauncher.cs must P/Invoke DwmSetWindowAttribute from dwmapi.dll'
    );
    assert.ok(
      launcherCs.includes('DWMWA_USE_IMMERSIVE_DARK_MODE'),
      'TuneFlowLauncher.cs must apply DWMWA_USE_IMMERSIVE_DARK_MODE (20) to eliminate white titlebar'
    );
    assert.ok(
      launcherCs.includes('DWMWA_CAPTION_COLOR'),
      'TuneFlowLauncher.cs must apply DWMWA_CAPTION_COLOR (35) to tint window frame #121316'
    );
    assert.ok(
      launcherCs.includes('PurgeStaleBrowserCache'),
      'TuneFlowLauncher.cs must purge stale Service Worker and HTTP cache in AppProfile on launch'
    );
  });

  test('6. Desktop Vertical Media Card Grid & L1 Client-Side LRU Query Cache eliminate horizontal overflow and tab latency', () => {
    assert.ok(
      cssContent.includes('grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))'),
      'Desktop .results-grid must use auto-fill vertical media card columns to prevent horizontal overflow'
    );
    assert.ok(
      cssContent.includes('@keyframes stageCardFadeIn'),
      'silver-melody.css must animate card transitions smoothly via stageCardFadeIn'
    );
    assert.ok(
      appJs.includes('searchLruCache') && appJs.includes('getCachedSearch') && appJs.includes('setCachedSearch'),
      'app.js must implement L1 Client-Side LRU Query Cache (searchLruCache) for instant tab/category switching'
    );
  });

  test('7. Low-Glare Vietnamese Typography (Be Vietnam Pro) & Editorial Title Normalization eliminate eye strain', () => {
    assert.ok(
      indexHtml.includes('/fonts/be-vietnam-pro.css'),
      'index.html must load local /fonts/be-vietnam-pro.css for clean Vietnamese diacritic rendering'
    );
    assert.ok(
      cssContent.includes("'Be Vietnam Pro'"),
      'silver-melody.css must use Be Vietnam Pro as primary --font-family'
    );
    assert.ok(
      cssContent.includes('--text-main: #e6e2d8;') && cssContent.includes('--accent-gold: #d99b43;'),
      'silver-melody.css must use low-glare Warm Ivory (#e6e2d8) and Soft Champagne Gold (#d99b43)'
    );
    assert.ok(
      appJs.includes('function formatCalmTitle('),
      'app.js must normalize screaming ALL-CAPS YouTube titles via formatCalmTitle()'
    );
  });
});


