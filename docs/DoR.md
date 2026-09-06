# Tiêu Chuẩn Sẵn Sàng (Definition of Ready - DoR)
## Dự Án: TuneFlow

Một yêu cầu (User Story / Issue / Feature Ticket) chỉ được coi là **SẴN SÀNG ĐỂ THỰC THI (READY FOR DEV)** khi và chỉ khi thỏa mãn đầy đủ các tiêu chuẩn sau:

---

## 1. Tính Rõ Ràng Về Nghiệp Vụ (Business Clarity)
- [ ] User Story được diễn đạt theo cấu trúc chuẩn: *"Là một [đối tượng], tôi muốn [hành động], để [giá trị nhận được]"*.
- [ ] Xác định rõ đối tượng hưởng lợi (Ba Mẹ hay Quản trị viên Homelab).
- [ ] Có phạm vi rõ ràng (In-Scope) và liệt kê rõ những gì không làm (Out-of-Scope).

## 2. Tiêu Chí Nghiệm Thu Minh Bạch (Acceptance Criteria - AC)
- [ ] Có ít nhất 3 kịch bản kiểm thử theo mẫu Given - When - Then:
  - 1 kịch bản đường thuận (Happy Path).
  - 1 kịch bản biên giới hạn (Edge Case).
  - 1 kịch bản xử lý lỗi hoặc sự cố bất thường (Worst/Failure Case).
- [ ] Xác định rõ định dạng dữ liệu đầu vào và kết quả đầu ra kỳ vọng.

## 3. Tính Khả Thi Về Kỹ Thuật (Technical Feasibility)
- [ ] Đã xác định công cụ thực thi (Node.js API, `yt-dlp`, `FFmpeg` hay Frontend CSS/JS).
- [ ] Không vi phạm các bất biến kỹ thuật đã quy định trong OpenSpec DELTA-01.
- [ ] Đã đánh giá vùng ảnh hưởng (Blast Radius): Không gây phá vỡ luồng tải và phát nhạc hiện có.

## 4. Chuẩn Thiết Kế Giao Diện (UI / UX Readiness)
- [ ] Đã xác định vị trí phần tử trên giao diện SilverMelody.
- [ ] Nút bấm tuân thủ kích thước tối thiểu $\ge 50\text{px}$.
- [ ] Thông điệp thông báo tiếng Việt đã được biên soạn sẵn, ấm áp và không dùng thuật ngữ IT.
