# 📖 Cẩm Nang Sử Dụng TuneFlow

Hướng dẫn trực diện, chuẩn hành động (ADHD) để cài đặt, cấu hình và sử dụng TuneFlow trên iPhone, Android, Android TV và máy chủ Homelab.

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

### Cách B: Cài đặt file APK chính thức
1. Truy cập trang [TuneFlow Releases](https://github.com/tamld/tuneflow/releases/latest).
2. Tải file `tuneflow-mobile-v2.4.2.apk`.
3. Mở file APK vừa tải về và chọn **Cài đặt**.

---

## 3. Điều khiển TuneFlow trên Android TV / Google TV
> **Mục tiêu:** Trải nghiệm xem và nghe nhạc trên màn hình lớn phòng khách bằng Remote điều khiển từ xa.  
> **Thời gian dự tính:** 1 phút.

### Cài đặt ứng dụng
1. Tải file `tuneflow-tv-v2.4.2.apk` từ trang [TuneFlow Releases](https://github.com/tamld/tuneflow/releases/latest).
2. Chép vào USB hoặc dùng lệnh `adb install tuneflow-tv-v2.4.2.apk` để cài đặt lên Android TV box.
3. Mở ứng dụng TuneFlow trên màn hình chính Android TV.

### Phím tắt điều khiển bằng Remote (D-Pad)
| Phím Remote | Chức năng thao tác |
| :--- | :--- |
| `Phím mũi tên` (Lên/Xuống/Trái/Phải) | Di chuyển vùng chọn giữa các bài hát và nút bấm |
| `OK / Chọn` | Phát bài hát đang chọn hoặc kích hoạt tính năng |
| `Quay lại` (`↩`) | Đóng cửa sổ đang mở / chuyển tiêu điểm về thanh phát nhạc |
| `Phát / Tạm dừng` (`⏯`) | Bật hoặc dừng âm thanh |

---

## 4. Khởi chạy TuneFlow trong Homelab Docker
> **Mục tiêu:** Tự lưu trữ container TuneFlow với cơ sở dữ liệu và thư mục tải bền vững.  
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
