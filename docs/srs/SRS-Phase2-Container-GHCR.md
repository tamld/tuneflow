# SRS — Phase 2: Software Requirements Specification (Container & GHCR)

## 1. Yêu Cầu Chức Năng (Functional Requirements)
- **FR-201 (Dockerfile Specs)**:
  - Base image: `node:22-alpine`.
  - Package dependencies: `ffmpeg`, `python3`, `ca-certificates`, `tzdata`.
  - App Directory: `/app`, quyền sở hữu thuộc về `node:node`.
  - Expose Port: `3000`.
  - Healthcheck command: `CMD wget -qO- http://localhost:3000/api/health || exit 1`.
- **FR-202 (CI/CD Automated Workflow)**:
  - Trigger: `push` events on tags `v*.*.*` và `workflow_dispatch`.
  - Runners: `ubuntu-latest` với QEMU và Docker Buildx.
  - Platforms: `linux/amd64`, `linux/arm64`.
  - Registry: `ghcr.io/tamld/tuneflow`.
  - Tags output: `latest`, `vX.Y.Z`, `vX.Y`.
- **FR-203 (Proxmox Integration Specs)**:
  - Docker Compose file: `docker-compose.prod.yml`.
  - Traefik routing rules: Host header `nhac.lan`.
  - Volume mount: Phân vùng SSD NVMe cho `/app/downloads`.

## 2. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)
- **NFR-201 (Dung lượng)**: Kích thước Docker image tối đa $\le 120\text{MB}$.
- **NFR-202 (Bộ nhớ)**: RAM tiêu thụ nhàn rỗi $\le 50\text{MB}$; giới hạn cứng cgroups $\le 256\text{MB}$.
- **NFR-203 (Bảo mật)**: Zero root privilege execution (`USER node`).
- **NFR-204 (Khởi động)**: Thời gian khởi động container đến khi trả lời HTTP 200 $\le 3\text{ giây}$.
