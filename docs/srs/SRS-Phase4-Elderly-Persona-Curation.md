# SRS — Phase 4: Software Requirements Specification (Persona Curation)

## 1. Yêu Cầu Chức Năng (Functional Requirements)
- **FR-401 (Persona Presets Endpoint)**:
  - Endpoint: `GET /api/curation/presets`
  - Output: Cấu trúc danh mục định sẵn:
    ```json
    {
      "mom": {
        "title": "Mẹ Hay Nghe",
        "icon": "🌸",
        "queries": ["nhạc thiền ngủ ngon", "niệm phật êm dịu", "nhạc không lời thư giãn spa", "dân ca quê hương"]
      },
      "dad": {
        "title": "Ba Hay Nghe",
        "icon": "☕",
        "queries": ["nhạc vàng bolero chọn lọc", "nhạc tiền chiến bất hủ", "cải lương hồ quảng", "vọng cổ"]
      }
    }
    ```
- **FR-402 (Vocal Filter Query Transformer)**:
  - Cho phép client truyền tham số `filter=instrumental` hoặc `filter=vocal`.
  - Backend tự động thêm từ khóa ngữ cảnh vào yt-dlp search query:
    - `filter=instrumental` ➔ `query + " không lời hòa tấu"`
    - `filter=vocal` ➔ `query + " ca sĩ hát có lời"`
- **FR-403 (Client Local Favorites Sync)**:
  - Client lưu danh sách bài hát yêu thích trong `localStorage.getItem('tuneflow_favorites')`.
  - Hỗ trợ xuất / nhập nhanh danh sách yêu thích qua mã QR để chuyển sang điện thoại khác của ba mẹ.

## 2. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)
- **NFR-401 (Tương tác)**: Chuyển đổi danh mục Persona hiển thị kết quả ngay lập tức trong vòng $\le 500\text{ms}$ thông qua caching kết quả tìm kiếm.
- **NFR-402 (Khả năng tiếp cận)**: Kích thước biểu tượng $\ge 32\text{px}$, kích thước chữ hiển thị tên danh mục $\ge 18\text{px}$ với font chữ sans-serif dễ đọc.
