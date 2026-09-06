# ADR-0001: Lựa Chọn Ngôn Ngữ & Nền Tảng Đóng Gói (Node.js 22 LTS & Alpine Linux)

## Bối Cảnh (Context)
Dự án TuneFlow cần triển khai trên cụm máy chủ máy chủ gia đình (Self-Hosted) cá nhân của tác giả. Máy chủ này đang chạy đồng thời nhiều dịch vụ khác (Home Assistant, Plex, AdGuard, v.v.). Yêu cầu đặt ra là ứng dụng phải tốn cực ít tài nguyên RAM ($\le 150\text{ MB}$), khởi động tức thì, xử lý I/O luồng stream không bị block và tệp hình ảnh Docker container phải siêu nhẹ ($\le 120\text{ MB}$).

## Quyết Định (Decision)
1. Sử dụng **Node.js 22 LTS** làm runtime chính cho backend.
   - Node.js có mô hình non-blocking I/O event-driven tối ưu nhất cho việc truyền phát luồng (streaming), Server-Sent Events (SSE) và quản lý tiến trình con (Child Process).
2. Sử dụng hình ảnh cơ sở **Alpine Linux 3.21 (`node:22-alpine`)** cho Docker container.
   - Tránh các base image Debian/Ubuntu nặng gần 1GB.
3. Cài đặt các công cụ nhị phân phụ trợ trực tiếp qua `apk`:
   - `ffmpeg`: Trình mã hóa âm thanh chất lượng cao.
   - `python3`: Môi trường thực thi cho `yt-dlp`.
   - `yt-dlp`: Binary zipapp độc lập tải trực tiếp từ GitHub Releases.

## Hậu Quả (Consequences)
- **Tích cực**:
  - Dung lượng container image sau khi build chỉ đạt khoảng **105 MB** (thấp hơn nhiều so với mục tiêu 120 MB).
  - RAM tiêu thụ ở trạng thái chờ chỉ khoảng **35 MB - 42 MB**, khi đang transcode chỉ chạm ngưỡng **95 MB**.
- **Tiêu cực / Rủi ro**:
  - Alpine sử dụng thư viện `musl libc` thay vì `glibc`. Một số binary phụ thuộc C++ phức tạp có thể gặp khó khăn, tuy nhiên `ffmpeg` và `python3` trên kho gói chính thức của Alpine chạy hoàn hảo.
