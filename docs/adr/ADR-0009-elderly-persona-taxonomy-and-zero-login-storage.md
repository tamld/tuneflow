# ADR-0009: Elderly Persona Taxonomy, Presets Curation, and Zero-Login Local Storage

## Status
Accepted

## Context
Elderly parents often struggle to type precise search queries on virtual keyboards and strongly dislike account registrations, password logins, or OTP verification steps. They require pre-curated channels aligned with daily listening habits and preferences.

## Architectural Decisions
1. **Preset Persona Taxonomy**:
   - 🌸 **Mother's Feed**: Curated presets: Meditation & Sleep, Chanting & Mindfulness, Instrumental Relax & Spa, Folk & Countryside Classics.
   - ☕ **Father's Feed**: Pre-war Melodies, Classic Golden Ballads, Traditional Folk Operas (Cai Luong), News & Acoustic Commentary.
   - 🎛️ **Dual Filter**: Rapid toggle between "Vocal" and "Instrumental" arrangements.
2. **Zero-Login Local Storage**:
   - Store favorites and preferences directly in browser `localStorage`.
   - When parents click favorite ❤️ or "Add to Favorites", state is persisted client-side without server user accounts.
   - Preserves complete zero-login privacy by design (later extended in v2.4.0 with optional server-side sync when logged in).

## Consequences
- Immediate 1-click access to preferred music upon opening the application.
- Eliminates onboarding friction and account management barriers for elderly users.
