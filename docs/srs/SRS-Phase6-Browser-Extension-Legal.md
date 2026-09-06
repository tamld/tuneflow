# SRS — Phase 6: Software Requirements Specification (Browser Extension & Legal)

## 1. Yêu Cầu Chức Năng (Functional Requirements)
- **FR-601 (Extension Manifest V3 Specs)**:
  - Tệp `manifest.json`:
    - `manifest_version: 3`
    - `permissions`: `["activeTab", "storage", "notifications"]`
    - `host_permissions`: `["*://*.youtube.com/*", "http://tuneflow.local/*", "http://localhost:3000/*"]`
- **FR-602 (Content Script Button Injection)**:
  - Theo dõi sự kiện thay đổi trang YouTube (`yt-navigate-finish`).
  - Chèn nút bấm tương tác `#tuneflow-quick-download-btn` vào vùng tương tác dưới thanh thông tin người đăng ký (`#owner` / `#subscribe-button`).
  - Kích thước nút $\ge 44\text{px}$, màu xanh ngọc với chữ trắng tương phản cao.
- **FR-603 (Background Service Worker Dispatch)**:
  - Bắt sự kiện click nút, trích xuất `videoId`, gửi payload `POST http://tuneflow.local:3000/api/queue/add`.
  - Hiển thị Toast thông báo trạng thái: *"Đang tải nhạc về máy chủ gia đình... Bố mẹ chờ một lát nhé!"*.

## 2. Yêu Cầu Phi Chức Năng & Pháp Lý (Non-Functional & Compliance)
- **NFR-601 (Tốc độ khởi động Extension)**: Tải mã content script dưới 50ms, không làm chậm tốc độ lướt YouTube của trình duyệt.
- **NFR-602 (Tuân thủ Điều khoản Cửa Hàng Chrome Web Store)**: Không chèn mã độc, không thu thập cookie hoặc lịch sử duyệt web của người dùng.
- **NFR-603 (Ranh giới Pháp lý Bản quyền)**: Tài liệu và mã nguồn ghi rõ cảnh báo: *TuneFlow là công cụ mã nguồn mở phục vụ lưu trữ cá nhân (Personal Fair Use); nghiêm cấm sử dụng để sao chép thương mại các tác phẩm âm nhạc được bảo hộ*.
