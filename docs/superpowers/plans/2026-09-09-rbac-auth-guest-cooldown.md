# Implementation Plan: SQLite-Backed RBAC Authentication & Guest Listening Cooldown

**Target Issue:** [#52 - feat(security): SQLite-backed RBAC auth, admin/user/guest roles, and 30-min guest listening cooldown](https://github.com/tamld/tuneflow/issues/52)  
**Branch:** `feat/rbac-auth-guest-cooldown-52`  
**Standard:** Superpowers End-to-End Task Lifecycle (DoR -> Plan -> TDD -> DoD)  
**Date:** 2026-09-09  

---

## 1. Context & Business Intent

TuneFlow is an elderly-friendly, self-hosted YouTube audio player and downloader built for Homelab and family use. When exposed to the public Internet (e.g. via Cloudflare Tunnel or reverse proxy), it faces high risks:
1. **Server Abuse & Resource Starvation**: Unrestricted scraping or automated queue spamming triggers heavy yt-dlp processes that saturate CPU, memory, and bandwidth.
2. **Access Control Needs**:
   - **Admin (Tier 1)**: System administrators managing users, viewing diagnostic metrics, executing maintenance/updates, and resetting guest quotas.
   - **User (Tier 2)**: Family members (Bố, Mẹ, Con cháu) with unmetered music streaming, personal playback, and queue downloads.
   - **Guest (Tier 3)**: Internet visitors allowed a **30-minute cumulative listening quota** (1800 seconds). Once 30 minutes are consumed, the audio stream immediately terminates, entering a **60-minute cooldown**. Heavy download actions (`/api/queue/add`) are strictly restricted.

---

## 2. Definition of Ready (DoR) Checklist

- [x] **Requirement Clarity**: Three explicit tiers (Admin, User, Guest) with deterministic quotas and cooldown semantics.
- [x] **Zero-External DB Requirement**: Native Node.js `node:sqlite` (`DatabaseSync`) used with zero npm bloat, ensuring high portability across Docker, Podman, and edge devices.
- [x] **Clean Baseline**: All 107 existing unit, integration, and security tests pass green (`exit 0`).
- [x] **Isolated Topic Branch**: Checked out on `feat/rbac-auth-guest-cooldown-52`.
- [x] **Separation of Concerns (SoC)**: Clean isolation between DB storage, cryptographic utilities, domain business logic, HTTP middleware, and API controllers.

---

## 3. SoC Architecture & Component Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HTTP / REST API LAYER                           │
│  /api/auth/*          /api/admin/*         /api/preview & /api/stream  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       MIDDLEWARE SECURITY GATES                        │
│   authenticate.js  ──►  authorize.js (RBAC)  ──►  guest_guard.js       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        CORE DOMAIN SERVICES                            │
│           auth_service.js               crypto_utils.js                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      DATA ACCESS REPOSITORIES                          │
│       user_repo.js         session_repo.js         guest_repo.js       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     NATIVE SQLITE STORAGE ENGINE                       │
│      node:sqlite (DatabaseSync) with WAL Mode & Foreign Keys           │
└────────────────────────────────────────────────────────────────────────┘
```

### Database Schema (`src/db/schema.sql`)
1. `users`:
   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `username` TEXT UNIQUE NOT NULL
   - `password_hash` TEXT NOT NULL (scrypt with salt)
   - `salt` TEXT NOT NULL
   - `role` TEXT NOT NULL CHECK(role IN ('admin', 'user'))
   - `created_at` TEXT NOT NULL
   - `is_active` INTEGER DEFAULT 1
2. `sessions`:
   - `token` TEXT PRIMARY KEY
   - `user_id` INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
   - `role` TEXT NOT NULL
   - `expires_at` INTEGER NOT NULL
   - `created_at` TEXT NOT NULL
   - `client_ip` TEXT
   - `user_agent` TEXT
3. `guest_quotas`:
   - `id` INTEGER PRIMARY KEY AUTOINCREMENT
   - `guest_id` TEXT UNIQUE NOT NULL
   - `client_ip` TEXT NOT NULL
   - `fingerprint_hash` TEXT NOT NULL
   - `listen_duration_sec` INTEGER DEFAULT 0
   - `max_duration_sec` INTEGER DEFAULT 1800 (30 minutes)
   - `status` TEXT DEFAULT 'active' CHECK(status IN ('active', 'cooldown'))
   - `cooldown_until` INTEGER DEFAULT 0
   - `last_heartbeat_at` INTEGER NOT NULL
   - `created_at` TEXT NOT NULL
4. `system_config`:
   - `key` TEXT PRIMARY KEY
   - `value` TEXT NOT NULL

---

## 4. Bite-Sized Implementation Plan (TDD Cycle)

### Task 1: SQLite Storage Engine & Repositories (`src/db/`)
- **Deliverables**:
  - `src/db/database.js`: Initialize `DatabaseSync` from `node:sqlite`, run migrations, configure WAL mode.
  - `src/db/repositories/user_repo.js`: Create, read, update, list, delete users.
  - `src/db/repositories/session_repo.js`: Insert, validate, touch, and delete user sessions.
  - `src/db/repositories/guest_repo.js`: Upsert guest by IP + fingerprint, record heartbeat seconds, calculate remaining quota and cooldown state.
- **TDD Test**: `tests/auth-db-repositories.test.js`
  - Test user creation and duplicate username rejection.
  - Test session creation and expiration query.
  - Test guest listening quota accumulation (0s -> 900s -> 1800s -> cooldown).
  - Test cooldown calculation and automatic reset after expiry.

### Task 2: Cryptographic Utilities & Auth Service (`src/auth/`)
- **Deliverables**:
  - `src/auth/crypto_utils.js`: Salt generation, scrypt hashing, `timingSafeEqual`, secure token generation.
  - `src/auth/auth_service.js`: User login, password verification, session token issuance, guest bootstrap, and guest heartbeat processing.
- **TDD Test**: `tests/auth-service.test.js`
  - Test password hashing and verification against timing attacks.
  - Test invalid credentials rejection.
  - Test guest session bootstrap: generates guest token, tracks initial 1800s quota.
  - Test guest heartbeat: accumulates time, transitions to cooldown when reaching 1800s.

### Task 3: RBAC & Guest Guard Middleware (`src/middleware/`)
- **Deliverables**:
  - `src/middleware/authenticate.js`: Extract `Bearer` token or cookie, resolve user session or guest identity.
  - `src/middleware/authorize.js`: `requireRole(...roles)` returning 403 Forbidden on insufficient privileges.
  - `src/middleware/guest_guard.js`: Validates guest quota before serving audio streams. Sever connections and return 403 if cooldown is active.
- **TDD Test**: `tests/auth-middleware.test.js`
  - Test request without token resolves to Guest principal.
  - Test request with valid Admin/User token resolves to correct user principal.
  - Test `requireRole('admin')` blocks User and Guest with 403.
  - Test `guest_guard` blocks audio streaming when guest quota is 0 or status is cooldown.

### Task 4: API Controllers & Route Mounting
- **Deliverables**:
  - `src/controllers/auth_controller.js`:
    - `POST /api/auth/login`
    - `POST /api/auth/logout`
    - `GET /api/auth/me`
    - `POST /api/auth/guest-bootstrap`
    - `POST /api/auth/guest-heartbeat`
  - `src/controllers/admin_controller.js`:
    - `GET /api/admin/users`
    - `POST /api/admin/users`
    - `DELETE /api/admin/users/:id`
    - `POST /api/admin/guests/reset`
  - Update `src/server.js`:
    - Mount auth and admin routes.
    - Guard `/api/system/*` with `requireRole('admin')`.
    - Guard `/api/queue/add` to allow Users/Admins (or restrict Guests).
    - Guard `/api/stream/pipe/:id` and `/api/preview/:id` with `guest_guard`.
- **TDD Test**: `tests/auth-api-endpoints.test.js`
  - Test full HTTP lifecycle of login, access protected endpoints, and logout.
  - Test guest streaming until 30-min limit cut-off.

### Task 5: Security Hardening & Fuzzing
- **Deliverables**:
  - Brute force protection on `/api/auth/login`.
  - Anti-bypass test: Attempting to reset guest quota by changing fingerprint while on same IP, or spoofing IP while keeping fingerprint.
  - Test expired session revocation and SQL injection prevention.
- **TDD Test**: `tests/auth-security-fuzzing.test.js`

### Task 6: Frontend Integration
- **Deliverables**:
  - `public/js/auth.js`: Handles token storage, login modal, guest heartbeat ticker (every 15s when audio is actively playing), and UI status badge.
  - `public/index.html` & `public/css/silver-melody.css`:
    - Topbar auth indicator (`👑 Quản trị`, `👤 Gia Đình`, `⏱️ Khách (Còn 30:00)`).
    - Accessible Login Modal.
    - 30-min Guest Expiration Alert modal with login CTA.

---

## 5. Definition of Done (DoD) Checklist

- [ ] All new tests pass cleanly (`exit 0`).
- [ ] Existing 107 test cases continue to pass with zero regressions.
- [ ] ESLint check reports 0 errors.
- [ ] No unhandled exceptions or crashes under fuzzing.
- [ ] Code reviewed and merged into `master` via pull request.
