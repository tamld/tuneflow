# Legal Compliance & Safe Operation Architecture
## Project: TuneFlow

> **Standard**: Personal Non-Commercial Use, DMCA Fair Use Principles, and Homelab Boundary  
> **Status**: APPROVED (Active SSoT)  

---

## 1. Regulatory Context & Intended Scope

TuneFlow is designed strictly as a self-hosted, private homelab application for family accessibility. It is engineered to assist elderly individuals in listening to music without being exposed to deceptive pop-ups, malware, or phishing advertisements.

### Prohibited Uses
- Commercial redistribution, resale, or subscription streaming.
- Public broadcasting or unlicensed monetization of downloaded media.
- Bypassing DRM protections on encrypted or subscriber-gated content.

---

## 2. Technical Safeguards

1. **Zero Public Cloud Relay**:
   - TuneFlow operates strictly on the user's private local infrastructure.
   - The application does not centralize or mirror audio files on external servers.
2. **Client-Side Media Ownership**:
   - Media files are transferred directly to the user's local browser storage.
   - The server employs automated FIFO pruning (`STORAGE_MAX_MB`) to prevent accumulation of persistent archives.
3. **Respect for Origin Content**:
   - When streaming preview audio, TuneFlow acts as a pass-through proxy to YouTube's public streams.
   - No modifications are made to underlying audio tracks during streaming.

---

## 3. Licensing & Statutory Framework

1. **Open Source Licensing**:
   - TuneFlow software code is distributed under the [MIT License](https://opensource.org/licenses/MIT).
2. **Personal Fair Use**:
   - The software is intended exclusively for private, non-commercial **Personal Fair Use** under 17 U.S.C. § 107.
3. **DMCA Safe Harbor Principles**:
   - TuneFlow operates as a decentralized, self-hosted software utility with zero centralized media hosting or content distribution infrastructure, adhering to **DMCA Safe Harbor** provisions under 17 U.S.C. § **512**.

---

## 4. Open-Source Asset & Third-Party Attribution Ledger (ADR-0020)

Per [ADR-0020](adr/ADR-0020-open-source-asset-governance-and-typography-licensing.md), TuneFlow strictly enforces a **100% Free & Open-Source Asset Policy (RULE-09)** across all bundled fonts, icons, graphics, and runtime utilities:

| Component / Asset | Upstream Project / Author | SPDX License | Attribution & License Location |
| :--- | :--- | :--- | :--- |
| **Be Vietnam Pro Font** (`public/fonts/be-vietnam-pro-*.woff2`) | The Be Vietnam Pro Project Authors ([bettergui/BeVietnamPro](https://github.com/bettergui/BeVietnamPro)) | `OFL-1.1` (SIL Open Font License 1.1) | [public/fonts/OFL.txt](../public/fonts/OFL.txt) |
| **Inline SVG UI Icons** (`public/index.html`, `.ui-icon`) | Feather / Lucide Open-Source Vector Primitives & TuneFlow Original SVGs | `MIT` / `ISC` | [LICENSE](../LICENSE) |
| **Application & PWA Icons** (`public/icons/icon-*.png`, `favicon.ico`) | TuneFlow Original First-Party Vector Artwork | `MIT` | [LICENSE](../LICENSE) |
| **Monochrome Transport Symbols** (`▶`, `⏸`, `↓`, `♡`, `♥`, `•`) | Unicode Standard Geometric Shapes (`U+25B6`, `U+23F8`, `U+2193`, `U+2661`, `U+2665`) | Public Domain | Unicode Standard |
| **Node.js Portable Runtime** (`bin/node.exe`) | OpenJS Foundation | `MIT` | Upstream Node.js License |
| **yt-dlp CLI Binary** (`bin/yt-dlp.exe`) | yt-dlp Contributors | `Unlicense` (Public Domain) | Upstream yt-dlp Unlicense |
| **FFmpeg / FFprobe CLI** (`bin/ffmpeg.exe`, `bin/ffprobe.exe`) | FFmpeg Project (Invoked strictly as isolated external CLI subprocesses) | `LGPL-2.1+` / `GPL-2.0+` | Upstream FFmpeg License |

