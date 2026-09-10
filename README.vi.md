# 🎶 TuneFlow - Trình Tải & Nghe Nhạc Dành Cho Gia Đình

<div align="center">

**Ứng dụng tải nhạc & video chuyển đổi MP3 tự động dành cho Bố Mẹ — Giao diện thân thiện người lớn tuổi, nghe thử trực tiếp không giật lag, tự động lưu về máy tính, đóng gói container homelab siêu nhẹ.**

[![Latest Release](https://img.shields.io/github/v/release/tamld/tuneflow?color=blue&logo=github)](https://github.com/tamld/tuneflow/releases/latest)
[![CI Gate](https://github.com/tamld/tuneflow/actions/workflows/ci.yml/badge.svg)](https://github.com/tamld/tuneflow/actions/workflows/ci.yml)
[![Docker Image](https://img.shields.io/badge/GHCR-tuneflow%3Av2.4.2-2496ED?logo=docker&logoColor=white)](https://github.com/tamld/tuneflow/pkgs/container/tuneflow)
[![Design: WCAG AAA](https://img.shields.io/badge/Design-SilverMelody%20WCAG%20AAA-orange.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) · [Tiếng Việt](README.vi.md) · [Cẩm nang sử dụng](docs/USER_GUIDE.md) · [Lộ trình phát triển](docs/ROADMAP.md)

</div>

---

## ⚡ Điểm Nổi Bật Nhanh

* 👴👵 **Giao diện "SilverMelody" Thân Thiện Bố Mẹ**: Chữ to rõ ràng, độ tương phản cao chống mỏi mắt (chuẩn WCAG AAA), nút bấm khổng lồ (≥56px) rê chuột không bị trượt, thông báo tiếng Việt ấm áp.
* 📱 **Hệ Sinh Thái Toàn Diện PWA & App Gốc**: Hỗ trợ PWA trên iOS 18 không bị ngắt nhạc khi tắt màn hình, tích hợp Picture-in-Picture (PiP) nổi hình ảnh và sóng nhạc động.
* 📺 **Chế Độ Điều Khiển TV (Android TV D-Pad)**: Hỗ trợ điều hướng bằng phím mũi tên hoặc Remote TV mượt mà trong phòng khách (10-Foot Leanback UI).
* 📂 **Khám Phá Playlist & Sắp Xếp Thông Minh**: Tìm kiếm linh hoạt video và playlist, tải 1-chạm cả album, lọc theo loại (`all`, `video`, `playlist`), sắp xếp theo độ liên quan, lượt xem hoặc ngày đăng.
* 🎧 **Nghe Thử Trực Tiếp Không Tốn Ổ Cứng (Zero-Disk)**: Bấm vào thẻ bài hát là nghe thử ngay với cơ chế tự nạp luồng trước (Speculative Prewarming), chắc chắn đúng bài mới tải.
* 🎛️ **Bộ Chỉnh Âm Thanh Web Audio DSP & Khuếch Đại An Toàn**: Bộ lọc 3 dải âm (Giọng Trong Trẻo, Nhạc Vàng Bolero Ấm Áp) và khuếch đại 125%–150% kèm nén động lực chống rè loa người già.
* 🔐 **Hệ Thống Phân Quyền & Quản Trị Phiên SQLite**:
  * **Admin (Quản trị viên)**: Quản lý tài khoản người dùng, giám sát phiên kết nối & kick-out theo nhóm (`guests`, `users`, `all_except_me`), mở khóa hạn ngạch cho khách, theo dõi trạng thái hệ thống và nâng cấp `yt-dlp` chỉ với 1 cú click.
  * **Thành viên Gia Đình**: Nghe không giới hạn, đồng bộ danh sách bài hát yêu thích 2 chiều, tự đổi mật khẩu, tải nhạc MP3/MP4 thoải mái.
  * **Khách Vãng Lai**: Hạn mức nghe thử 30 phút, tự động nghỉ làm mát sau khi hết giờ.
* 🛡️ **Mã Hóa Dữ Liệu Nhạy Cảm Tại Chỗ (AES-256-GCM)**: Toàn bộ địa chỉ IP và token phiên được mã hóa an toàn trong SQLite (`tuneflow.db`), bảo đảm không rò rỉ dữ liệu thô.
* 💾 **Tải Thẳng Về Máy Tính Bố Mẹ**: Máy chủ lo phần xử lý tải và nén MP3 320kbps, sau đó đẩy file trực tiếp vào thư mục `Downloads` trên máy tính.
* 🛡️ **Bền Bỉ & Tự Động Quản Lý Homelab**: Tự động dọn dẹp giải phóng dung lượng ổ cứng (FIFO), hỗ trợ tải nối tiếp khi mất mạng (`.part` safe resume).

---

## 📱 Nền Tảng Hỗ Trợ & Tải Ứng Dụng

| Nền tảng | Dạng ứng dụng | Cách cài đặt / Sử dụng | Nghe nền khi tắt màn hình |
| :--- | :--- | :--- | :---: |
| **Trình duyệt Web** | Máy tính (Chrome, Safari, Edge, Firefox) | `http://<ip-máy-chủ>:3000` | ✅ |
| **iOS / iPadOS** | Standalone PWA (Safari Thêm vào MH chính) | Đường dẫn HTTPS + Safari | ✅ (Giữ luồng phần cứng) |
| **Android Mobile** | Ứng dụng gốc hoặc PWA | [Tải file APK Mobile](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Android TV** | Giao diện 10-Foot (Điều khiển bằng Remote) | [Tải file APK Android TV](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Homelab / NAS** | Container Docker / Podman (amd64 / arm64) | `ghcr.io/tamld/tuneflow:v2.4.2` | ✅ |

---

## 🚀 Khởi Chạy Nhanh

### Cách 1: Triển Khai Docker / Podman Compose (Khuyên dùng)
Tạo file `compose.yaml`:

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
      - ADMIN_PASSWORD=admin       # Mật khẩu khởi tạo — đổi ngay sau lần đăng nhập đầu!
      - STORAGE_MAX_MB=20480       # Giới hạn 20GB tải trước khi tự động dọn dẹp FIFO
    volumes:
      - ./downloads:/app/downloads  # Nơi lưu trữ các file nhạc/video tải về
      - ./data:/app/data            # Cơ sở dữ liệu SQLite (tài khoản, phiên, hạn mức)
```

Khởi chạy container:
```bash
docker compose up -d
```

### Cách 2: Chạy Bằng Node.js
```bash
# 1. Tải mã nguồn
git clone https://github.com/tamld/tuneflow.git
cd tuneflow

# 2. Cài đặt thư viện
npm install

# 3. Khởi chạy máy chủ
npm start
# 🌐 Mở trình duyệt tại: http://localhost:3000
```

---

## 🌐 Các Cấu Hình Reverse Proxy Tùy Chọn

TuneFlow mặc định **100% độc lập với Reverse Proxy**. Bạn có thể chọn cấu hình phù hợp với hệ thống Homelab của mình:

### 🔹 Mẫu 1: Traefik v3 (Gắn Docker Labels)
Gắn các nhãn cấu hình sau vào service `tuneflow` trong file `compose.yaml`:

```yaml
services:
  tuneflow:
    # ... cấu hình gốc ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tuneflow.rule=Host(`tuneflow.local`)"
      - "traefik.http.routers.tuneflow.entrypoints=websecure"
      - "traefik.http.routers.tuneflow.tls=true"
      - "traefik.http.services.tuneflow.loadbalancer.server.port=3000"
```

### 🔹 Mẫu 2: Nginx / Nginx Proxy Manager
Tắt bộ đệm `proxy_buffering` để hỗ trợ tua bài và truyền luồng âm thanh theo dải byte (byte-range streaming):

```nginx
server {
    listen 80;
    server_name tuneflow.local;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Bắt buộc để nghe nhạc tức thì và hỗ trợ tua thanh thời gian:
        proxy_buffering off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

### 🔹 Mẫu 3: Caddy 2
Thêm vào file `Caddyfile`:

```caddy
tuneflow.local {
    reverse_proxy localhost:3000
}
```

### 🔹 Mẫu 4: Cloudflare Tunnel
Trỏ domain công khai của bạn vào `http://localhost:3000` trên bảng điều khiển Cloudflare Zero Trust. Không cần mở port router.

---

## ⚙️ Bảng Tham Số Biến Môi Trường

| Tên biến | Mặc định | Ý nghĩa sử dụng |
| :--- | :--- | :--- |
| `PORT` | `3000` | Cổng mạng HTTP của TuneFlow |
| `NODE_ENV` | `production` | Môi trường vận hành (`production` / `development`) |
| `ADMIN_PASSWORD` | `admin` | Mật khẩu mặc định khởi tạo cho tài khoản `admin` |
| `DB_PATH` | `./data/tuneflow.db` | Vị trí file cơ sở dữ liệu SQLite |
| `DOWNLOADS_DIR` | `./downloads` | Thư mục lưu trữ nhạc/video tải về |
| `GUEST_MAX_LISTEN_SEC` | `1800` (30m) | Hạn mức thời gian nghe thử tối đa của Khách |
| `GUEST_COOLDOWN_SEC` | `1800` (30m) | Thời gian nghỉ làm mát trước khi hạn mức khách được hồi lại |
| `MAX_DOWNLOADS` | `2` | Số tiến trình tải đồng thời tối đa |
| `MAX_CONVERSIONS` | `1` | Số tiến trình nén/chuyển đổi định dạng âm thanh đồng thời |
| `MAX_RETRIES` | `3` | Số lần thử lại tối đa khi tải bị đứt mạng |
| `STORAGE_MAX_MB` | `20480` (20GB) | Giới hạn dung lượng thư mục tải trước khi tự động dọn |
| `YTDLP_PROXY` | *Không* | Proxy HTTP/SOCKS5 tùy chọn cho các yêu cầu YouTube |
| `YTDLP_EXTRACTOR_ARGS` | *Không* | Tham số trích xuất mở rộng của yt-dlp |

---

## 👑 Tài Khoản Mặc Định Ban Đầu

* **Tên đăng nhập**: `admin`
* **Mật khẩu**: `admin` *(hoặc giá trị trong `ADMIN_PASSWORD`)*
* 💡 *Lưu ý quan trọng: Nhấp vào nút `👑 Quản trị` trên thanh tiêu đề sau khi đăng nhập để đổi mật khẩu và tạo tài khoản cho gia đình.*

---

## 📚 Tài Liệu & Đặc Tả Kỹ Thuật

* 📖 **[Cẩm Nang Sử Dụng](docs/USER_GUIDE.md)**: Hướng dẫn cài đặt và sử dụng từng bước (chuẩn ADHD/hành động trước) cho iOS, Android, TV và Docker.
* 🗺️ **[Lộ Trình Phát Triển](docs/ROADMAP.md)**: Lộ trình hoàn thiện các giai đoạn từ Phase 1 đến Phase 11.
* 📜 **[Lịch Sử Phát Hành](CHANGELOG.md)**: Nhật ký cập nhật phiên bản, sửa lỗi và nâng cấp bảo mật.
* 🏛️ **[Đặc Tả & Thiết Kế Kiến Trúc](docs/PRD.md)**: Toàn bộ tài liệu PRD, SRS, FSM và tuân thủ bản quyền.

---

## 📄 Bản Quyền & Tuyên Bố Miễn Trừ

TuneFlow là dự án mã nguồn mở phục vụ mục đích giáo dục, sử dụng cá nhân và môi trường gia đình homelab. Vui lòng tôn trọng bản quyền của các tác giả nội dung.

Phát hành theo giấy phép [MIT License](LICENSE).
