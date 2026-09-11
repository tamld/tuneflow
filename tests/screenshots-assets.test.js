const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Issue #127: README Screenshots & Visual Showcase Asset Validation', () => {
  const rootDir = path.resolve(__dirname, '..');
  const screenshotsDir = path.join(rootDir, 'docs', 'assets', 'screenshots');
  const expectedScreenshots = [
    'desktop-player.png',
    'mobile-pwa.png',
    'tv-leanback.png'
  ];

  it('should verify screenshot directory exists and contains all required visual assets', () => {
    assert.ok(fs.existsSync(screenshotsDir), 'docs/assets/screenshots directory must exist');
    for (const filename of expectedScreenshots) {
      const filePath = path.join(screenshotsDir, filename);
      assert.ok(fs.existsSync(filePath), `Screenshot ${filename} must exist on disk`);
      const stat = fs.statSync(filePath);
      assert.ok(stat.size > 50000, `Screenshot ${filename} must be substantial image file (>50KB), got ${stat.size} bytes`);

      // Verify PNG magic header: \x89 P N G \r \n \x1a \n
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(8);
      fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);
      const isPng = buffer[0] === 0x89 &&
                    buffer[1] === 0x50 && // P
                    buffer[2] === 0x4E && // N
                    buffer[3] === 0x47 && // G
                    buffer[4] === 0x0D &&
                    buffer[5] === 0x0A &&
                    buffer[6] === 0x1A &&
                    buffer[7] === 0x0A;
      assert.ok(isPng, `File ${filename} must have valid PNG magic signature`);
    }
  });

  it('should verify README.md and README.vi.md link to existing screenshot assets', () => {
    const readmeEn = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf-8');
    const readmeVi = fs.readFileSync(path.join(rootDir, 'README.vi.md'), 'utf-8');

    for (const filename of expectedScreenshots) {
      const expectedPath = `docs/assets/screenshots/${filename}`;
      assert.ok(readmeEn.includes(expectedPath), `README.md must reference ${expectedPath}`);
      assert.ok(readmeVi.includes(expectedPath), `README.vi.md must reference ${expectedPath}`);
    }
  });

  it('should verify capture_screenshots.js automation script exists and exports lifecycle', () => {
    const scriptPath = path.join(rootDir, 'scripts', 'capture_screenshots.js');
    assert.ok(fs.existsSync(scriptPath), 'scripts/capture_screenshots.js must exist');
    const scriptModule = require(scriptPath);
    assert.strictEqual(typeof scriptModule.capture, 'function', 'capture_screenshots.js must export a capture function');
  });
});
