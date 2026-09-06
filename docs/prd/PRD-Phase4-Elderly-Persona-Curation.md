# PRD — Phase 4: Elderly Persona Taxonomy & Smart Zero-Login Curation

## 1. Mục Tiêu Sản Phẩm (Goal)
Cá nhân hóa sâu sắc trải nghiệm âm nhạc cho ba và mẹ thông qua các danh mục tuyển tập định sẵn (Presets), bộ lọc nhanh "Nhạc có lời" / "Nhạc không lời", và cơ chế neo giữ danh sách bài hát yêu thích (Favorites) trực tiếp trên thiết bị mà không yêu cầu tài khoản hay đăng nhập rườm rà.

## 2. Phân Tích Chân Dung Người Dùng (Elderly Personas)
- **Persona 1: Mẹ**:
  - Sở thích: Nhạc thiền êm dịu, nhạc ngủ ngon cho người hay lo nghĩ, niệm Phật, nhạc không lời spa thư giãn, dân ca quê hương.
  - Hành vi: Thích bấm vào biểu tượng hoa sen hoặc ảnh đại diện mẹ để nghe ngay danh sách quen thuộc; không muốn gõ chữ.
- **Persona 2: Bố**:
  - Sở thích: Nhạc vàng bolero trước 1975, ca khúc tiền chiến trữ tình, cải lương cổ nhạc hồ quảng, bình luận thời sự âm nhạc.
  - Hành vi: Thích bấm vào tách trà hoặc danh mục bố để mở tuyển tập quen thuộc.

## 3. Các Tính Năng Trọng Tâm
- **Thanh Chọn Persona Lớn (Hero Persona Bar)**: Nút bấm to $\ge 64\text{px}$ có biểu tượng và nhãn tiếng Việt rõ ràng: `🌸 Mẹ Hay Nghe`, `☕ Bố Hay Nghe`, `❤️ Bài Bố/Mẹ Đã Thích`.
- **Bộ Lọc Nhanh Hai Chế Độ (Vocal Filter Toggle)**: Nút gạt chuyển đổi nhanh: `Toàn bộ` | `Có lời` | `Không lời hòa tấu`.
- **Zero-Login LocalStorage Storage**: Khi người dùng nhấn nút trái tim ❤️ trên bất kỳ bài hát nào, bài hát được lưu vào `localStorage` của trình duyệt, tự động đồng bộ mỗi khi mở lại trang.
