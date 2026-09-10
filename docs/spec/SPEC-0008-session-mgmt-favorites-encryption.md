# OpenSpec SPEC-0008: Session Management, Playlist Discovery, Favorites Sync & Sensitive Data Encryption

> **Specification Standard**: OpenSpec Spec Kit Framework  
> **Status**: APPROVED (Merged into master)  
> **Authority**: TamLD (`github.com/tamld/tuneflow`)  
> **Target Audience**: Backend Engineers, Security Reviewers, QA Engineers  
> **Reference Issues**: [#80](https://github.com/tamld/tuneflow/issues/80), [#81](https://github.com/tamld/tuneflow/issues/81), [#84](https://github.com/tamld/tuneflow/issues/84)  
> **Reference PRs**: PR #83, PR #85, PR #86  
> **Release Target**: TuneFlow v2.4.0  

---

## 1. Context & Goals

TuneFlow v2.4.0 addresses three core architectural facets across security, content discovery, and session governance:
1. **Playlist Discovery & Sorting (Issue #80)**: Enables users and elderly parents to search for individual tracks as well as complete albums/playlists, supporting filtering by type (`all`, `video`, `playlist`) and sorting by relevance, view count, or release date.
2. **Session Governance & Emergency Kick-Out (Issue #84)**: Admin dashboard monitors all connected devices accessing the homelab instance, providing granular session revocation or bulk kick-outs by group (`guests`, `users`, `all_except_me`, `revoke-all`).
3. **Account Security & Bi-directional Favorites Sync (Issue #81)**: Self-service password modification (with automatic revocation of other active sessions), Admin-mediated credential resets, account-bound SQLite favorites synchronization, and at-rest client IP protection via authenticated symmetric AES-256-GCM encryption.

---

## 2. Functional Specifications

### 2.1 Playlist Discovery & Search Filters (Issue #80)
- **API Endpoint**: `GET /api/search?q=<query>&type=<all|video|playlist>&sort=<relevance|views|date>`
- **Behavior**:
  - `type=playlist`: Queries yt-dlp with `--flat-playlist`, extracting `id`, `title`, `uploader`, `thumbnail`, and `trackCount`.
  - `type=video`: Restricts results to standalone media items.
  - `type=all`: Merges both standalone videos and playlists.
  - `sort`: Automatically sorts the result array by `view_count` (descending) or `upload_date` (newest first).
  - Fallback: Defaults gracefully to `type=all` and `sort=relevance` if invalid query parameters are supplied.
- **Interface**: WCAG 2.2 AAA pill buttons, specialized playlist cards displaying track count badges, and 1-tap buttons for batch ingestion or detailed inspection.

### 2.2 Session Governance & Emergency Revocation (Issue #84)
- **Data Schema**:
  ```sql
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    user_agent TEXT,
    client_ip TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  ```
- **API Endpoints**:
  - `GET /api/admin/sessions`: Returns active sessions with total count and role distribution metrics.
  - `POST /api/admin/sessions/revoke`: Revokes a specific session by `token`.
  - `POST /api/admin/sessions/revoke-group`: Bulk revocation by operational target:
    - `guests`: Clears all guest sessions and resets cooldown timers.
    - `users`: Terminates all sessions belonging to Family (`user`) accounts.
    - `all_except_me`: Terminates all other user and guest sessions while preserving the caller's active admin session.
  - `POST /api/admin/sessions/revoke-all`: Emergency purge of all active sessions across the database.

### 2.3 Self-Service Password Change & Admin Reset (Issue #81)
- **Self-Service Modification**:
  - `POST /api/auth/change-password`
  - Requires `oldPassword` and `newPassword` (minimum 4 characters).
  - Validates prior password using `scrypt` with cryptographically random salt.
  - Upon success: Automatically purges all other sessions for this user (`deleteSessionsByUser(userId, currentToken)`), preserving current session continuity.
- **Admin Password Reset**:
  - `POST /api/admin/users/:id/reset-password`
  - Restricted strictly to `admin` role.
  - Immediately terminates all active sessions of the target user (`deleteSessionsByUser(userId)`), requiring re-authentication with new credentials.

### 2.4 Bi-directional Favorites Synchronization (Issue #81)
- **Data Schema**:
  ```sql
  CREATE TABLE IF NOT EXISTS user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    uploader TEXT,
    duration INTEGER DEFAULT 0,
    duration_string TEXT,
    thumbnail TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, video_id)
  );
  ```
- **API Endpoints**:
  - `GET /api/user/favorites`: Retrieves server-side favorites for the authenticated user.
  - `POST /api/user/favorites`: Adds a single track to account favorites.
  - `DELETE /api/user/favorites/:id`: Removes a track from favorites.
  - `POST /api/user/favorites/sync`: Ingests an array of favorites from client `localStorage`, merges server and client records, and returns the unified list.

### 2.5 At-Rest Sensitive Data Encryption (AES-256-GCM)
- **Algorithm**: Authenticated symmetric encryption using **AES-256-GCM** (Galois/Counter Mode).
- **Key Derivation**: Generated from master secret via `crypto.scryptSync(secret, salt, 32)`.
- **Leakage Prevention**:
  - `sessions` table: Each record uses a unique 12-byte cryptographically random IV (`crypto.randomBytes(12)`).
  - `guest_quotas` table: Uses deterministic IV derived via HMAC-SHA256 (`HMAC(masterKey, plaintextIp)[:12]`) to facilitate indexed exact matching `WHERE client_ip = ?` without plaintext leakage.
- **Verification**: Binary hex dump inspection of `.db` storage confirms **0 bytes of plaintext IPv4/IPv6** on physical disk.

---

## 3. Acceptance Criteria (AC)

| AC Code | Verification Criterion | Verification Result |
| :--- | :--- | :--- |
| **AC-01** | `GET /api/search` with `type=playlist` returns playlist objects with track counts | PASS (`tests/search-playlist-sort.test.js`) |
| **AC-02** | `GET /api/search` with `sort=views` sorts results by view count descending | PASS (`tests/search-playlist-sort.test.js`) |
| **AC-03** | `POST /api/admin/sessions/revoke-group` for `all_except_me` preserves caller session | PASS (`tests/admin-session-management.test.js`) |
| **AC-04** | `POST /api/admin/sessions/revoke-all` flushes all session records | PASS (`tests/admin-session-management.test.js`) |
| **AC-05** | `POST /api/auth/change-password` rejects incorrect prior password with HTTP 400 | PASS (`tests/security-passwords-favorites-encryption.test.js`) |
| **AC-06** | `POST /api/auth/change-password` terminates other concurrent sessions of the user | PASS (`tests/security-passwords-favorites-encryption.test.js`) |
| **AC-07** | `POST /api/admin/users/:id/reset-password` blocks non-admin callers (HTTP 403) | PASS (`tests/security-passwords-favorites-encryption.test.js`) |
| **AC-08** | `POST /api/user/favorites/sync` performs bi-directional merge and returns unified list | PASS (`tests/security-passwords-favorites-encryption.test.js`) |
| **AC-09** | Raw binary scan of SQLite `.db` yields 0 plaintext IP addresses | PASS (`tests/security-passwords-favorites-encryption.test.js`) |
| **AC-10** | Comprehensive test suite passes with 0 regressions | PASS (`exit code 0`, 0 regressions) |
