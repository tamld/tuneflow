# ADR-0020: Open-Source Asset Governance, Typography Licensing, and Provenance Verification

## Status
Accepted (Active Invariant)

## Context
TuneFlow is distributed across multiple deployment topologies—including standalone Windows installers (`TuneFlow-Setup-2.5.0.exe`), portable archives (`TuneFlow-Portable-2.5.0-win64.zip`), macOS/Linux bundles, and GHCR Docker images. To guarantee zero offline latency and eliminate harsh rendering of Vietnamese diacritics (`ấ`, `ậ`, `ể`, `ỗ`, `ự`) caused by Windows system fonts (`Segoe UI`), TuneFlow bundles local WOFF2 font subsets, vector icons, application logos, and portable media runtimes directly inside the distribution package.

Bundling third-party static assets or fonts without strict license auditing introduces severe legal and intellectual property risks:
1. **Proprietary OS Font Redistribution Trap**: Copying or bundling operating system fonts (`segoeui.ttf`, `SF-Pro.ttf`, `Helvetica.ttc`, `Arial.ttf`) into a software installer violates commercial EULAs.
2. **Commercial Icon & Stock Art Contamination**: Using commercial icon kits (e.g., FontAwesome Pro, Flaticon non-attributed assets) or unverified web images creates copyright liability.
3. **OFL-1.1 Redistribution Condition**: While the SIL Open Font License 1.1 (`OFL-1.1`) permits free bundling and redistribution of fonts alongside commercial or open-source software, Condition 2 strictly requires that the copyright notice and the full `OFL.txt` license text accompany the bundled font files.

```text
+-------------------------------------------------------------------------+
|        ADR-0020: OPEN-SOURCE ASSET GOVERNANCE & LICENSE PIPELINE        |
+-------------------------------------------------------------------------+
|                                                                         |
|  [Candidate Static Asset / Font / Icon / Binary]                        |
|                         |                                               |
|                         v                                               |
|              /\                   /\                                    |
|             /  \  SPDX Whitelist /  \                                   |
|             \  /  Verification   \  /                                   |
|              \/                   \/                                    |
|               |                   |                                     |
|       (Allowed SPDX)      (Proprietary / Unknown)                       |
|               |                   |                                     |
|               v                   v                                     |
|  +-------------------------+  +--------------------------------------+  |
|  | 1. Co-Locate License    |  | REJECTED AT CI GATE (RULE-09)        |  |
|  | - public/fonts/OFL.txt  |  | - Block OS fonts (Segoe, SF Pro)     |  |
|  | - SPDX CSS/SVG headers  |  | - Block paid CDNs (Typekit, FA Pro)  |  |
|  | - LEGAL_COMPLIANCE.md   |  | - Fail tests/open-source-asset-*.js  |  |
|  +-------------------------+  +--------------------------------------+  |
+-------------------------------------------------------------------------+
```

## Decision
We establish a strict **100% Free & Open-Source Asset Policy (RULE-09)** governing all fonts, icons, graphics, stylesheets, and binary dependencies in TuneFlow:

### 1. Approved Open-Source Asset License Whitelist
Every static asset committed to `public/`, `installer/`, or `docs/assets/` MUST be licensed under one of the following permissive or open-source licenses:
- **Fonts**: `OFL-1.1` (SIL Open Font License 1.1) or `Apache-2.0`.
- **Icons, SVGs & Graphics**: `MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `CC0-1.0` (Public Domain), or first-party original project artwork released under `MIT`.
- **Standalone CLI Binaries**: `Unlicense` / Public Domain (`yt-dlp`), `MIT` (`node.exe`), `LGPL-2.1-or-later` / `GPL-2.0-or-later` (`ffmpeg` / `ffprobe` invoked strictly as isolated external child processes via `child_process.spawn` without static or dynamic library linking).

### 2. Strictly Prohibited Assets
- **Zero OS-Extracted Fonts**: Never bundle `.ttf`, `.otf`, `.woff`, or `.woff2` files of proprietary OS typefaces (`Segoe UI`, `San Francisco`, `Arial`, `Tahoma`, `Calibri`, `Helvetica`).System fallback fonts may only be referenced by name in CSS `font-family` stacks after the bundled open-source primary font.
- **Zero Commercial Font/Icon CDNs**: Never link external commercial trackers or paid font/icon CDNs (`use.typekit.net`, `kit.fontawesome.com`, `fast.fonts.net`, `cloud.typography.com`).
- **Zero Unlicensed Raster Media**: Never commit copyrighted album artwork, third-party brand logos, or stock illustrations into the repository.

### 3. Canonical Asset Provenance & SPDX Ledger

| Asset Path | Asset Type | Upstream Source / Author | SPDX License | Co-Located License Artifact |
| :--- | :--- | :--- | :--- | :--- |
| `public/fonts/be-vietnam-pro-*.woff2` (1..12) | Primary UI Typeface (Weights 400, 500, 600, 700; Vietnamese + Latin) | Be Vietnam Pro Project Authors ([bettergui/BeVietnamPro](https://github.com/bettergui/BeVietnamPro)) | `OFL-1.1` | [public/fonts/OFL.txt](../../public/fonts/OFL.txt) |
| `public/fonts/be-vietnam-pro.css` | `@font-face` Stylesheet | TuneFlow / Google Fonts Open Subset Definition | `OFL-1.1` / `MIT` | [public/fonts/OFL.txt](../../public/fonts/OFL.txt) |
| `public/index.html` (`.ui-icon` inline `<svg>`) | 24x24 Stroke Vector Icons | Feather / Lucide Open-Source Primitives & First-Party SVG | `MIT` / `ISC` | [LICENSE](../../LICENSE) |
| `public/js/app.js` (Fallback inline `<svg>`) | Vinyl / Music Note Fallback Graphic | First-Party Original Vector Art | `MIT` | [LICENSE](../../LICENSE) |
| `public/icons/icon-192.png`, `icon-512.png`, `favicon.ico` | Application Launcher & PWA Icons | First-Party Programmatically Generated TuneFlow Icons | `MIT` | [LICENSE](../../LICENSE) |
| `▶`, `⏸`, `↓`, `♡`, `♥`, `•` | Transport & Action Symbols | Unicode Standard Geometric Shapes (`U+25B6`, `U+23F8`, `U+2193`, `U+2661`, `U+2665`) | Public Domain | Unicode Standard |
| `bin/yt-dlp.exe` (Packaged Runtime) | Media Extraction CLI | yt-dlp Project Authors | `Unlicense` | [docs/LEGAL_COMPLIANCE.md](../LEGAL_COMPLIANCE.md) |
| `bin/ffmpeg.exe`, `bin/ffprobe.exe` (Packaged Runtime) | Audio Transcoding Subprocess | FFmpeg Project (Isolated CLI Subprocess Execution) | `LGPL-2.1+` / `GPL-2.0+` | [docs/LEGAL_COMPLIANCE.md](../LEGAL_COMPLIANCE.md) |

### 4. Automated Verification Gate
Compliance is continuously enforced by `tests/open-source-asset-compliance.test.js` (registered as `CLAIM-07` in [docs/claims.yml](../claims.yml)), which mechanically verifies:
1. Presence and integrity of `public/fonts/OFL.txt` and `SPDX-License-Identifier: OFL-1.1` in `public/fonts/be-vietnam-pro.css`.
2. Absence of any unapproved font families or proprietary font binaries in `public/fonts/`.
3. Absence of any external commercial font/icon CDN URLs in `public/index.html` and `public/css/silver-melody.css`.

## Consequences
- **Positive**: 100% legal immunity from font, icon, and graphic copyright disputes across commercial, enterprise, and personal distributions.
- **Positive**: Full offline self-sufficiency—`Be Vietnam Pro` renders identical high-legibility Vietnamese diacritics on Windows, macOS, Linux, and Docker without internet access.
- **Negative / Trade-off**: Any future addition of static fonts or third-party graphics requires updating the provenance ledger and passing `tests/open-source-asset-compliance.test.js`.
