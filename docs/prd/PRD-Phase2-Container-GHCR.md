# PRD — Phase 2: Container Engine, Multi-Arch Packaging & GHCR Delivery

## 1. Product Goal
Package TuneFlow into a production-grade Docker container, automate multi-architecture build and distribution workflows via GitHub Actions to GitHub Container Registry (`ghcr.io/tamld/tuneflow`), and ensure immediate homelab deployment with a single `docker compose up -d` command.

## 2. Target Audience
- **Infrastructure Administrators (Sysadmin/DevOps)**: Require standardized container images, non-root execution (`USER node`), memory caps under 256MB, and auto-restart policies.
- **Family Users (Parents)**: Require 24/7 stable local network access via `tuneflow.local`.

## 3. Key Features
- **Multi-Stage Alpine Image**: Final image size $< 120\text{ MB}$, bundled with `ffmpeg` and `python3`.
- **Automated GHCR Pipeline**: Pushes to Git tags (`v*.*.*`) trigger multi-arch builds (`amd64`, `arm64`) published to `ghcr.io/tamld/tuneflow`.
- **Production Compose Specification**: `docker-compose.prod.yml` with hard resource limits and Traefik reverse proxy integration.
- **Healthcheck Endpoint**: `/api/health` validates child process runtimes and daemon readiness.

## 4. Scope & Non-Goals
- **In-Scope**: Container packaging, multi-arch CI/CD, GHCR distribution, Traefik and AdGuard Home configuration.
- **Non-Goals**: Kubernetes cluster orchestration (unnecessary overhead for domestic homelab environments).
