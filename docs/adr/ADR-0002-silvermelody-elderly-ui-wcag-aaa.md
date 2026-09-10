# ADR-0002: SilverMelody Design System Conforming to WCAG 2.2 AAA Accessibility

## Context
The primary user persona is elderly family members (parents aged 60–75+). Elderly individuals face specific physical and cognitive hurdles:
1. Reduced visual acuity and eye fatigue from stark white screens or inadequate contrast.
2. Motor tremors and declining finger precision, leading to missed clicks on conventional compact buttons (32px–40px).
3. Anxiety when confronted with confusing technical error dialogs or cluttered multi-button dashboards.

## Decision
Establish the **SilverMelody Design Tokens**:
1. **Ultra-High Contrast (WCAG 2.2 AAA)**:
   - Warm charcoal background: `#13141c`.
   - Off-white high-readability text: `#f3f4f6` (contrast ratio $13.5:1$, well above the $7:1$ AAA threshold).
   - Warm amber accent (`#f59e0b`) and jade green status indicator (`#10b981`).
2. **Generous Ergonomic Boundaries**:
   - Interactive touch targets are sized $\ge 56\text{px}$ across all primary buttons.
   - Minimum font size: $18\text{px}$, with track titles rendered in bold $20\text{px}$–$24\text{px}$.
3. **Tactile Mechanical Feedback**:
   - Active state feedback (`transform: scale(0.98)`) and deep drop shadows emulate the tactile response of physical cassette players.
4. **Empathetic, Jargon-Free Messaging**:
   - Zero raw technical error codes. All status updates communicate progress clearly and politely.

## Consequences
- **Positive**: Elderly users operate the system autonomously without step-by-step assistance. Missed clicks and navigation errors are virtually eliminated.
- **Negative / Trade-off**: Screen information density is lower than standard desktop applications, prioritizing comfort and accessibility over compact data display.
