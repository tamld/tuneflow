# PRD — Phase 2: Container Engine, Multi-Arch Packaging & GHCR Delivery

## 1. Mục Tiêu Sản Phẩm (Goal)
Đóng gói TuneFlow thành Docker Container tiêu chuẩn, tự động hóa quy trình build và phân phối qua GitHub Actions tới GitHub Container Registry (`ghcr.io/tamld/tuneflow`), đảm bảo người dùng có thể kéo hình ảnh về và chạy ngay trên máy chủ gia đình chỉ với một lệnh `docker compose up -d`.

## 2. Đối Tượng Người Dùng (Target Audience)
- **Quản trị viên hạ tầng (Sysadmin/DevOps)**: Cần hình ảnh container chuẩn hóa, bảo mật không đặc quyền (`USER node`), giới hạn bộ nhớ dưới 256MB, tự phục hồi khi gặp lỗi.
- **Người dùng gia đình (Ba Mẹ)**: Truy cập dịch vụ ổn định 24/7 qua tên miền nội bộ `tuneflow.local`.

## 3. Các Tính Năng Trọng Tâm (Key Features)
- **Multi-Stage Alpine Image**: Tối ưu hóa kích thước image $< 120\text{MB}$, cài đặt sẵn `ffmpeg` và `python3`.
- **Automated GHCR Pipeline**: Khi tạo tag Git mới (`v*.*.*`), GitHub Actions tự động build multi-arch (`amd64`, `arm64`) và push lên `ghcr.io/tamld/tuneflow`.
- **Production Container Compose**: Cung cấp tệp `docker-compose.prod.yml` định nghĩa sẵn tài nguyên giới hạn và nhãn Traefik.
- **Healthcheck Endpoint**: Container tự kiểm tra trạng thái tiến trình con và sẵn sàng phục vụ qua `/api/health`.

## 4. Ranh Giới Phạm Vi (Scope & Non-Goals)
- *Trong phạm vi*: Build container, multi-arch CI/CD, publish GHCR, cấu hình Traefik + AdGuard.
- *Ngoài phạm vi*: Xây dựng cluster Kubernetes (đã thống nhất Container Host chỉ dùng LXC/Docker đơn giản).
