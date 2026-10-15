# ADR-0002: SilverMelody Design System Conforming to WCAG 2.2 AAA Accessibility

## Context
The primary user persona is elderly family members (parents aged 60–75+). Elderly individuals face specific physical and cognitive hurdles:
1. Reduced visual acuity and eye fatigue from stark white screens or inadequate contrast.
2. Motor tremors and declining finger precision, leading to missed clicks on conventional compact buttons (32px–40px).
3. Anxiety when confronted with confusing technical error dialogs or cluttered multi-button dashboards.

## Decision
Establish the **SilverMelody Design Tokens** (governed alongside [ADR-0020](ADR-0020-open-source-asset-governance-and-typography-licensing.md)):
1. **Low-Glare High Contrast (WCAG 2.2 AAA)**:
   - Warm charcoal background: `#131417` (`--bg-main`) and elevated slate cards: `#1a1c21` (`--bg-card`).
   - Low-glare Warm Ivory primary text: `#e6e2d8` (`--text-main`) and Warm Muted Stone secondary text: `#9e9a91` (`--text-sub`), eliminating pure-white (`#ffffff`) retinal halation glare while maintaining WCAG AAA legibility.
   - Soft Champagne Gold accent (`#d99b43`) and Muted Sage status indicator (`#389e78`), plus 4 additional curated themes (`cream`, `wood`, `jade`, `hc`).
2. **Open-Source Vietnamese Typography (`Be Vietnam Pro`, `OFL-1.1`)**:
   - Bundled offline WOFF2 subsets (`public/fonts/be-vietnam-pro-*.woff2`, licensed under SIL Open Font License 1.1 per [ADR-0020](ADR-0020-open-source-asset-governance-and-typography-licensing.md)) replace harsh OS system fonts (`Segoe UI`).
   - Balanced typographic weights (`400` Regular, `500` Medium, `600` SemiBold) with `line-height: 1.48` prevent Vietnamese stacked diacritics (`ấ`, `ậ`, `ể`, `ỗ`, `ự`) from colliding.
   - Automatic `formatCalmTitle()` normalization converts screaming ALL-CAPS YouTube titles into gentle Title Case.
3. **Generous Ergonomic Boundaries & Tonal Glass Controls**:
   - Interactive touch targets are sized $\ge 56\text{px}$ on mobile/tablet and $\ge 38\text{px}$–$44\text{px}$ inside the Desktop 3-Zone App Shell (`@media (min-width: 960px)`).
   - Active pills and card action buttons use soft tonal glass surfaces instead of clashing solid neon blocks.
4. **Empathetic, Jargon-Free Messaging**:
   - Zero raw technical error codes. All status updates communicate progress clearly and politely.

## Consequences
- **Positive**: Elderly users and family members operate the system autonomously without eye fatigue, retinal glare, or diacritic crowding.
- **Negative / Trade-off**: Screen information density is deliberately moderated compared to dense pro-audio DAWs, prioritizing visual calm and readability.
