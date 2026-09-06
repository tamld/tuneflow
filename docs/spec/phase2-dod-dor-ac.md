# Phase 2 Governance: Definition of Ready, Definition of Done & Acceptance Criteria

## 1. Definition of Ready (DoR)
- [x] Dockerfile đa tầng (multi-stage) đã được soạn thảo dựa trên `node:22-alpine`.
- [x] Tệp cấu hình GitHub Actions `.github/workflows/release.yml` đã được định nghĩa với buildx và QEMU.
- [x] Đã xác lập ranh giới tài nguyên máy chủ: RAM cap 256MB, CPU 1.0 core.

## 2. Definition of Done (DoD)
- [ ] Pipeline GitHub Actions chạy xanh 100% khi gắn tag phiên bản mới.
- [ ] Gói container image đã hiện diện trên GitHub Container Registry `ghcr.io/tamld/tuneflow`.
- [ ] Có hướng dẫn và xác nhận chuyển trạng thái package sang **Public** để có thể `docker pull` không cần token.
- [ ] Tệp `docker-compose.prod.yml` được thử nghiệm hoạt động với Traefik labels.
- [ ] Bản phát hành GitHub Release được tạo chính thức kèm ghi chú phiên bản (Release Notes).

## 3. Acceptance Criteria (AC)
- **AC-201**: Chạy lệnh `docker pull ghcr.io/tamld/tuneflow:latest` thành công mà không báo lỗi `unauthorized` hay `403 Forbidden`.
- **AC-202**: Chạy lệnh `docker compose -f docker-compose.prod.yml up -d` khởi động container trong vòng $\le 5$ giây.
- **AC-203**: Gửi request `curl http://localhost:3000/api/health` trả về HTTP 200 `{ "status": "healthy" }`.
- **AC-204**: Kích thước image đo đạc bằng `docker images` không vượt quá 120MB.
