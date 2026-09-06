# ADR-0012: Android Phone & Android TV D-Pad Leanback Client Architecture

## Trạng thái
Đã chấp thuận (Accepted)

## Bối cảnh
TuneFlow phục vụ đối tượng người dùng cao tuổi (**Bố & Mẹ 55–75+ tuổi**) trong không gian gia đình. Bên cạnh trải nghiệm trên trình duyệt máy tính cá nhân, hai kịch bản sử dụng phổ biến nhất của các bậc phụ huynh là:
1. **Di động (Android Smartphone)**: Bố Mẹ mang điện thoại đi tập thể dục buổi sáng, làm vườn hoặc nghe radio thư giãn trong phòng ngủ khi màn hình đã tắt.
2. **Phòng khách / Phòng ngủ (Android TV / TV Box)**: Bố Mẹ ngồi trên ghế sofa cách màn hình 3 mét, chỉ sử dụng duy nhất chiếc remote hồng ngoại / bluetooth (D-Pad: Lên, Xuống, Trái, Phải, OK, Back) để chọn các bài ca cổ, nhạc vàng xưa hay kinh Phật niệm an lành.

Việc đưa TuneFlow lên hệ điều hành Android (dưới dạng file cài đặt APK độc lập) đòi hỏi kiến trúc vừa tận dụng lại 100% logic web SilverMelody hiện có, vừa thích ứng hoàn hảo với giao thức điều khiển từ xa và chế độ chạy nền của Android.

---

## Quyết định Kiến Trúc

### 1. Nền Tảng Đóng Gói Ứng Dụng (Capacitor Hybrid Architecture)
- Sử dụng **Capacitor (Android Platform)** để đóng gói toàn bộ lõi web tĩnh (`public/`) thành ứng dụng Android native `.apk`.
- Cho phép chia sẻ 100% mã nguồn UI/UX, bộ từ điển đa ngôn ngữ (`public/js/i18n.js`) và bộ logic phát nhạc (`public/js/player.js`) giữa Web, Mobile và TV mà không cần viết lại mã nguồn bằng Kotlin/Java riêng biệt.
- Khai báo cờ hỗ trợ cả chế độ cảm ứng di động và TV Leanback trong `AndroidManifest.xml`:
  ```xml
  <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
  <uses-feature android:name="android.software.leanback" android:required="false" />
  ```

### 2. Trải Nghiệm Di Động (Android Mobile Phone UX)
- **Vùng bấm ngón tay cái (Thumb-Zone Ergonomics)**:
  - Toàn bộ các nút điều khiển chính (`▶️ Nghe Thử`, `⬇️ Tải Về`, `❤️ Yêu Thích`) có kích thước $\ge 56\text{px}$, bố trí ở nửa dưới màn hình để Bố Mẹ dễ dàng thao tác bằng một tay.
- **Phát nhạc ngầm khi tắt màn hình (Android Foreground Service)**:
  - Tích hợp Android `MediaSessionService` / Foreground Service kèm thông báo cố định `NotificationCompat` hiển thị trên màn hình khóa.
  - Cho phép Bố Mẹ khóa màn hình hoặc đút điện thoại vào túi áo mà bài hát vẫn phát liên tục không bị hệ thống Android tiết kiệm pin ngắt tiến trình.
- **Lưu trữ ngoại tuyến (Offline Local Storage)**:
  - Tận dụng Cache API và IndexedDB để lưu trữ các bài hát yêu thích trực tiếp trên bộ nhớ máy, cho phép Bố Mẹ nghe lại ngay cả khi ra khỏi vùng phủ sóng Wi-Fi gia đình.

### 3. Trải Nghiệm 10-Foot Android TV (Leanback D-Pad Navigation)
- **Cơ chế điều hướng Remote D-Pad 100%**:
  - Lắng nghe sự kiện phím bấm chuẩn Android TV: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Enter` (DPAD_CENTER), `Escape`/`Backspace` (DPAD_BACK).
  - Tự động quản lý chỉ mục tiêu điểm (Spatial Focus Management) theo dạng ma trận 2 chiều (Row/Column Grid).
- **Phân cấp giao diện Dạng Hàng Ngang (Horizontal Leanback Carousel)**:
  - **Hàng 1**: 🌸 **Dành Cho Mẹ (Mẹ Hay Nghe)** — Nhạc niệm Phật, Dân ca ba miền, Tân cổ giao duyên, Hòa tấu đàn tranh sáo trúc.
  - **Hàng 2**: ☕ **Dành Cho Bố (Bố Hay Nghe)** — Nhạc tiền chiến, Nhạc vàng chọn lọc, Ca trù & Chèo cổ, Hòa tấu guitar xưa.
  - **Hàng 3**: ❤️ **Bài Hát Yêu Thích & Đang Tải Về**.
- **Hiệu ứng Focus Ring Siêu Tương Phản (WCAG AAA Focus State)**:
  - Khi một thẻ bài hát nhận tiêu điểm (Focused), thẻ lập tức phóng to nhẹ **$1.08\times$** kết hợp viền sáng vàng ấm 4px (`--accent-gold`: `#f39c12`) và bóng đổ nổi bật.
  - Đảm bảo từ khoảng cách 3 mét trên ghế sofa, Bố Mẹ nhìn rõ ràng bài hát nào đang được chọn mà không bị hoa mắt.
- **Chế độ Phát Tràn Màn Hình (Ambient Player / Chanting Mode)**:
  - Khi phát nhạc, tự động chuyển sang chế độ tĩnh dưỡng: ảnh bìa lớn sắc nét, tên bài và ca sĩ hiển thị chữ 36–42px chống mỏi mắt, kèm sóng âm dịu nhẹ.

### 4. Kết Nối & Tự Động Nhận Diện Máy Chủ (mDNS Zero-Conf Discovery)
- Khách hàng không cần phải gõ địa chỉ IP thủ công.
- Tự động quét mạng LAN gia đình qua giao thức mDNS (`tuneflow.local` hoặc dịch vụ `_tuneflow._tcp.local`) để tự kết nối vào máy chủ gia đình.
- Hỗ trợ mã QR hiển thị trên màn hình TV để con cái dùng điện thoại quét và thiết lập nhanh nếu mạng gia đình chặn multicast mDNS.

---

## Hệ quả

### Tích cực
1. **Một mã nguồn duy nhất**: Tiết kiệm 80% công sức bảo trì so với việc viết app Android riêng biệt.
2. **Trải nghiệm đo ni đóng giày cho Bố Mẹ**: Giải quyết triệt để rào cản thao tác điều khiển TV của người cao tuổi.
3. **Phát nhạc ngầm bền bỉ**: Khắc phục nhược điểm đóng tab trình duyệt là tắt nhạc.

### Thách thức & Giải pháp
1. **Hiệu năng TV Box cấu hình yếu**: Tránh dùng các hiệu ứng làm mờ nền (backdrop-filter) phức tạp trên Android TV; sử dụng CSS GPU transform (`translate3d`, `scale3d`) để duy trì tốc độ khung hình 60fps mượt mà.
2. **Ký số APK**: Cần thiết lập pipeline CI tự động ký số bằng Keystore hợp lệ để Bố Mẹ cài đặt an toàn qua trình duyệt hoặc USB mà không bị Play Protect chặn cảnh báo mã độc.
