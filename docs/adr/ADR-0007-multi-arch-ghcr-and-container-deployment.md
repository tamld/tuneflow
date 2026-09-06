# ADR-0007: Multi-Arch Containerization, GHCR Publishing, and Zero-Trust Container Deployment

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
TuneFlow cần được đóng gói tiêu chuẩn để có thể triển khai 24/7 trên bất kỳ máy chủ cá nhân nào (Docker, Podman, LXC, Kubernetes) với mức tiêu thụ tài nguyên tối thiểu. Đồng thời, hình ảnh container phải được đóng gói đa kiến trúc (`linux/amd64` và `linux/arm64`), tự động kiểm thử và đẩy lên GitHub Container Registry (`ghcr.io/tamld/tuneflow`).

## Quyết định Kiến Trúc
1. **Nền tảng hình ảnh (Base Image)**: Sử dụng `node:22-alpine` với multi-stage build:
   - Cài đặt trực tiếp `ffmpeg`, `python3`, `ca-certificates`.
   - Giới hạn dung lượng toàn bộ image sau khi build $\le 120\text{MB}$.
2. **Quyền hạn bảo mật**: Chạy dưới người dùng không đặc quyền (`USER node`, UID 1000) nhằm ngăn chặn container breakout.
3. **Phân phối qua GHCR**:
   - Sử dụng GitHub Actions buildx để tạo multi-arch image (`linux/amd64`, `linux/arm64`).
   - Gắn tag theo chuẩn Semantic Versioning (`vX.Y.Z`, `latest`).
4. **Định tuyến & Reverse Proxy**:
   - Cung cấp nhãn mẫu Reverse Proxy (`Host(\`tuneflow.local\`)`).
   - Cấu hình cgroups giới hạn cứng tài nguyên: `limits.memory: 256M`, `reservations.memory: 40M`, `cpus: '1.0'`.

## Hệ quả
- **Tích cực**:
  - Tiêu thụ RAM thực tế < 50MB khi nhàn rỗi.
  - Tự động hóa 100% việc tạo image khi gắn tag Git.
  - Tương thích tốt cả Docker và Podman rootless.
- **Tiêu cực / Rủi ro**:
  - Mặc định GitHub Packages tạo visibility Private, cần thao tác thiết lập Public trên giao diện GitHub web để máy chủ bên ngoài có thể pull mà không cần token cá nhân.
