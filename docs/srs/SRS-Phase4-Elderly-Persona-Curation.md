# SRS — Phase 4: Software Requirements Specification (Persona Curation)

## 1. Functional Requirements
- **FR-401 (Persona Presets Endpoint)**:
  - Endpoint: `GET /api/curation/presets`
  - Output: Structured category presets:
    ```json
    {
      "mom": {
        "title": "Mother's Feed",
        "icon": "🌸",
        "queries": ["meditation for sleep", "mindfulness chanting", "spa relaxation instrumental", "countryside folk"]
      },
      "dad": {
        "title": "Father's Feed",
        "icon": "☕",
        "queries": ["golden era bolero", "classic pre-war ballads", "traditional folk opera", "acoustic guitar"]
      }
    }
    ```
- **FR-402 (Vocal Filter Query Transformer)**:
  - Accepts `filter=instrumental` or `filter=vocal` parameters.
  - Backend appends contextual search terms to yt-dlp queries:
    - `filter=instrumental` ➔ `query + " instrumental acoustic"`
    - `filter=vocal` ➔ `query + " vocal lyric"`
- **FR-403 (Client Local Favorites Persistence)**:
  - Persists favorites list in browser storage under key `tuneflow_favorites`.
  - Supports quick export / import across family devices via QR code.

## 2. Non-Functional Requirements
- **NFR-401 (Interaction Latency)**: Persona category switching renders results in $\le 500\text{ms}$ through client-side query caching.
- **NFR-402 (Accessibility Standards)**: Icon dimensions $\ge 32\text{px}$, typography $\ge 18\text{px}$ with high-legibility sans-serif fonts conforming to WCAG 2.2 AAA.
