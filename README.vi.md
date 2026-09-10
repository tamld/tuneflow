# 🎶 TuneFlow - Trình Tải & Nghe Nhạc Dành Cho Gia Đình

<div align="center">

**Ứng dụng tải nhạc & video chuyển đổi MP3 tự động dành cho Bố Mẹ — Giao diện thân thiện người lớn tuổi, nghe thử trực tiếp không giật lag, tự động lưu về máy tính, đóng gói container homelab siêu nhẹ.**

[![Latest Release](https://img.shields.io/github/v/release/tamld/tuneflow?color=blue&logo=github)](https://github.com/tamld/tuneflow/releases/latest)
[![CI Gate](https://github.com/tamld/tuneflow/actions/workflows/ci.yml/badge.svg)](https://github.com/tamld/tuneflow/actions/workflows/ci.yml)
[![Docker Image](https://img.shields.io/badge/GHCR-tuneflow%3Av2.4.2-2496ED?logo=docker&logoColor=white)](https://github.com/tamld/tuneflow/pkgs/container/tuneflow)
[![Design: WCAG AAA](https://img.shields.io/badge/Design-SilverMelody%20WCAG%20AAA-orange.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) · [Tiếng Việt](README.vi.md) · [Cẩm nang sử dụng](docs/USER_GUIDE.vi.md) · [Lộ trình phát triển](docs/ROADMAP.md)

</div>

---

## ⚡ 5 Điểm Nổi Bật Chính

1. 👴👵 **Giao diện "SilverMelody" Thân Thiện Bố Mẹ**: Chữ to rõ ràng, độ tương phản cao chống mỏi mắt (chuẩn WCAG AAA), nút bấm khổng lồ (≥56px).
2. 📱 **Hệ Sinh Thái Toàn Diện PWA & App Gốc**: Hỗ trợ PWA trên iOS 18 không bị ngắt nhạc khi tắt màn hình, tích hợp Picture-in-Picture (PiP) nổi hình ảnh, file APK Android và Android TV D-Pad.
3. 🎧 **Nghe Thử Trực Tiếp Không Tốn Ổ Cứng (Zero-Disk)**: Bấm vào thẻ bài hát là nghe thử ngay với cơ chế tự nạp luồng trước (Speculative Prewarming).
4. 🎛️ **Bộ Chỉnh Âm Thanh Web Audio DSP**: Bộ lọc 3 dải âm (Giọng Trong Trẻo, Nhạc Vàng Bolero Ấm Áp) và khuếch đại 125%–150% kèm nén động lực chống rè loa.
5. 🔐 **Bảo Mật SQLite Tự Động**: Phân quyền tài khoản (Admin, Thành viên, Khách), quản lý phiên và mã hóa dữ liệu AES-256-GCM tại chỗ.

---

## 📱 Nền Tảng Hỗ Trợ & Tải Ứng Dụng

| Nền tảng | Dạng ứng dụng | Tải về / Sử dụng | Nghe nền khi tắt màn hình |
| :--- | :--- | :--- | :---: |
| **Trình duyệt Web** | Máy tính (Chrome, Safari, Edge, Firefox) | `http://<ip-máy-chủ>:3000` | ✅ |
| **iOS / iPadOS** | Standalone PWA | Safari Thêm vào MH chính | ✅ (Giữ luồng phần cứng) |
| **Android Mobile** | Ứng dụng gốc / PWA | [Tải file APK Mobile](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Android TV** | Giao diện 10-Foot Leanback | [Tải file APK Android TV](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Máy chủ Homelab**| Container Docker Multi-Arch | `ghcr.io/tamld/tuneflow:v2.4.2` | ✅ |

---

## 🚀 Khởi Chạy Nhanh (Docker Compose)

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
      - ADMIN_PASSWORD=admin       # Đổi mật khẩu sau khi đăng nhập!
    volumes:
      - ./downloads:/app/downloads  # Thư mục lưu nhạc
      - ./data:/app/data            # Dữ liệu SQLite
```

Khởi chạy service:
```bash
docker compose up -d
```
Truy cập tại `http://localhost:3000`. Đăng nhập ban đầu: `admin` / `admin`.

---

## 📚 Trung Tâm Tài Liệu (Documentation Hub)

* 📖 **[Cẩm Nang Sử Dụng (Tiếng Việt)](docs/USER_GUIDE.vi.md)**: Hướng dẫn cài đặt từng bước cho iOS PWA, Android, Android TV và Docker.
* ⚙️ **[Cấu Hình Biến Môi Trường](docs/CONFIG.md)**: Bảng chi tiết toàn bộ biến môi trường, hạn mức và cơ chế bảo mật.
* 🌐 **[Mẫu Cấu Hình Reverse Proxy](docs/REVERSE_PROXY.md)**: Hướng dẫn cấu hình sẵn cho Traefik v3, Nginx, Caddy 2 và Cloudflare Tunnel.
* 🗺️ **[Lộ Trình Phát Triển](docs/ROADMAP.md)**: Chi tiết các giai đoạn phát triển tính năng từ Phase 1 đến Phase 11.
* 📜 **[Lịch Sử Phát Hành](CHANGELOG.md)**: Nhật ký cập nhật phiên bản, sửa lỗi và cải tiến hệ thống.
* 🏛️ **[Đặc Tả & Thiết Kế Kiến Trúc](docs/PRD.md)**: Toàn bộ hồ sơ kỹ thuật PRD, SRS, FSM và tuân thủ bản quyền.

---

## 📄 Giấy Phép Bản Quyền

TuneFlow phát hành theo giấy phép [MIT License](LICENSE).
