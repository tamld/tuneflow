const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('ADR-0020 & RULE-09: 100% Free & Open-Source Asset Governance & Typography Licensing', () => {
  const repoRoot = path.join(__dirname, '..');
  const fontsDir = path.join(repoRoot, 'public/fonts');
  const oflPath = path.join(fontsDir, 'OFL.txt');
  const fontCssPath = path.join(fontsDir, 'be-vietnam-pro.css');
  const adr0020Path = path.join(repoRoot, 'docs/adr/ADR-0020-open-source-asset-governance-and-typography-licensing.md');
  const legalCompliancePath = path.join(repoRoot, 'docs/LEGAL_COMPLIANCE.md');
  const indexHtmlPath = path.join(repoRoot, 'public/index.html');
  const mainCssPath = path.join(repoRoot, 'public/css/silver-melody.css');
  const pkgJsonPath = path.join(repoRoot, 'package.json');

  test('1. Bundled Be Vietnam Pro font includes co-located SIL Open Font License 1.1 (public/fonts/OFL.txt)', () => {
    assert.ok(fs.existsSync(oflPath), 'public/fonts/OFL.txt must exist alongside bundled .woff2 files');
    const oflText = fs.readFileSync(oflPath, 'utf-8');
    assert.ok(
      oflText.includes('SIL OPEN FONT LICENSE Version 1.1'),
      'public/fonts/OFL.txt must contain the full SIL Open Font License Version 1.1 text'
    );
    assert.ok(
      oflText.includes('The Be Vietnam Pro Project Authors'),
      'public/fonts/OFL.txt must preserve the upstream Be Vietnam Pro copyright attribution'
    );
  });

  test('2. Font stylesheet (be-vietnam-pro.css) declares SPDX-License-Identifier: OFL-1.1 and only loads local open-source subsets', () => {
    assert.ok(fs.existsSync(fontCssPath), 'public/fonts/be-vietnam-pro.css must exist');
    const fontCss = fs.readFileSync(fontCssPath, 'utf-8');
    assert.ok(
      fontCss.includes('SPDX-License-Identifier: OFL-1.1'),
      'be-vietnam-pro.css must declare SPDX-License-Identifier: OFL-1.1'
    );
    const urls = [...fontCss.matchAll(/url\(([^)]+)\)/g)].map(m => m[1].replace(/['"]/g, '').trim());
    assert.ok(urls.length === 12, `Expected 12 local WOFF2 subsets, found ${urls.length}`);
    for (const u of urls) {
      assert.ok(
        u.startsWith('/fonts/be-vietnam-pro-') && u.endsWith('.woff2'),
        `Every @font-face src must point to local open-source /fonts/be-vietnam-pro-*.woff2, got: ${u}`
      );
      const localFile = path.join(repoRoot, 'public', u);
      assert.ok(fs.existsSync(localFile), `Bundled WOFF2 file missing on disk: ${localFile}`);
    }
  });

  test('3. Zero proprietary OS fonts or unlicensed font binaries exist in public/fonts/', () => {
    const files = fs.readdirSync(fontsDir);
    const prohibitedPatterns = [/segoe/i, /sf-pro/i, /san-francisco/i, /helvetica/i, /arial/i, /calibri/i, /tahoma/i, /times-new-roman/i];
    for (const file of files) {
      for (const pattern of prohibitedPatterns) {
        assert.ok(
          !pattern.test(file),
          `Prohibited proprietary OS font file detected in public/fonts/: ${file}`
        );
      }
      assert.ok(
        file === 'OFL.txt' || file === 'be-vietnam-pro.css' || /^be-vietnam-pro-\d+\.woff2$/.test(file),
        `Unregistered file in public/fonts/ must be audited in ADR-0020 before bundling: ${file}`
      );
    }
  });

  test('4. Zero commercial font/icon CDNs or tracking asset links in index.html and silver-melody.css', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    const css = fs.readFileSync(mainCssPath, 'utf-8');
    const bannedCdns = [
      'use.typekit.net',
      'kit.fontawesome.com',
      'pro.fontawesome.com',
      'fast.fonts.net',
      'cloud.typography.com',
      'myfonts.net'
    ];
    for (const cdn of bannedCdns) {
      assert.ok(!html.includes(cdn), `index.html must not reference commercial CDN: ${cdn}`);
      assert.ok(!css.includes(cdn), `silver-melody.css must not reference commercial CDN: ${cdn}`);
    }
  });

  test('5. ADR-0020, LEGAL_COMPLIANCE.md, and package.json document open-source licensing clearly', () => {
    assert.ok(fs.existsSync(adr0020Path), 'ADR-0020 must exist in docs/adr/');
    const adrContent = fs.readFileSync(adr0020Path, 'utf-8');
    assert.ok(adrContent.includes('OFL-1.1') && adrContent.includes('RULE-09'), 'ADR-0020 must document OFL-1.1 and RULE-09');

    const legalContent = fs.readFileSync(legalCompliancePath, 'utf-8');
    assert.ok(legalContent.includes('ADR-0020') && legalContent.includes('OFL-1.1'), 'LEGAL_COMPLIANCE.md must include the ADR-0020 attribution ledger');

    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
    assert.strictEqual(pkg.license, 'MIT', 'package.json license must be MIT');
  });
});
