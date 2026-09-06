# ADR-0002: Hệ Thống Thiết Kế SilverMelody Đạt Chuẩn WCAG 2.2 AAA Cho Người Lớn Tuổi

## Bối Cảnh (Context)
Đối tượng người dùng chính là Bố Mẹ (người cao tuổi). Đa số người cao tuổi gặp trở ngại:
1. Thị lực suy giảm, dễ mỏi mắt khi nhìn màn hình trắng sáng hoặc tương phản kém.
2. Thao tác tay run, ngón tay to, dễ bấm trượt các nút bấm kích thước nhỏ thông thường (32px - 40px).
3. Cảm thấy hoảng sợ khi gặp thông báo lỗi kỹ thuật tiếng Anh hoặc bảng điều khiển có quá nhiều nút bấm rối mắt.

## Quyết Định (Decision)
Thiết lập chuẩn giao diện **SilverMelody Design Tokens**:
1. **Tương phản cực đại WCAG 2.2 AAA**:
   - Màu nền than chì tối ấm: `#13141c`.
   - Màu chữ trắng ngà: `#f3f4f6` (Tỷ lệ tương phản $13.5:1$, vượt mức $7:1$ của chuẩn AAA).
   - Màu điểm nhấn Hổ phách ấm (`#f59e0b`) và Xanh ngọc (`#10b981`).
2. **Kích thước công thái học lớn**:
   - Vùng chạm (Touch Target) của toàn bộ nút tương tác tối thiểu $\ge 50\text{px}$ (nút Tìm kiếm đạt $56\text{px}$).
   - Kích thước chữ tối thiểu $18\text{px}$, tiêu đề bài hát $20\text{px}$ in đậm rõ nét.
3. **Phản hồi xúc giác cơ học (Tactile Mechanical Feedback)**:
   - Hiệu ứng `transform: scale(0.98)` và đổ bóng viền sâu tạo cảm giác bấm phím thật như radio cassette.
4. **Ngôn ngữ 100% Tiếng Việt Tự Nhiên & Ấm Áp**:
   - Triệt tiêu mọi thuật ngữ IT. Dùng kính ngữ thân mật: *"Dạ, máy đang tải bài hát về...", "Đã tải xong bài nhạc về máy của Bố Mẹ rồi ạ!"*.

## Hậu Quả (Consequences)
- **Tích cực**: Bố Mẹ sử dụng độc lập hoàn toàn mà không cần con cháu hướng dẫn từng bước. Loại bỏ hoàn toàn tỷ lệ click nhầm.
- **Tiêu cực**: Mật độ thông tin trên một màn hình thấp hơn các ứng dụng thông thường (phù hợp với người già, nhưng người dùng trẻ có thể thấy giao diện chiếm nhiều không gian).
