# FSM — Phase 6: Browser Extension Interaction State Machine

```mermaid
stateDiagram-v2
    [*] --> YouTubePageLoaded: User navigates on youtube.com
    YouTubePageLoaded --> ContentScriptMounted: DOM listener ready
    ContentScriptMounted --> ButtonInjected: `#tuneflow-quick-btn` rendered
    
    ButtonInjected --> UserClicked: Elderly clicks "🎧 Tải Về Cho Ba Mẹ"
    UserClicked --> CheckingServerStatus: ping http://nhac.lan:3000/api/health
    
    state ServerDispatch {
        CheckingServerStatus --> PostingQueue: server online (200 OK)
        PostingQueue --> QueuedSuccess: task accepted
        PostingQueue --> ErrorToast: network / format error
    }
    
    CheckingServerStatus --> OfflineToast: cannot reach nhac.lan
    
    QueuedSuccess --> ShowingProgressNotification: Notification shown
    ShowingProgressNotification --> [*]
```
