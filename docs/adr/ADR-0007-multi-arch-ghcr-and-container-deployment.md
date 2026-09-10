# ADR-0007: Multi-Arch Containerization, GHCR Publishing, and Zero-Trust Container Deployment

## Status
Accepted

## Context
TuneFlow requires standardized containerization to run 24/7 on homelab hosts (Docker, Podman, LXC, Kubernetes) with minimal resource consumption. The container image must support multi-architecture builds (`linux/amd64` and `linux/arm64`), automated CI testing, and publishing to GitHub Container Registry (`ghcr.io/tamld/tuneflow`).

## Architectural Decisions
1. **Base Image**: Multi-stage build based on `node:22-alpine`:
   - Packages `ffmpeg`, `python3`, and `ca-certificates`.
   - Final container image size strictly capped at $\le 120\text{ MB}$.
2. **Security & Non-Root Execution**: Runs under an unprivileged user (`USER node`, UID 1000) to prevent container breakout vulnerabilities.
3. **Distribution via GHCR**:
   - Automated multi-arch build via GitHub Actions buildx (`linux/amd64`, `linux/arm64`).
   - Semantic Versioning tags (`vX.Y.Z`, `latest`).
4. **Routing & Reverse Proxy**:
   - Standardized reverse proxy labels provided (`Host(`tuneflow.local`)`).
   - Hard cgroups resource boundaries: `limits.memory: 256M`, `reservations.memory: 40M`, `cpus: '1.0'`.

## Consequences
- **Positive**:
  - Idle memory consumption $< 50\text{ MB}$.
  - 100% automated release pipeline triggered on Git tags.
  - Full compatibility with both Docker and rootless Podman environments.
- **Negative / Operational Considerations**:
  - GitHub Packages defaults to private visibility, requiring a one-time manual toggle to public for tokenless pulls.
