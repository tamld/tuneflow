# FSM — Phase 4: Persona Selection & Curation Interaction State Machine

```mermaid
stateDiagram-v2
    [*] --> DefaultFeed: User visits homepage
    DefaultFeed --> ViewingMom: Click "🌸 Mother's Feed"
    DefaultFeed --> ViewingDad: Click "☕ Father's Feed"
    DefaultFeed --> ViewingFavorites: Click "❤️ Saved Favorites"
    
    state ViewingMom {
        [*] --> MeditationTracks: auto load "Deep Sleep Meditation"
        MeditationTracks --> SpaTracks: select "Spa & Relaxation"
        MeditationTracks --> FolkTracks: select "Countryside Folk"
    }
    
    state ViewingDad {
        [*] --> BoleroTracks: auto load "Golden Era Bolero"
        BoleroTracks --> PreWarTracks: select "Pre-War Classics"
        BoleroTracks --> CaiLuongTracks: select "Traditional Opera"
    }
    
    ViewingMom --> FilterInstrumental: Toggle "Instrumental"
    ViewingDad --> FilterInstrumental: Toggle "Instrumental"
    
    state AudioPreviewOrDownload {
        FilterInstrumental --> Previewing: 1-click listen
        FilterInstrumental --> QueuedDownload: 1-click download
    }
    
    Previewing --> Favorited: Click ❤️ icon
    Favorited --> ViewingFavorites: Synced to localStorage
```
