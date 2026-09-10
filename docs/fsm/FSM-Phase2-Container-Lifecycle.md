# FSM — Phase 2: Container Lifecycle & Auto-Recovery State Machine

```mermaid
stateDiagram-v2
    [*] --> Starting: docker compose up -d
    Starting --> CheckingDeps: Node runtime init
    CheckingDeps --> Healthy: ytdlp & ffmpeg binary ok
    CheckingDeps --> CrashBackoff: missing binary / permission error
    
    state Healthy {
        [*] --> IdleServing: port 3000 listening
        IdleServing --> Transcoding: active queue job > 0
        Transcoding --> IdleServing: jobs done, RAM returned
    }
    
    Healthy --> Degraded: memory > 200MB / child_process hung
    Degraded --> SelfClean: kill hung processes & clear temp/
    SelfClean --> Healthy: recovered
    
    CrashBackoff --> Starting: Docker restart policy (unless-stopped)
    Healthy --> Terminating: SIGTERM / SIGINT
    Terminating --> [*]: clean exit code 0
```

## State Transitions
1. **Starting ➔ CheckingDeps**: Spawns Node.js process, validates environment variables, and verifies write permissions on `downloads/`.
2. **CheckingDeps ➔ Healthy**: Confirms `ffmpeg -version` and `yt-dlp --version` execution success. Binds port 3000.
3. **Healthy ➔ Degraded**: Memory utilization exceeds threshold or a child process hangs past timeout (600s).
4. **Degraded ➔ SelfClean**: Automatically terminates dangling child processes and sweeps orphaned `.part` files.
5. **Terminating ➔ Exit**: Traps `SIGTERM` / `SIGINT` from Docker host, gracefully flushes active connections, and exits with code 0.
