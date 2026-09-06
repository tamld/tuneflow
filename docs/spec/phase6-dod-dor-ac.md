# Phase 6 Governance: Definition of Ready, Definition of Done & Acceptance Criteria

## 1. Definition of Ready (DoR)
- [x] Đã có ADR-0011 phân tích kiến trúc Manifest V3 và ranh giới pháp lý bản quyền.
- [x] Đã có SRS và FSM quy định hành vi content script và background worker.
- [x] Tệp tuyên bố miễn trừ bản quyền pháp lý đã được soạn thảo trong tài liệu.

## 2. Definition of Done (DoD)
- [ ] Thư mục `extension/` chứa đầy đủ `manifest.json`, `content.js`, `background.js`, `popup.html`.
- [ ] Cài đặt thử nghiệm chế độ Developer Mode trên Chrome/Edge hoạt động không lỗi cú pháp.
- [ ] Mở video YouTube bất kỳ thấy nút "🎧 Tải Về Cho Ba Mẹ" xuất hiện đúng vị trí và nhấp được.
- [ ] Click nút gửi đúng request `POST /api/queue/add` tới `http://nhac.lan:3000` và hiển thị thông báo thành công.
- [ ] Bộ tài liệu tuân thủ pháp lý (`docs/LEGAL_COMPLIANCE.md`) được hoàn thiện.

## 3. Acceptance Criteria (AC)
- **AC-601**: Tiện ích mở rộng tải thành công trên trình duyệt Chrome/Edge không có cảnh báo vi phạm chính sách bảo mật CSP.
- **AC-602**: Nhấp nút tải trên video YouTube kích hoạt thông báo Chrome Notification trong vòng 1 giây.
- **AC-603**: Tệp `LEGAL_COMPLIANCE.md` nêu rõ các điều khoản bảo vệ chủ dự án trước các khiếu nại bản quyền theo chuẩn DMCA Safe Harbor.
