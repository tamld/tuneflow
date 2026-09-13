# 🎶 TuneFlow - Trình Tải & Nghe Nhạc Dành Cho Gia Đình

<div align="center">

**Ứng dụng tải nhạc & video chuyển đổi MP3 tự động dành cho Bố Mẹ — Giao diện thân thiện người lớn tuổi, nghe thử trực tiếp không giật lag, tự động lưu về máy tính, đóng gói container đa nền tảng (Docker, Podman, VPS, Cloud, Local).**

[![Latest Release](https://img.shields.io/github/v/release/tamld/tuneflow?color=blue&logo=github)](https://github.com/tamld/tuneflow/releases/latest)
[![CI Gate](https://github.com/tamld/tuneflow/actions/workflows/ci.yml/badge.svg)](https://github.com/tamld/tuneflow/actions/workflows/ci.yml)
[![Docker Image](https://img.shields.io/badge/GHCR-tuneflow%3A2.5.0-2496ED?logo=docker&logoColor=white)](https://github.com/tamld/tuneflow/pkgs/container/tuneflow)
[![Design: WCAG AAA](https://img.shields.io/badge/Design-SilverMelody%20WCAG%20AAA-orange.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[English](README.md) · [Tiếng Việt](README.vi.md) · [Cẩm nang sử dụng](docs/USER_GUIDE.vi.md) · [Lộ trình phát triển](docs/ROADMAP.md)

<br />

<img src="docs/assets/screenshots/desktop-player.png" alt="Giao diện TuneFlow trên máy tính (Desktop)" width="100%" />

*✨ Chuẩn thiết kế SilverMelody: Nút bấm lớn dễ bấm, bộ lọc âm thanh Web Audio DSP thời gian thực & nghe thử trực tiếp*

</div>

---

## 🖼️ Trải Nghiệm Giao Diện Thực Tế

| 📱 Ứng dụng Di Động PWA (iOS / Android) | 📺 Chế Độ Android TV 10-Foot Leanback |
| :---: | :---: |
| <img src="docs/assets/screenshots/mobile-pwa.png" alt="TuneFlow Mobile PWA UI" width="300" /> | <img src="docs/assets/screenshots/tv-leanback.png" alt="TuneFlow Android TV Leanback UI" width="520" /> |
| *Nghe thử bỏ túi, PWA chạy offline, điều khiển ngoài màn hình khóa* | *Xem từ xa trên sofa phòng khách, điều hướng remote D-pad viền vàng* |

---

## 🌸 Sứ Mệnh Phụng Dưỡng (Filial Technology) & Bảng So Sánh

TuneFlow được sinh ra với một sứ mệnh duy nhất: **Giúp người con phụng dưỡng đời sống tinh thần của Cha Mẹ bằng âm nhạc một cách an toàn và bền bỉ nhất.**

| Tiêu chí | Web Tải Miễn Phí (Y2Mate, v.v.) | MeTube / YouTube-DL Web | Spotify / YouTube Music | 🎶 TuneFlow (Dành Cho Bố Mẹ) |
| :--- | :--- | :--- | :--- | :--- |
| **Quảng cáo & Mã độc** | ❌ Tràn ngập popup cờ bạc, lừa đảo | ⚠️ Không có, nhưng giao diện thuần kỹ thuật | ⚠️ Phải trả phí tháng liên tục | 🛡️ **100% Sạch bóng quảng cáo, an toàn tuyệt đối** |
| **Nghe Thử Trước** | ❌ Không có, tải mù | ❌ Tải xong mới nghe được | ✅ Có | 🎧 **Nghe thử tức thì trực tiếp (Zero-Disk)** |
| **Thiết Kế Cho Người Già** | ❌ Chữ bé, rối mắt, bẫy click | ❌ Thuần kỹ thuật cho dân IT | ⚠️ Quá nhiều menu, thuật toán xáo trộn | 👴👵 **Chuẩn SilverMelody: Nút to, chữ rõ, tương phản AAA** |
| **Phát Lên TV Phòng Khách** | ❌ Không hỗ trợ | ❌ Không hỗ trợ | ⚠️ Cần tài khoản trả phí / AirPlay | 📡 **TuneFlow Connect: TV hiện mã PIN, điện thoại bấm phát** |
| **Cắm USB Loa / Xe Hơi** | ❌ Tải file tên rác, lỗi tiếng Việt | ❌ Tải file thô không thứ tự | ❌ Bị mã hóa DRM, cấm chép | 💾 **Xuất USB tự đánh số 001, 002... dọn rác FAT32** |
| **Quyền Sở Hữu Bản Nhạc** | ❌ Phụ thuộc link web lậu | ⚠️ Lưu cục bộ thô | ❌ Thuê bao, hết tiền là mất | 🔒 **Sở hữu vĩnh viễn trên Homelab / USB gia đình** |

---

## ⚡ 6 Điểm Đột Phá Chính

1. 👴👵 **Giao diện "SilverMelody" Thân Thiện Người Cao Tuổi**: Nút bấm to ($\ge 56$px), chữ lớn, tương phản cao chống chói mắt (WCAG 2.2 AAA), hỗ trợ 2 giao diện (Đêm Ấm và Ngày Dịu Warm Cream).
2. 📡 **TuneFlow Connect (Phát Lên TV Không Cần Gõ Chữ)**: Màn hình TV chỉ hiện mã PIN 4 số to rõ. Bố Mẹ hoặc con cái chọn bài trên điện thoại và bấm "Phát Lên TV" — giải phóng hoàn toàn khỏi cực hình gõ bàn phím remote TV!
3. 💾 **Cầu Nối USB / Thẻ Nhớ Vật Lý (Physical Hardware Bridge)**: Tự động phát hiện USB đang cắm, chép nhạc với thứ tự số `001 - Ca Si - Ten Bai Hat.mp3`, dọn sạch file rác macOS (`.DS_Store`, `._*`) giúp loa đài Craven/BKK, đài tụng kinh và đầu đĩa ô tô đọc 100% mượt mà. Cung cấp cả gói tải ZIP cho thiết bị từ xa.
4. 🎧 **Nghe Thử Trực Tiếp Không Tốn Ổ Cứng (Zero-Disk)**: Bấm vào bài hát nghe thử ngay lập tức với cơ chế nạp luồng trước, ưng ý mới bấm tải về máy.
5. 🎛️ **Bộ Lọc Âm Thanh Web Audio DSP**: Bộ lọc 3 dải âm (Giọng Trong Trẻo, Nhạc Vàng Bolero Trầm Ấm) và khuếch đại âm lượng 125%–150% chống rè cho người lớn tuổi lãng tai.
6. 🌸 **Tự Phục Hồi yt-dlp & Lời Báo Lỗi Ấm Áp**: Tự động vá lỗi khi YouTube cập nhật botguard. Tuyệt đối không hiện lỗi kỹ thuật tiếng Anh gây sợ hãi; chuyển hướng mượt mà sang Thư Viện bài hát đã tải sẵn.

---

## 💡 Nền Tảng Thực Tế & Kỹ Thuật Trung Thực (Engineering Reality)

Là một dự án mã nguồn mở phi lợi nhuận, TuneFlow luôn minh bạch về các giới hạn của hệ sinh thái độc quyền:

1. **Về Cảnh Báo Bản Quyền OS (macOS Gatekeeper & Windows SmartScreen)**:
   * Apple ($99/năm) và Microsoft ($300–$500/năm) đòi hỏi lập trình viên phải đóng phí chứng chỉ định kỳ. Một phần mềm miễn phí cho cộng đồng không thể duy trì khoản phí này.
   * **Khuyến nghị tốt nhất**: Sử dụng mô hình **Web-First / Docker Homelab** (chạy trên Mini PC/NAS/Raspberry Pi gia đình). Bố Mẹ truy cập qua trình duyệt hoặc PWA hoàn toàn không bao giờ gặp cảnh báo!
   * **Nếu dùng bản Desktop**: Chỉ cần click chuột phải chọn *Open* (trên macOS) hoặc bấm *More Info -> Run Anyway* (trên Windows) ở lần mở đầu tiên. Trên macOS, có thể mở terminal chạy: `xattr -cr /Applications/TuneFlow.app`.
2. **Về Chạy Ngầm Trên iOS / iPadOS (Rào cản WebKit Sandbox)**:
   * Apple cố tình giới hạn bộ nhớ PWA khi tắt màn hình để bảo vệ doanh thu App Store.
   * **Giải pháp tiện lợi**: Tính năng **"Màn Hình Đặt Bàn" (Screen WakeLock API)** cho phép giữ màn hình iPad luôn sáng dịu khi đặt trên kệ bếp hoặc bàn trà, vừa hiển thị bìa đĩa và đồng hồ thời gian, vừa nghe nhạc xuyên đêm không bị Apple ngắt quãng! Để nghe ngầm khi tắt màn hình, hãy dùng Android, Android TV hoặc loa máy tính.

---

## 📱 Nền Tảng Hỗ Trợ & Tải Ứng Dụng

| Nền tảng | Dạng ứng dụng | Tải về / Sử dụng | Nghe nền khi tắt màn hình |
| :--- | :--- | :--- | :---: |
| **Windows Desktop** | Bộ cài Wizard Inno Setup 6 (Zero-Admin) | [Tải Setup.exe](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **macOS Desktop** | Bộ cài đĩa DMG kéo-thả (Apple Silicon & Intel) | [Tải TuneFlow.dmg](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Linux Desktop** | Gói nén portable & Chuẩn FreeDesktop | [Tải bộ cài Linux](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Trình duyệt Web** | Máy tính (Chrome, Safari, Edge, Firefox) | `http://<ip-máy-chủ>:3000` | ✅ |
| **iOS / iPadOS** | Standalone PWA | Safari Thêm vào MH chính | ✅ (Giữ luồng phần cứng) |
| **Android Mobile** | Ứng dụng gốc / PWA | [Tải file APK Mobile](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Android TV** | Giao diện 10-Foot Leanback | [Tải file APK Android TV](https://github.com/tamld/tuneflow/releases/latest) | ✅ |
| **Máy chủ / Tự lưu trữ** | Container (Docker / Podman / Compose) | `ghcr.io/tamld/tuneflow:2.5.0` | ✅ |

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
