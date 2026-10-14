# ADR-0018: Monorepo Split and Workspace Topology

## Status
Accepted

## Context
As TuneFlow expands from a single self-hosted server into a multi-client ecosystem (desktop client, mobile companion, browser extension, self-hosted distribution), maintaining monolithic code boundaries causes boundary leakage, duplicated types, and fragmented release cycles. We require a clear workspace topology that segregates core logic, interface contracts, and target applications while maintaining unified release parity.

## Decision
We adopt a structured pnpm monorepo workspace topology governed by strict workspace boundaries and synchronized single-source versioning pinned at `2.5.0`:

1. **`packages/core`**: Core domain logic, download pipeline, yt-dlp execution engine, ffmpeg transcoding, and database access.
2. **`packages/web`**: Shared web UI components, player controls, styling system, and browser audio stream wrappers.
3. **`packages/contract`**: Shared API definitions, DTO schemas, RPC interfaces, WebSocket protocol definitions, and data types.
4. **`apps/desktop`**: Native desktop client wrapping web runtime with local desktop integration and system tray hooks.
5. **`apps/android`**: Mobile companion application providing remote media casting, local playback, and synchronization.
6. **`apps/extension`**: Browser extension for 1-click media queuing directly from supported media platforms.
7. **`distros/selfhost`**: Turnkey containerized homelab deployment bundle (Docker/Podman, Traefik, systemd templates).

### Version Synchronization
All packages and applications within the workspace share a unified version identifier (`2.5.0`). Monorepo release cycles enforce atomic updates across `packages/*` and `apps/*` via automated workspace version syncing.

## Consequences
- **Positive**: Strict decoupling of domain logic from presentation layers; single source of truth for protocol contracts.
- **Positive**: Coordinated atomic releases avoid version drift between server engines and client consumers.
- **Negative**: Monorepo build tooling requires strict dependency boundaries and pnpm workspace catalog enforcement.
