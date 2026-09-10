# Phase 2 Governance: Definition of Ready, Definition of Done & Acceptance Criteria

## 1. Definition of Ready (DoR)
- [x] Multi-stage Dockerfile drafted based on `node:22-alpine`.
- [x] GitHub Actions workflow `.github/workflows/release.yml` defined with buildx and QEMU.
- [x] Server resource boundaries established: 256MB memory cap, 1.0 CPU core.

## 2. Definition of Done (DoD)
- [x] GitHub Actions release pipeline passes 100% on new version tags.
- [x] Multi-arch container image published to GitHub Container Registry `ghcr.io/tamld/tuneflow`.
- [x] Package visibility configured to **Public** for tokenless `docker pull`.
- [x] Production compose `docker-compose.prod.yml` validated with Traefik routing labels.
- [x] GitHub Release created with comprehensive changelog and release notes.

## 3. Acceptance Criteria (AC)
- **AC-201**: Executing `docker pull ghcr.io/tamld/tuneflow:latest` succeeds without `unauthorized` or `403 Forbidden` errors.
- **AC-202**: Executing `docker compose -f docker-compose.prod.yml up -d` boots daemon within $\le 5\text{ seconds}$.
- **AC-203**: Requesting `curl http://localhost:3000/api/health` returns HTTP 200 `{ "status": "healthy" }`.
- **AC-204**: Container image size verified via `docker images` does not exceed 120MB.
