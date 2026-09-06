# ADR-0009: Elderly Persona Taxonomy, Presets Curation, and Zero-Login Local Storage

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
Người lớn tuổi (bố mẹ) thường gặp khó khăn lớn khi phải gõ từ khóa tìm kiếm chính xác trên bàn phím điện thoại/máy tính bảng, và hoàn toàn không thích các quy trình đăng ký tài khoản, nhập mật khẩu hay OTP phức tạp. Họ cần các kênh nghe có sẵn theo thói quen và thể loại yêu thích.

## Quyết định Kiến Trúc
1. **Hệ phân loại Persona Cài Đặt Sẵn (Preset Taxonomy)**:
   - 🌸 **Mẹ hay nghe**: Tuyển chọn các kênh/danh sách: Nhạc thiền ngủ ngon, Niệm Phật thanh tịnh, Nhạc không lời thư giãn spa, Dân ca quê hương.
   - ☕ **Bố hay nghe**: Nhạc vàng trữ tình, Ca khúc tiền chiến, Cải lương hồ quảng, Thời sự bình luận âm nhạc.
   - 🎛️ **Bộ lọc kép**: Nút gạt chuyển đổi nhanh giữa "Nhạc có lời" và "Nhạc không lời hòa tấu".
2. **Neo dữ liệu không cần tài khoản (Zero-Login Anchor)**:
   - Sử dụng `localStorage` của trình duyệt và cookie phiên bản ngữ cảnh.
   - Khi bố mẹ bấm biểu tượng trái tim ❤️ hoặc "Thêm vào bài ba thích", danh sách tự động lưu trên trình duyệt của thiết bị đó.
   - Không lưu trữ dữ liệu cá nhân lên máy chủ, tuân thủ chuẩn riêng tư tuyệt đối (Privacy by Design).

## Hệ quả
- Bố mẹ chỉ cần mở ứng dụng là thấy ngay các nút bấm to rõ, nhấp 1 lần là có nhạc ưng ý.
- Loại bỏ hoàn toàn rào cản đăng nhập.
