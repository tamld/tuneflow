# 🎶 TuneFlow - Trình Tải & Chuyển Đổi Nhạc Dành Cho Gia Đình

<div align="center">

**Ứng dụng tải nhạc & video chuyển đổi MP3 tự động dành cho Ba Mẹ — Giao diện thân thiện người lớn tuổi, nghe thử trực tiếp, tự động lưu về máy tính, đóng gói container siêu nhẹ cho Proxmox Homelab.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: ≥20](https://img.shields.io/badge/Node-%E2%89%A520-green.svg)](#)
[![Docker: Alpine](https://img.shields.io/badge/Docker-Alpine%20%3C120MB-cyan.svg)](#)
[![Design: WCAG AAA](https://img.shields.io/badge/Design-SilverMelody%20WCAG%20AAA-orange.svg)](#)

[English](README.md) · [Tiếng Việt](README.vi.md)

</div>

---

## 🌟 Điểm Nổi Bật Dành Cho Ba Mẹ

- 👴👵 **Giao diện "SilverMelody" Thân thiện**: Chữ to rõ ràng, độ tương phản cao chống mỏi mắt (chuẩn WCAG AAA), nút bấm khổng lồ (≥56px) rê chuột không bị trượt.
- 🎧 **Nghe Thử Trực Tiếp Không Quảng Cáo**: Bấm nút ▶️ là nghe thử bài hát ngay trên web để chắc chắn đúng giọng ca sĩ yêu thích trước khi bấm tải.
- 💾 **Tải Thẳng Về Máy Tính Ba Mẹ**: Proxmox Homelab lo phần xử lý tải và nén MP3 320kbps, sau đó đẩy thẳng file về thư mục `Downloads` trên máy tính của Ba Mẹ.
- 📦 **Tải Album & Playlist 1-Click**: Hỗ trợ dán link cả danh sách phát nhạc xưa, tân cổ, nhạc thiền để tải một lần trọn bộ.
- 🛡️ **Bền bỉ, Chống sập nguồn (Crash-Survival)**: Tự động lưu tiến trình dở dang, đứt mạng tự nối tiếp tải (Resume) không mất công tải lại từ đầu.
- 🐳 **Docker Siêu Nhẹ Cho Homelab**: Dung lượng container <120MB, ăn chưa đến 40MB RAM lúc chờ, tương thích sẵn nhãn Traefik (`music.homelab.local`).

---

## 🚀 Khởi Chạy Nhanh

```bash
# Cài đặt và chạy thử
npm install
npm start
# Mở trình duyệt tại: http://localhost:3000
```
