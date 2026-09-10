# ⚙️ TuneFlow Configuration Reference

Complete guide to TuneFlow environment variables and runtime settings.

---

## Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP port TuneFlow listens on |
| `NODE_ENV` | `production` | Execution mode (`production` or `development`) |
| `ADMIN_PASSWORD` | `admin` | Initial password for the default `admin` account |
| `DB_PATH` | `./data/tuneflow.db` | Path to persistent SQLite database |
| `DOWNLOADS_DIR` | `./downloads` | Directory where downloaded media files are saved |
| `STORAGE_MAX_MB` | `20480` (20GB) | Disk threshold before oldest media is automatically pruned (FIFO) |
| `GUEST_MAX_LISTEN_SEC` | `1800` (30m) | Cumulative preview listening duration for guests before cooldown |
| `GUEST_COOLDOWN_SEC` | `1800` (30m) | Cooldown duration before a guest's listening quota resets |
| `MAX_DOWNLOADS` | `2` | Maximum concurrent background download processes |
| `MAX_CONVERSIONS` | `1` | Maximum concurrent audio transcoding processes |
| `MAX_RETRIES` | `3` | Maximum download retry attempts on network failure |
| `YTDLP_PROXY` | *None* | Optional HTTP/SOCKS5 proxy URL for YouTube requests |
| `YTDLP_EXTRACTOR_ARGS` | *None* | Custom `yt-dlp` extractor flags (e.g., `youtube:player_client=android,web`) |

---

## Security & Encryption
- **Data at Rest:** Client IP addresses and active session tokens are automatically encrypted with AES-256-GCM before storage in SQLite.
- **Role-Based Access Control:**
  - `admin`: Full system management, user accounts, sessions, diagnostic metrics, and 1-click `yt-dlp` updates.
  - `user`: Unlimited streaming, server-side favorites sync, and downloads.
  - `guest`: Read-only preview streaming with 30-minute quota enforcement.
