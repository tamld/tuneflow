# FSM — Phase 4: Persona Selection & Curation Interaction State Machine

```mermaid
stateDiagram-v2
    [*] --> DefaultFeed: User visits homepage
    DefaultFeed --> ViewingMom: Click "🌸 Mẹ Hay Nghe"
    DefaultFeed --> ViewingDad: Click "☕ Bố Hay Nghe"
    DefaultFeed --> ViewingFavorites: Click "❤️ Bài Đã Thích"
    
    state ViewingMom {
        [*] --> MeditationTracks: auto load "Nhạc thiền ngủ ngon"
        MeditationTracks --> SpaTracks: select "Nhạc spa thư giãn"
        MeditationTracks --> FolkTracks: select "Dân ca quê hương"
    }
    
    state ViewingDad {
        [*] --> BoleroTracks: auto load "Nhạc vàng bolero"
        BoleroTracks --> PreWarTracks: select "Nhạc tiền chiến"
        BoleroTracks --> CaiLuongTracks: select "Cải lương vọng cổ"
    }
    
    ViewingMom --> FilterInstrumental: Toggle "Không lời"
    ViewingDad --> FilterInstrumental: Toggle "Không lời"
    
    state AudioPreviewOrDownload {
        FilterInstrumental --> Previewing: 1-click listen
        FilterInstrumental --> QueuedDownload: 1-click download
    }
    
    Previewing --> Favorited: Click ❤️ icon
    Favorited --> ViewingFavorites: Synced to localStorage
```
