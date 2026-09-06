# ADR-0007: Multi-Arch Containerization, GHCR Publishing, and Proxmox Zero-Trust Deployment

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
TuneFlow cần được triển khai 24/7 trên máy chủ Proxmox Homelab (Node 1 - HP EliteDesk 800 G4 DM) với mức tiêu thụ tài nguyên tối thiểu, không gây ảnh hưởng đến các dịch vụ mạng trọng yếu (AdGuard Home, Traefik). Đồng thời, hình ảnh container phải được đóng gói đa kiến trúc (`linux/amd64` cho x86 và `linux/arm64` cho Raspberry Pi/Apple Silicon), tự động kiểm thử và đẩy lên GitHub Container Registry (`ghcr.io/tamld/tuneflow`).

## Quyết định Kiến Trúc
1. **Nền tảng hình ảnh (Base Image)**: Sử dụng `node:22-alpine` với multi-stage build:
   - Cài đặt trực tiếp `ffmpeg`, `python3`, `ca-certificates`.
   - Giới hạn dung lượng toàn bộ image sau khi build $\le 120\text{MB}$.
2. **Quyền hạn bảo mật**: Chạy dưới người dùng không đặc quyền (`USER node`, UID 1000) nhằm ngăn chặn container breakout.
3. **Phân phối qua GHCR**:
   - Sử dụng GitHub Actions buildx để tạo multi-arch image (`linux/amd64`, `linux/arm64`).
   - Gắn tag theo chuẩn Semantic Versioning (`vX.Y.Z`, `latest`).
4. **Định tuyến & Reverse Proxy**:
   - Tích hợp nhãn Traefik v3 (`traefik.http.routers.tuneflow.rule=Host(\`nhac.lan\`)`).
   - Cấu hình cgroups giới hạn cứng tài nguyên: `limits.memory: 256M`, `reservations.memory: 40M`, `cpus: '1.0'`.

## Hệ quả
- **Tích cực**:
  - Tiêu thụ RAM thực tế < 50MB khi nhàn rỗi.
  - Tự động hóa 100% việc tạo image khi gắn tag Git.
- **Tiêu cực / Rủi ro**:
  - Mặc định GitHub Packages tạo visibility Private, cần thao tác thiết lập Public trên giao diện GitHub web để Proxmox có thể pull mà không cần token cá nhân.
