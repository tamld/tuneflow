# Phase 4 Governance: Definition of Ready, Definition of Done & Acceptance Criteria

## 1. Definition of Ready (DoR)
- [x] Đã có ADR-0009 xác lập kiến trúc Persona Taxonomy và Zero-Login Storage.
- [x] Thiết kế giao diện thanh chọn Persona tuân thủ WCAG AAA và kích thước nút bấm $\ge 64\text{px}$.
- [x] Đã hoàn thành SRS và FSM quy định hành vi lọc từ khóa.

## 2. Definition of Done (DoD)
- [ ] Endpoint `/api/curation/presets` trả về đầy đủ cấu trúc danh mục cho Bố và Mẹ.
- [ ] Giao diện người dùng có 3 nút Persona lớn trên đỉnh trang chủ.
- [ ] Nút bật tắt "Không lời / Có lời" tự động lọc kết quả mà không cần tải lại toàn bộ trang.
- [ ] Nút yêu thích ❤️ lưu bài hát vào `localStorage` và tồn tại sau khi tắt bật lại trình duyệt.
- [ ] Bộ kiểm thử E2E xác nhận luồng thao tác của người già: Chọn Mẹ ➔ Nghe thử ➔ Tải về hoạt động hoàn hảo.

## 3. Acceptance Criteria (AC)
- **AC-401**: Nhấp vào tab "🌸 Mẹ Hay Nghe" lập tức hiển thị tối thiểu 10 bài hát thuộc thể loại thiền/ngủ ngon/dân ca.
- **AC-402**: Bật toggle "Không lời", danh sách bài hát chỉ hiển thị các bản hòa tấu/nhạc cụ.
- **AC-403**: Dữ liệu trong `localStorage.getItem('tuneflow_favorites')` lưu trữ đúng cấu trúc JSON gồm `id`, `title`, `thumbnail`, `savedAt`.
