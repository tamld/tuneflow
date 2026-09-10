# PRD — Phase 4: Elderly Persona Taxonomy & Smart Zero-Login Curation

## 1. Product Goal
Deeply personalize the audio listening experience for elderly parents through curated presets, rapid vocal vs. instrumental filtering, and local device state persistence for favorites without mandatory account registration or login barriers.

## 2. User Personas
- **Persona 1: Mother**:
  - Preferences: Soothing meditation chants, deep sleep melodies, mindfulness reciting, relaxing acoustic spa music, countryside folk songs.
  - Behavioral pattern: Prefers clicking a prominent lotus icon or dedicated preset tab to immediately trigger familiar melodies without virtual keyboard typing.
- **Persona 2: Father**:
  - Preferences: Classic golden-era ballads, pre-war lyrical melodies, traditional folk opera (Cai Luong), acoustic cultural commentary.
  - Behavioral pattern: Prefers clicking a warm tea cup icon or dedicated preset tab to open favorite anthologies.

## 3. Key Features
- **Hero Persona Bar**: Oversized touch targets ($\ge 64\text{px}$) with intuitive iconography and bilingual badges (`🌸 Mother's Feed`, `☕ Father's Feed`, `❤️ Saved Favorites`).
- **Rapid Vocal Filter Toggle**: Quick switch pill controls: `All` | `Vocal` | `Instrumental`.
- **Zero-Login LocalStorage Engine**: Tapping the heart icon ❤️ instantly records tracks to browser `localStorage`, seamlessly hydrated on subsequent sessions without server accounts.
