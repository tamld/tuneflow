# SRS — Phase 5: Software Requirements Specification (Hybrid Compute)

## 1. Yêu Cầu Chức Năng (Functional Requirements)
- **FR-501 (Direct Stream Proxy Endpoint)**:
  - Endpoint: `GET /api/stream/pipe/:id`
  - Hành vi: Máy chủ gọi yt-dlp lấy direct audio URL, sau đó tạo kết nối `fetch(directUrl)` và pipe trực tiếp luồng nhị phân vào `res` (HTTP Response) với `Transfer-Encoding: chunked`.
  - Không lưu trữ tệp trên đĩa cứng (`zero-disk-io`).
- **FR-502 (Client Web Streams Ingestion)**:
  - Client sử dụng `ReadableStreamDefaultReader` để nhận các chunk dữ liệu, hiển thị thanh phần trăm tải theo thời gian thực dựa trên header `Content-Length`.
- **FR-503 (Client-Side WASM Audio Muxer)**:
  - Tích hợp `@ffmpeg/ffmpeg` biên dịch WebAssembly trên trình duyệt.
  - Cho phép người dùng chọn đoạn bắt đầu và kết thúc (start/end timestamp) để trích xuất file `.mp3` trực tiếp trên máy client.

## 2. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)
- **NFR-501 (Tài nguyên máy chủ)**: Chế độ Zero-Disk Stream tiêu thụ dưới 15MB RAM bổ sung trên máy chủ cho mỗi luồng truyền.
- **NFR-502 (Độ trễ bắt đầu phát)**: Thời gian từ lúc bấm nút nghe thử đến khi âm thanh phát ra loa trên máy khách $\le 1.5\text{ giây}$.
