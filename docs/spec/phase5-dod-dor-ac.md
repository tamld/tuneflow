# Phase 5 Governance: Definition of Ready, Definition of Done & Acceptance Criteria

## 1. Definition of Ready (DoR)
- [x] Đã có ADR-0010 phân định rõ ranh giới Server Proxy vs Client Compute.
- [x] Đã có SRS và FSM mô tả luồng ReadableStream và phân tải WebAssembly.
- [x] Kiểm tra tương thích trình duyệt: Web Streams API và WASM được hỗ trợ trên 98% trình duyệt hiện đại (Chrome, Edge, Safari, Firefox).

## 2. Definition of Done (DoD)
- [ ] Endpoint `/api/stream/pipe/:id` truyền tải luồng âm thanh liên tục mà không tạo tệp tạm trên đĩa của máy chủ.
- [ ] Trình phát Web Audio phát bài hát ngay trong giây đầu tiên nhận dữ liệu.
- [ ] Thử nghiệm cắt đoạn nhạc bằng WASM hoàn tất trên trình duyệt mà CPU máy chủ Proxmox không tăng.
- [ ] Bộ test `tests/streaming.test.js` kiểm tra backpressure và kết thúc kết nối an toàn.

## 3. Acceptance Criteria (AC)
- **AC-501**: Truy cập `/api/stream/pipe/:id` trả về header `Transfer-Encoding: chunked` và phát âm thanh trực tiếp trên thẻ `<audio>`.
- **AC-502**: Thư mục `downloads/` trên máy chủ không tăng thêm tệp nào trong suốt quá trình stream.
- **AC-503**: Trình duyệt client tải tệp MP3 hoàn chỉnh và kích hoạt hộp thoại lưu tệp của hệ điều hành.
