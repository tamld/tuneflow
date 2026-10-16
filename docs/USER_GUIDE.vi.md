# 📖 Cẩm Nang Sử Dụng TuneFlow

Hướng dẫn trực diện, chuẩn hành động (ADHD) để cài đặt, cấu hình và sử dụng TuneFlow trên iPhone, Android, Android TV và máy chủ tự lưu trữ / VPS / Cloud / Homelab.

---

## 1. Cài đặt PWA trên iPhone / iPad (iOS 16.4+)
> **Mục tiêu:** Chạy TuneFlow ở chế độ toàn màn hình, hỗ trợ phát nhạc nền khi tắt màn hình và cửa sổ thu nhỏ PiP.  
> **Thời gian dự tính:** 1 phút.

1. Mở trình duyệt **Safari** trên iOS và truy cập đường dẫn TuneFlow (yêu cầu giao thức HTTPS).
2. Nhấn vào nút **Chia sẻ** (biểu tượng ô vuông có mũi tên chỉ lên ở thanh công cụ dưới).
3. Cuộn xuống và chọn **Thêm vào Màn hình chính** (`Add to Home Screen`).
4. Nhấn **Thêm** (`Add`) ở góc trên bên phải.
5. Mở ứng dụng TuneFlow trực tiếp từ biểu tượng ngoài Màn hình chính.

**Mẹo phát nhạc nền & PiP:**
- **Phát nhạc khi khóa màn hình:** Bật nhạc và khóa màn hình thiết bị. Luồng âm thanh tiếp tục phát liên tục qua cụm điều khiển phần cứng của máy.
- **Cửa sổ thu nhỏ (Picture-in-Picture):** Nhấn nút **PiP** (`📺`) ở thanh phát nhạc phía dưới để thu nhỏ thành cửa sổ nổi hiển thị ảnh bài hát, tên ca sĩ và sóng nhạc động.

---

## 2. Cài đặt trên điện thoại Android
> **Mục tiêu:** Cài đặt TuneFlow như ứng dụng gốc trên điện thoại Android.  
> **Thời gian dự tính:** 2 phút.

### Cách A: Cài đặt ứng dụng Web (PWA)
1. Mở trình duyệt **Google Chrome** trên Android và truy cập đường dẫn TuneFlow.
2. Nhấn vào thanh thông báo **Cài đặt TuneFlow** ở đầu trang, hoặc chọn biểu tượng **Menu 3 chấm (⋮)** -> **Cài đặt ứng dụng**.
3. Nhấn **Cài đặt** để đưa TuneFlow vào danh sách ứng dụng.

### Cách B: Cài đặt file APK chính thức & Quét mã QR không cần gõ chữ
1. Truy cập trang [TuneFlow Releases](https://github.com/tamld/tuneflow/releases/latest).
2. Tải file APK Mobile phiên bản mới nhất (`tuneflow-mobile-*.apk`).
3. Mở file APK vừa tải về và chọn **Cài đặt**.
4. **Ghép nối máy chủ bằng mã QR (Không cần nhập địa chỉ cho người lớn tuổi):**
   - Trên màn hình máy tính hoặc trang Quản trị TuneFlow, hiển thị mã QR ghép nối mạng LAN (cung cấp bởi giao thức `GET /api/system/network` và `GET /api/system/pairing-qr` trong `@tuneflow/contract`).
   - Mở ứng dụng TuneFlow trên điện thoại Android và bấm nút lớn **"Quét mã ghép nối"**.
   - Hướng camera vào mã QR (`tuneflow://pair?url=...&code=...`) để ứng dụng tự động điền và lưu `server_url` mà không cần gõ bất kỳ ký tự nào.
   - *Nhập thủ công dự phòng:* Bạn vẫn có thể nhập trực tiếp địa chỉ máy chủ LAN (ví dụ `http://192.168.1.100:3000`) vào ô nhập liệu khi cần.

---

## 3. Điều khiển TuneFlow trên Android TV / Google TV
> **Mục tiêu:** Trải nghiệm xem và nghe nhạc trên màn hình lớn phòng khách bằng Remote điều khiển từ xa.  
> **Thời gian dự tính:** 1 phút.

### Cài đặt ứng dụng
1. Tải file APK Android TV phiên bản mới nhất (`tuneflow-tv-*.apk`) từ trang [TuneFlow Releases](https://github.com/tamld/tuneflow/releases/latest).
2. Chép vào USB hoặc dùng lệnh `adb install <file-apk>` để cài đặt lên Android TV box.
3. Mở ứng dụng TuneFlow trên màn hình chính Android TV.
4. **Cấu hình địa chỉ máy chủ trên TV:** Nhấn phím **MENU** (hoặc nhấn giữ phím **Quay lại / Back**) trên điều khiển từ xa bất kỳ lúc nào để mở hộp thoại nhập địa chỉ máy chủ, hoặc ghép nối qua mã PIN 4 số (`POST /api/connect/pair`).

### Phím tắt điều khiển bằng Remote (D-Pad)
| Phím Remote | Chức năng thao tác |
| :--- | :--- |
| `Phím mũi tên` (Lên/Xuống/Trái/Phải) | Di chuyển vùng chọn giữa các bài hát và nút bấm |
| `OK / Chọn` | Phát bài hát đang chọn hoặc kích hoạt tính năng |
| `Quay lại` (`↩`) | Đóng cửa sổ đang mở / chuyển tiêu điểm về thanh phát nhạc (nhấn giữ để mở Cấu hình máy chủ) |
| `MENU` (`☰`) | Mở hộp thoại nhập địa chỉ máy chủ thủ công (dự phòng cho TV) |
| `Phát / Tạm dừng` (`⏯`) | Bật hoặc dừng âm thanh |

---

## 4. Khởi chạy TuneFlow qua Docker / Container (Server, VPS, Cloud, Homelab, NAS)
> **Mục tiêu:** Tự lưu trữ container TuneFlow trên mọi môi trường chạy Docker/Podman (VPS Linux, máy ảo Cloud, NAS, máy cá nhân hoặc Homelab) với lưu trữ dữ liệu bền vững.  
> **Thời gian dự tính:** 3 phút.

### Bước 1: Tạo file `compose.yaml`
```yaml
services:
  tuneflow:
    image: ghcr.io/tamld/tuneflow:latest
    container_name: tuneflow
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
      - ./downloads:/app/downloads
```

### Bước 2: Khởi chạy container
```bash
docker compose up -d
```

### Bước 3: Truy cập giao diện web
Mở trình duyệt tại `http://<ip-máy-chủ>:3000` và đăng nhập bằng tài khoản `admin` cùng mật khẩu khởi tạo.

---

## 5. Thiết lập quản trị viên ban đầu
> **Mục tiêu:** Bảo mật hệ thống và cấu hình danh sách tài khoản gia đình.  
> **Thời gian dự tính:** 1 phút.

1. Đăng nhập bằng tên người dùng `admin` và mật khẩu mặc định ban đầu.
2. Nhấp vào nút **👑 Quản trị** ở góc trên thanh tiêu đề.
3. Chọn **Đổi mật khẩu** để cập nhật mật khẩu cá nhân an toàn.
4. Mở tab **Tài khoản** để tạo tài khoản cho các thành viên trong gia đình hoặc điều chỉnh hạn ngạch khách.

---

## 6. Ứng dụng Desktop Bản Địa, Kênh Nhạc Đã Tải Offline & Công Cụ Chẩn Đoán System Doctor
> **Mục tiêu:** Sử dụng TuneFlow trên máy tính Windows/macOS/Linux, nghe nhạc MP3 offline và tự động chẩn đoán hệ thống.  
> **Thời gian dự tính:** 1 phút.

1. **Kênh Nhạc Đã Tải (`Nhạc Đã Tải`):** Nhấp vào nút **Nhạc Đã Tải** ở thanh điều hướng bên trái (`#btn-persona-downloaded`) để mở và phát ngay toàn bộ các bài hát `.mp3` / `.m4a` đã lưu trong ổ cứng mà không cần kết nối mạng Internet.
2. **Mở Tuyển Tập Tự Phát Nhạc & Chế Độ Xem Riêng Biệt:** Khi bấm **`▶ Mở Tuyển Tập Nghe & Tải`** trên thẻ Playlist, ứng dụng tự động chuyển sang khung danh sách phát riêng biệt (không đè lên kết quả tìm kiếm) và phát ngay bài hát đầu tiên. Bấm **`← Quay Lại`** (`#btn-close-playlist`) để trở về danh sách thẻ bài hát.
3. **Công Cụ Chẩn Đoán System Doctor (`--doctor`):** Chạy `pnpm run doctor` (`node bin/tuneflow.js --doctor`) hoặc gọi `GET /api/system/doctor` để kiểm tra sức khỏe Node.js, cơ sở dữ liệu SQLite, quyền ghi thư mục nhạc, trạng thái tiến trình con (`ProcessManager`) và các bộ giải mã `yt-dlp` / `ffmpeg`.
4. **Đồng Bộ Bản Chạy Trực Tiếp (Windows):** Chạy `pnpm run desktop:sync` (`powershell -ExecutionPolicy Bypass -File scripts/sync_local_install.ps1`) để tự động đóng gói sidecar, đồng bộ mã nguồn sang `dist\win-unpacked` và `%LOCALAPPDATA%\Programs\TuneFlow`.

