# 🎶 TuneFlow - Trình Tải & Nghe Nhạc Dành Cho Gia Đình

<div align="center">

**Ứng dụng tải nhạc & video chuyển đổi MP3 tự động dành cho Bố Mẹ — Giao diện thân thiện người lớn tuổi, nghe thử trực tiếp không giật lag, tự động lưu về máy tính, đóng gói container homelab siêu nhẹ.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: ≥20](https://img.shields.io/badge/Node-%E2%89%A520-green.svg)](#)
[![Docker: Alpine](https://img.shields.io/badge/Docker-Alpine%20%3C120MB-cyan.svg)](#)
[![Design: WCAG AAA](https://img.shields.io/badge/Design-SilverMelody%20WCAG%20AAA-orange.svg)](#)
[![SQLite: Built-in](https://img.shields.io/badge/SQLite-Zero--Config-blueviolet.svg)](#)

[English](README.md) · [Tiếng Việt](README.vi.md)

</div>

---

## ⚡ Điểm Nổi Bật Nhanh

* 👴👵 **Giao diện "SilverMelody" Thân Thiện Bố Mẹ**: Chữ to rõ ràng, độ tương phản cao chống mỏi mắt (chuẩn WCAG AAA), nút bấm khổng lồ (≥56px) rê chuột không bị trượt, thông báo tiếng Việt ấm áp.
* 🎧 **Nghe Thử Trực Tiếp Không Tốn Ổ Cứng (Zero-Disk)**: Bấm vào thẻ bài hát là nghe thử ngay với cơ chế tự nạp luồng trước (Speculative Prewarming), chắc chắn đúng bài mới tải.
* 🎛️ **Bộ Chỉnh Âm Thanh Web Audio DSP & Khuếch Đại An Toàn**: Bộ lọc 3 dải âm (Giọng Trong Trẻo, Nhạc Vàng Bolero Ấm Áp) và khuếch đại 125%–150% kèm nén động lực chống rè loa người già.
* 📺 **Chế Độ Điều Khiển TV (Android TV D-Pad)**: Hỗ trợ điều hướng bằng phím mũi tên hoặc Remote TV mượt mà trong phòng khách (10-Foot Leanback UI).
* 🔐 **Hệ Thống Phân Quyền & Quản Trị SQLite**:
  * **Admin (Quản trị viên)**: Quản lý tài khoản người dùng, mở khóa hạn ngạch cho khách, theo dõi trạng thái hệ thống và nâng cấp `yt-dlp` chỉ với 1 cú click.
  * **Thành viên Gia Đình**: Nghe không giới hạn, lưu danh sách bài hát yêu thích, tải nhạc MP3/MP4 thoải mái.
  * **Khách Vãng Lai**: Hạn mức nghe thử 30 phút, tự động nghỉ làm mát sau khi hết giờ.
* 💾 **Tải Thẳng Về Máy Tính Bố Mẹ**: Máy chủ lo phần xử lý tải và nén MP3 320kbps, sau đó đẩy file trực tiếp vào thư mục `Downloads` trên máy tính.
* 🛡️ **Bền Bỉ & Tự Động Quản Lý Homelab**: Tự động dọn dẹp giải phóng dung lượng ổ cứng (FIFO), hỗ trợ tải nối tiếp khi mất mạng (`.part` safe resume).

---

## 🚀 Khởi Chạy Nhanh

### Cách 1: Chạy Bằng Node.js
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

### Cách 2: Triển Khai Docker / Podman Compose (Khuyên dùng)
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
      - ADMIN_PASSWORD=admin       # Mật khẩu ban đầu — hãy đổi sau lần đăng nhập đầu!
      - STORAGE_MAX_MB=20480       # Giới hạn 20GB cho thư mục tải trước khi tự dọn dẹp
    volumes:
      - ./downloads:/app/downloads  # Thư mục chứa nhạc/video đã tải
      - ./data:/app/data            # Dữ liệu SQLite bền vững (tài khoản, hạn mức)
```

Khởi động container:
```bash
docker compose up -d
```

---

## 🌐 Hướng Dẫn Cấu Hình Reverse Proxy (Tùy Chọn)

TuneFlow được thiết kế hoàn toàn **độc lập (agnostic)**. Nếu bạn sử dụng Reverse Proxy trong homelab, hãy chọn cấu hình phù hợp bên dưới:

### 🔹 Cách 1: Traefik v3 (Sử dụng Docker Labels)
Nếu máy chủ homelab của bạn đang chạy Traefik, chỉ cần thêm `labels` vào service `tuneflow` trong file `compose.yaml`:

```yaml
services:
  tuneflow:
    # ... cấu hình cơ bản ...
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tuneflow.rule=Host(`tuneflow.local`)"
      - "traefik.http.routers.tuneflow.entrypoints=websecure"
      - "traefik.http.routers.tuneflow.tls=true"
      - "traefik.http.services.tuneflow.loadbalancer.server.port=3000"
```

### 🔹 Cách 2: Nginx / Nginx Proxy Manager
Cần tắt `proxy_buffering` để hỗ trợ tua bài và truyền phát luồng âm thanh thời gian thực:

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

        # Bắt buộc để nghe thử và tua nhạc không bị nghẽn:
        proxy_buffering off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

### 🔹 Cách 3: Caddy 2
Thêm vào file `Caddyfile`:

```caddy
tuneflow.local {
    reverse_proxy localhost:3000
}
```

### 🔹 Cách 4: Cloudflare Tunnel
Trỏ tên miền public của bạn trực tiếp về `http://localhost:3000` trên trang quản trị Cloudflare Zero Trust mà không cần mở port modem.

---

## ⚙️ Bảng Tra Cứu Biến Môi Trường (Environment Variables)

| Biến Môi Trường | Mặc Định | Ý Nghĩa & Công Dụng |
| :--- | :--- | :--- |
| `PORT` | `3000` | Cổng HTTP TuneFlow lắng nghe |
| `NODE_ENV` | `production` | Môi trường thực thi (`production` / `development`) |
| `ADMIN_PASSWORD` | `admin` | Mật khẩu khởi tạo ban đầu cho tài khoản `admin` mặc định |
| `DB_PATH` | `./data/tuneflow.db` | Vị trí lưu trữ cơ sở dữ liệu SQLite |
| `DOWNLOADS_DIR` | `./downloads` | Thư mục lưu các bài hát đã tải về trên máy chủ |
| `GUEST_MAX_LISTEN_SEC` | `1800` (30 phút) | Tổng thời lượng nghe thử tối đa của khách trước khi nghỉ làm mát |
| `GUEST_COOLDOWN_SEC` | `1800` (30 phút) | Thời gian khách cần chờ để được nạp lại hạn mức nghe |
| `MAX_DOWNLOADS` | `2` | Số lượng tác vụ tải video đồng thời tối đa |
| `MAX_CONVERSIONS` | `1` | Số lượng tiến trình chuyển đổi âm thanh MP3 đồng thời |
| `MAX_RETRIES` | `3` | Số lần tự động thử lại khi rớt mạng |
| `STORAGE_MAX_MB` | `20480` (20GB) | Hạn mức dung lượng thư mục tải trước khi tự động dọn dẹp file cũ |
| `YTDLP_PROXY` | *Không* | Proxy HTTP/SOCKS5 trung gian cho các yêu cầu trích xuất YouTube |
| `YTDLP_EXTRACTOR_ARGS` | *Không* | Cấu hình trích xuất nâng cao (vd: `youtube:player_client=android,web`) |

---

## 👑 Tài Khoản Mặc Định Ban Đầu

* **Tên đăng nhập**: `admin`
* **Mật khẩu**: `admin` *(hoặc giá trị bạn gán vào `ADMIN_PASSWORD`)*
* 💡 *Lưu ý quan trọng: Sau khi đăng nhập, hãy bấm vào huy hiệu `👑 Quản trị` ở góc trên để đổi mật khẩu và quản lý danh sách tài khoản gia đình.*

---

## 📄 Giấy Phép & Tuyên Bố Trách Nhiệm

TuneFlow là dự án mã nguồn mở phục vụ mục đích giáo dục, giải trí cá nhân và gia đình trong homelab. Vui lòng tôn trọng bản quyền của các nghệ sĩ và tác giả nội dung.

Phát hành theo [Giấy phép MIT](LICENSE).
