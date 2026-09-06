# Tài Liệu Yêu Cầu Sản Phẩm (Product Requirements Document - PRD)
## Dự Án: TuneFlow — Trình Chuyển Đổi & Nghe Nhạc YouTube Thân Thiện Dành Cho Người Cao Tuổi

> **Mã dự án**: `TUNEFLOW-PRD-01`  
> **Phiên bản**: `1.0.0`  
> **Chủ quản sản phẩm (Product Owner)**: TamLD (`tamld/tuneflow`)  
> **Đối tượng thụ hưởng chính**: Ba Mẹ (Người lớn tuổi) & Quản trị viên Homelab  
> **Trạng thái**: PHÊ DUYỆT (APPROVED)  

---

## 1. Tầm Nhìn Sản Phẩm (Product Vision)

Người lớn tuổi trong gia đình có nhu cầu rất lớn về việc nghe và lưu trữ các dòng nhạc xưa (Nhạc Vàng 1975, Tân Cổ Giao Duyên, Nhạc Trịnh, Ca Cổ Miền Tây, Nhạc Thiền). Tuy nhiên, môi trường YouTube hiện đại chứa đầy rào cản:
1. Video bị chèn quảng cáo liên tục gây gián đoạn cảm xúc và dễ bấm nhầm vào đường link độc hại.
2. Các trang web "tải nhạc YouTube miễn phí" tràn ngập pop-up lừa đảo, nút bấm giả mạo, virus, hoặc tải về tệp chất lượng kém, rè tiếng.
3. Các giải pháp Self-Hosted hiện nay thường lưu tệp trên ổ cứng của server nội bộ (Homelab), khiến người già không biết cách lấy tệp về máy tính cá nhân nếu không có người hỗ trợ kỹ thuật.

**TuneFlow** ra đời với sứ mệnh xóa bỏ toàn bộ các rào cản trên: Một cổng thông tin âm nhạc tự lưu trữ trên Proxmox Homelab, giao diện tối giản chuẩn công thái học **SilverMelody (WCAG 2.2 AAA)**, cho phép nghe thử tức thì trong 1 giây, chọn bài ưng ý và **tự động chuyển tệp MP3 chất lượng cao 320kbps vào máy tính cá nhân đang sử dụng**.

---

## 2. Chân Dung Người Dùng (User Personas)

### Persona 1: Ba Mẹ (Người dùng cốt lõi)
- **Độ tuổi**: 60 - 75 tuổi.
- **Thói quen**: Nghe nhạc buổi sáng khi uống trà hoặc buổi tối trước khi đi ngủ. Thích chép nhạc vào USB để nghe trên loa kéo hoặc trên ô tô.
- **Đặc điểm thể chất**: Thị lực suy giảm (khó đọc chữ nhỏ, dễ lóa mắt), thao tác tay kém chính xác (dễ click trượt nút bấm nhỏ), trí nhớ công nghệ hạn chế (ngại các bước cài đặt phức tạp).
- **Kỳ vọng**: 
  - Mở web lên là thấy ngay các thể loại quen thuộc.
  - Bấm nút là nghe được ngay để biết đúng ca khúc mình thích chưa.
  - Bấm tải là nhạc tự chạy vào máy tính mà không hỏi các câu hỏi kỹ thuật khó hiểu.

### Persona 2: Anh Tâm (Quản trị viên Homelab Proxmox)
- **Đặc điểm**: Kỹ sư phần mềm / DevOps, sở hữu cụm máy chủ Proxmox cá nhân.
- **Kỳ vọng**:
  - Ứng dụng đóng gói dạng Docker container siêu nhẹ ($\le 120\text{ MB}$), tiêu tốn ít RAM ($\le 150\text{ MB}$ khi chạy, $\le 50\text{ MB}$ khi nghỉ).
  - Tương thích tốt với Traefik Reverse Proxy và tên miền nội bộ `.lan`.
  - Khả năng chống crash: Mạng rớt hay khởi động lại container không làm hỏng dữ liệu dở dang.

---

## 3. Danh Sách Câu Chuyện Người Dùng (User Stories)

| ID | Câu chuyện người dùng (User Story) | Mức độ ưu tiên | Mục tiêu đạt được |
| :--- | :--- | :--- | :--- |
| **US-01** | Là một người lớn tuổi, tôi muốn bấm chọn thể loại nhạc yêu thích chỉ với 1 chạm để không phải gõ bàn phím tìm kiếm phức tạp. | P0 (Must Have) | 5 nút Quick Discovery Chips hiển thị to rõ trên trang chủ. |
| **US-02** | Là một người lớn tuổi, tôi muốn nghe thử bài hát trực tiếp trên trang web trước khi quyết định tải để không tải nhầm bản phối dở hoặc nhầm ca sĩ. | P0 (Must Have) | Trình phát nhạc cố định dưới đáy (Sticky Bottom Player), kích hoạt trong < 1.5 giây. |
| **US-03** | Là một người lớn tuổi, tôi muốn khi bấm "Tải Về", bài hát tự động xuất hiện trong máy tính của tôi mà tôi không cần phải tìm kiếm trên server. | P0 (Must Have) | Cơ chế HTTP `Content-Disposition: attachment` tự động stream file về thư mục Downloads của client. |
| **US-04** | Là một người lớn tuổi, tôi muốn các nút bấm phải thật to, chữ to rõ và màn hình êm dịu không chói mắt để tôi dễ bấm và không mỏi mắt. | P0 (Must Have) | Chuẩn SilverMelody: Chiều cao nút $\ge 50\text{px}$, tương phản WCAG 2.2 AAA, tông màu hổ phách/tối ấm. |
| **US-05** | Là một người lớn tuổi, tôi muốn tải một lúc nhiều bài hoặc cả danh sách phát (Playlist) để tiết kiệm thời gian. | P1 (Should Have) | Trích xuất playlist YouTube và tự động xếp hàng tải tuần tự. |
| **US-06** | Là quản trị viên Homelab, tôi muốn hệ thống giới hạn số lượt tải đồng thời để không làm nghẽn CPU và băng thông của cụm Proxmox. | P0 (Must Have) | Hàng đợi tải bất đồng bộ khống chế `MAX_CONCURRENT_DOWNLOADS = 2`. |
| **US-07** | Là quản trị viên Homelab, tôi muốn các tệp tải dở dang (`.part`) không bị xóa sạch khi mạng rớt để tiết kiệm băng thông và tự phục hồi. | P1 (Should Have) | Cơ chế Resilient Queue & Crash Recovery giữ nguyên tệp tạm. |
| **US-08** | Là quản trị viên, tôi muốn hình ảnh container Docker phải nhỏ hơn 120MB để dễ dàng sao lưu và khởi động nhanh trên node Proxmox. | P1 (Should Have) | Multi-stage build Alpine Linux với standalone `yt-dlp` và `node:22-alpine`. |

---

## 4. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

1. **Hiệu năng (Performance)**:
   - Thời gian phản hồi tìm kiếm: $\le 3\text{ giây}$ qua `yt-dlp`.
   - Độ trễ bắt đầu phát nghe thử: $\le 1.5\text{ giây}$.
   - Tốc độ transcode MP3 320kbps: Xử lý bài hát 5 phút trong thời gian $\le 6\text{ giây}$.
2. **Khả năng tiếp cận (Accessibility - A11y)**:
   - Đạt chuẩn **WCAG 2.2 Level AAA** về độ tương phản màu sắc ($\ge 7:1$ cho văn bản thường, thực tế đạt $> 12:1$).
   - Vùng chạm tương tác tối thiểu $\ge 48\text{px} \times 48\text{px}$ (thực tế nút tìm kiếm đạt $56\text{px}$).
   - Không chứa bất kỳ hiệu ứng chớp tắt gây động kinh hoặc khó chịu thị giác.
3. **Bảo mật & An toàn (Security & Safety)**:
   - Chống tiêm lệnh shell (Argument Injection): Toàn bộ lời gọi hệ thống tới `yt-dlp` và `ffmpeg` bắt buộc sử dụng mảng tham số an toàn kèm cờ `--` phân cách URL.
   - Container chạy dưới tài khoản không đặc quyền (`USER node`), không có quyền root trên máy chủ Proxmox.
4. **Độ tin cậy (Reliability)**:
   - Cơ chế tự phục hồi sau sự cố mạng với tối đa 3 lần thử lại (Retry Backoff).
   - Tiến độ tải và trạng thái hệ thống được đồng bộ thời gian thực qua Server-Sent Events (SSE).
