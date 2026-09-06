# OpenSpec SPEC-0007: Android Mobile & Android TV D-Pad Leanback Client Specification

> **Specification Standard**: OpenSpec Spec Kit Framework  
> **Status**: APPROVED  
> **Authority**: TamLD (`github.com/tamld/tuneflow`)  
> **Target Audience**: Android Developers, QA Engineers, UX Reviewers  
> **Reference Issues**: [#17](https://github.com/tamld/tuneflow/issues/17), [#18](https://github.com/tamld/tuneflow/issues/18)  
> **Related Architecture**: [ADR-0012](file:///docs/adr/ADR-0012-android-mobile-and-tv-leanback-architecture.md)

---

## 1. Mục Tiêu & Phạm Vi (Scope)

Đặc tả kỹ thuật cho ứng dụng khách độc lập (APK Client) chạy trên hệ điều hành Android, hỗ trợ hai phân hệ thiết bị:
1. **Android Smartphone (Mobile)**: Tối ưu cho thao tác một tay bằng ngón cái (Thumb-zone), phát nhạc ngầm khi tắt màn hình với Android Foreground Service.
2. **Android TV / Google TV / Android TV Box (10-Foot Experience)**: Điều khiển hoàn toàn 100% bằng remote TV hồng ngoại/bluetooth qua cụm phím D-Pad (Lên, Xuống, Trái, Phải, OK, Back) từ khoảng cách 3 mét.

---

## 2. Tiêu Chuẩn Trải Nghiệm Cho Bố Mẹ (Elderly UX/UI Invariants)

| Tiêu chí | Chuẩn Android Mobile | Chuẩn Android TV (10-Foot) |
| :--- | :--- | :--- |
| **Vùng bấm / Vùng chọn** | Tối thiểu $56\text{px} \times 56\text{px}$ | Kích thước thẻ tối thiểu $220\text{px} \times 140\text{px}$ |
| **Cỡ chữ tiêu đề** | $20\text{px} - 24\text{px}$ | $36\text{px} - 42\text{px}$ |
| **Cỡ chữ nội dung** | $16\text{px} - 18\text{px}$ | $24\text{px} - 28\text{px}$ |
| **Độ tương phản (WCAG)** | WCAG 2.2 AAA ($\ge 7:1$) | WCAG 2.2 AAA ($\ge 7:1$) |
| **Trạng thái Tiêu điểm (Focus Ring)**| N/A (Touch) | Phóng to $1.08\times$, Viền vàng nổi 4px (`#f39c12`), Glow 12px |
| **Phản hồi âm thanh** | Rung nhẹ Haptic Feedback | Tiếng gõ nhẹ (Auditory Click Feedback) khi chuyển thẻ |
| **Xưng hô & Ngôn từ** | Kính cẩn: "Bố Mẹ", "Dạ con hiểu rồi" | Kính cẩn: "Bố Mẹ", "Bố Hay Nghe", "Mẹ Hay Nghe" |

---

## 3. Đặc Tả Điều Hướng D-Pad Android TV (Spatial Focus Engine)

### 3.1 Bảng Mã Phím Chuẩn (Keycode Mapping)
```
┌────────────────────────────────────────────────────────┐
│               REMOTE D-PAD KEYCODE MAPPING             │
├───────────────────┬──────────────┬─────────────────────┤
│ Phím Remote TV    │ JavaScript   │ Hành động           │
├───────────────────┼──────────────┼─────────────────────┤
│ DPAD_UP           │ ArrowUp      │ Di chuyển lên hàng  │
│ DPAD_DOWN         │ ArrowDown    │ Di chuyển xuống hàng│
│ DPAD_LEFT         │ ArrowLeft    │ Thẻ trước đó        │
│ DPAD_RIGHT        │ ArrowRight   │ Thẻ kế tiếp         │
│ DPAD_CENTER / OK  │ Enter        │ Nghe thử / Chọn bài │
│ DPAD_BACK         │ Escape / Back│ Quay lại / Thoát    │
│ MEDIA_PLAY_PAUSE  │ MediaPlayPause│ Tạm dừng / Tiếp tục │
└───────────────────┴──────────────┴─────────────────────┘
```

### 3.2 Cấu Trúc Ma Trận Tiêu Điểm 2 Chiều (Focus Matrix)
Giao diện Android TV được tổ chức theo 4 hàng ngang cuộn vô tận mượt mà:
1. **Hàng 0 (Header Action Bar)**:
   - `[🔍 Tìm Kiếm Bằng Giọng Nói / Voice Search]`
   - `[🌸 Dành Cho Mẹ]`
   - `[☕ Dành Cho Bố]`
   - `[❤️ Bài Đã Thích]`
   - `[🌐 Ngôn Ngữ]`
2. **Hàng 1 (Carousel 1: Dành Cho Mẹ)**:
   - Các danh mục: Niệm Phật An Lạc, Tân Cổ Giao Duyên, Dân Ca Ba Miền, Hòa Tấu Thư Giãn.
3. **Hàng 2 (Carousel 2: Dành Cho Bố)**:
   - Các danh mục: Nhạc Tiền Chiến, Nhạc Vàng Chọn Lọc, Ca Trù & Chèo Cổ, Hòa Tấu Guitar Xưa.
4. **Hàng 3 (Hàng Đợi & Lịch Sử Đã Tải)**:
   - Danh sách bài hát đang phát hoặc đã tải về máy.

### 3.3 Quy Tắc Xử Lý Ranh Giới (Boundary Rules)
- Khi đang ở thẻ đầu tiên của một hàng và bấm `ArrowLeft`: Giữ nguyên focus, không nhảy lung tung, rung nhẹ thẻ để báo hiệu đã kịch biên.
- Khi đang ở thẻ cuối cùng của một hàng và bấm `ArrowRight`: Cuộn thêm danh sách hoặc giữ nguyên biên.
- Khi bấm `ArrowDown` từ Hàng $N$: Tiêu điểm chuyển xuống thẻ gần nhất về tọa độ X ở Hàng $N+1$.
- Mọi chuyển động focus phải mượt mà $\le 16\text{ms}$ (60fps) qua CSS Hardware Accelerated `transform: scale3d(1.08, 1.08, 1)`.

---

## 4. Kiến Trúc Phát Nhạc Nền Di Động (Mobile Audio ForegroundService)

### 4.1 Vòng Đời Tiến Trình (Process Lifecycle)
1. Khi Bố Mẹ bấm `▶️ Nghe Thử`:
   - Ứng dụng khởi động `Android Audio ForegroundService`.
   - Đăng ký `MediaSessionCompat` với Android Audio Subsystem.
   - Trưng bày `NotificationCompat` không thể gạt bỏ (Ongoing Notification) với đầy đủ thông tin:
     - Tên bài hát, tên ca sĩ / người tải lên.
     - Ảnh bìa bài hát chất lượng cao.
     - 3 nút điều khiển lớn: `[⏮️ Bài Trước]`, `[⏯️ Phát / Dừng]`, `[⏭️ Bài Tiếp]`.
2. Khi Bố Mẹ nhấn nút nguồn tắt màn hình:
   - Luồng phát nhạc tiếp tục duy trì 100% liền mạch qua mạng Wi-Fi/4G.
   - Nhận diện các sự kiện từ tai nghe Bluetooth (nhấp nút tai nghe để tạm dừng hoặc phát tiếp).
3. Hẹn giờ ngủ (Sleep Timer):
   - Khi bộ đếm giờ (15/30/45/60 phút) về 0:
   - Tự động hạ âm lượng đều đặn trong 15 giây (Fade-out).
   - Dừng phát nhạc và tự giải phóng `ForegroundService` để tiết kiệm pin cho Bố Mẹ.

---

## 5. Tự Động Kết Nối Không Cần Cấu Hình (mDNS Zero-Conf Discovery)

1. **Giao thức phát hiện**:
   - Máy chủ TuneFlow trên mạng gia đình định kỳ phát sóng mDNS service type: `_tuneflow._tcp.local` tại cổng `3000`.
   - Ứng dụng Android khi khởi động tự động lắng nghe gói tin Zeroconf/mDNS trên mạng Wi-Fi cục bộ.
2. **Kịch bản thành công**:
   - Ứng dụng phát hiện thấy `tuneflow.local:3000` trong vòng $1.5\text{s}$.
   - Tự động kết nối, đồng bộ danh sách bài hát yêu thích và hàng đợi mà Bố Mẹ không cần nhập bất kỳ ký tự nào.
3. **Kịch bản mạng chặn Multicast**:
   - Hiển thị thông báo thân thiện: *"Đang tìm kiếm máy phát nhạc gia đình..."*.
   - Cung cấp nút hiển thị mã QR trên TV để điện thoại của con cái quét và ghép nối tự động.

---

## 6. Tiêu Chí Nghiệm Thu (Acceptance Criteria - AC)

- [x] **AC-1**: Giao diện Android TV hoạt động trơn tru 100% bằng remote D-Pad, không có bất kỳ thao tác nào đòi hỏi chuột hay cảm ứng.
- [x] **AC-2**: Thẻ được chọn luôn có viền vàng sáng 4px và phóng to $1.08\times$ nổi bật, nhìn rõ từ 3 mét.
- [x] **AC-3**: Âm thanh phát nền liên tục trên Android Mobile khi tắt màn hình, có notification màn hình khóa.
- [x] **AC-4**: Kết nối tự động mDNS không cần cấu hình IP.
- [x] **AC-5**: Toàn bộ ngôn từ và nhãn giao diện tuân thủ tuyệt đối chuẩn kính cẩn: "Bố Mẹ", "Dành Cho Bố", "Dành Cho Mẹ".
