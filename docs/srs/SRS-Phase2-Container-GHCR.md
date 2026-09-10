# SRS — Phase 2: Software Requirements Specification (Container & GHCR)

## 1. Functional Requirements
- **FR-201 (Dockerfile Specifications)**:
  - Base image: `node:22-alpine`.
  - Package dependencies: `ffmpeg`, `python3`, `ca-certificates`, `tzdata`.
  - App Directory: `/app`, ownership assigned to unprivileged user `node:node`.
  - Expose Port: `3000`.
  - Healthcheck command: `CMD wget -qO- http://localhost:3000/api/health || exit 1`.
- **FR-202 (CI/CD Automated Workflow)**:
  - Trigger: `push` events on semantic tags `v*.*.*` and `workflow_dispatch`.
  - Runners: `ubuntu-latest` with QEMU and Docker Buildx.
  - Target Platforms: `linux/amd64`, `linux/arm64`.
  - Registry: `ghcr.io/tamld/tuneflow`.
  - Tagging scheme: `latest`, `vX.Y.Z`, `vX.Y`.
- **FR-203 (Container Host Integration Specs)**:
  - Docker Compose file: `docker-compose.prod.yml`.
  - Traefik routing rules: Host header `tuneflow.local`.
  - Volume mount: Persistent SSD NVMe mount to `/app/downloads`.

## 2. Non-Functional Requirements
- **NFR-201 (Image Size)**: Maximum final Docker image size $\le 120\text{ MB}$.
- **NFR-202 (Memory Utilization)**: Idle memory usage $\le 50\text{ MB}$; hard cgroups cap $\le 256\text{ MB}$.
- **NFR-203 (Security)**: Zero root privilege execution (`USER node`).
- **NFR-204 (Startup Latency)**: Container startup to HTTP 200 response $\le 3\text{ seconds}$.
