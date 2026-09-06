/**
 * Main Application Logic for TuneFlow
 */
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const resultsContainer = document.getElementById('results-grid');
  const resultsHeader = document.getElementById('results-header');
  const categoryPills = document.querySelectorAll('.pill-btn');
  const toastContainer = document.getElementById('toast-container');

  let activeDownloadedIds = new Set();

  // 1. Quick Category Recommendations
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const query = pill.getAttribute('data-query');
      searchInput.value = query;
      executeSearch(query);
    });
  });

  // 2. Search Button & Enter Key
  searchBtn.addEventListener('click', () => {
    executeSearch(searchInput.value);
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      executeSearch(searchInput.value);
    }
  });

  // 3. Search Execution
  async function executeSearch(query) {
    if (!query || !query.trim()) {
      showToast('⚠️ Ba Mẹ vui lòng nhập tên bài hát hoặc ca sĩ nhé!', 'warn');
      return;
    }

    resultsHeader.textContent = '⏳ Đang tìm kiếm các bài hát hay cho Ba Mẹ...';
    resultsContainer.innerHTML = '<div style="padding: 40px; text-align: center; font-size: 22px; color: var(--text-muted);">Đang tải danh sách bài hát, vui lòng chờ chút xíu ạ...</div>';

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&limit=12`);
      const data = await res.json();

      if (!data.success || !data.results || data.results.length === 0) {
        resultsHeader.textContent = 'Không tìm thấy bài hát';
        resultsContainer.innerHTML = '<div style="padding: 40px; text-align: center; font-size: 20px;">Dạ không tìm thấy bài hát này. Ba Mẹ thử gõ tên khác xem sao nhé!</div>';
        return;
      }

      resultsHeader.textContent = `🎵 Tìm thấy ${data.results.length} bài hát hay (Bấm nghe thử rồi chọn tải nhé!):`;
      renderResults(data.results);
    } catch (err) {
      resultsHeader.textContent = 'Lỗi kết nối';
      resultsContainer.innerHTML = `<div style="padding: 40px; text-align: center; font-size: 20px; color: var(--accent-red);">Dạ mạng đang bị gián đoạn, Ba Mẹ bấm thử lại nha!</div>`;
    }
  }

  // 4. Render Results Cards
  function renderResults(songs) {
    resultsContainer.innerHTML = '';

    songs.forEach(song => {
      const card = document.createElement('div');
      card.className = 'song-card';
      card.id = `card-${song.id}`;

      card.innerHTML = `
        <div class="song-thumbnail-wrapper">
          <img class="song-thumbnail" src="${song.thumbnail}" alt="${song.title}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'220\\' height=\\'124\\' fill=\\'%232e323e\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
          <span class="song-duration">${song.duration_string || '00:00'}</span>
        </div>
        <div class="song-info">
          <h3 class="song-title">${song.title}</h3>
          <p class="song-uploader">🎙️ ${song.uploader || 'Nghệ sĩ'}</p>
          <div class="song-status-badge" id="status-${song.id}" style="margin-top: 8px; font-size: 16px; font-weight: 600; color: var(--accent-gold); display: none;"></div>
        </div>
        <div class="song-actions">
          <button class="btn-preview" id="btn-preview-${song.id}">
            ▶️ Nghe Thử Trước
          </button>
          <button class="btn-download" id="btn-download-${song.id}">
            ⬇️ Tải Về Máy (MP3)
          </button>
        </div>
      `;

      // Event: Preview
      const previewBtn = card.querySelector(`#btn-preview-${song.id}`);
      previewBtn.addEventListener('click', () => {
        window.previewPlayer.playTrack(song);
      });

      // Event: Download
      const downloadBtn = card.querySelector(`#btn-download-${song.id}`);
      downloadBtn.addEventListener('click', () => {
        queueDownload(song);
      });

      resultsContainer.appendChild(card);
    });
  }

  // 5. Queue Download
  async function queueDownload(song) {
    showToast(`⏳ Đang bắt đầu chuẩn bị bài: "${song.title}"...`, 'info');
    const statusBadge = document.getElementById(`status-${song.id}`);
    if (statusBadge) {
      statusBadge.style.display = 'block';
      statusBadge.textContent = '⏳ Đang đưa vào danh sách tải...';
    }

    try {
      const res = await fetch('/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: song.url,
          title: song.title,
          uploader: song.uploader,
          thumbnail: song.thumbnail,
          duration: song.duration,
          format: 'mp3'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ Đã thêm vào hàng đợi: "${song.title}"!`, 'info');
      }
    } catch (err) {
      showToast('❌ Có lỗi xảy ra khi bắt đầu tải bài hát này', 'error');
    }
  }

  // 6. Connect Server-Sent Events (SSE) for Real-Time Progress & Client Download
  const eventSource = new EventSource('/api/queue/stream');

  eventSource.onmessage = (event) => {
    try {
      const items = JSON.parse(event.data);
      if (!Array.isArray(items)) return;

      items.forEach(item => {
        // Find cards matching this title or url
        document.querySelectorAll('.song-card').forEach(card => {
          const titleEl = card.querySelector('.song-title');
          if (titleEl && titleEl.textContent === item.title) {
            const statusBadge = card.querySelector('.song-status-badge');
            const downloadBtn = card.querySelector('.btn-download');

            if (statusBadge) {
              statusBadge.style.display = 'block';
              if (item.status === 'downloading') {
                statusBadge.textContent = `📥 Đang tải về máy chủ... (${item.progress}%) ${item.speed ? '• ' + item.speed : ''}`;
                statusBadge.style.color = 'var(--accent-gold)';
              } else if (item.status === 'converting') {
                statusBadge.textContent = `⚙️ Đang chuyển đổi sang MP3 xịn 320kbps... (90%)`;
                statusBadge.style.color = 'var(--accent-gold)';
              } else if (item.status === 'completed') {
                statusBadge.textContent = `✅ Đã xong! File đang tự động lưu vào máy Ba Mẹ.`;
                statusBadge.style.color = 'var(--accent-green)';
                if (downloadBtn) {
                  downloadBtn.textContent = '✅ Đã Tải Xong';
                }

                // Trigger browser client download once
                if (!activeDownloadedIds.has(item.id)) {
                  activeDownloadedIds.add(item.id);
                  triggerClientBrowserDownload(item);
                }
              } else if (item.status === 'failed') {
                statusBadge.textContent = `⚠️ Bài này bị lỗi tải, Ba Mẹ chọn bài khác nhé!`;
                statusBadge.style.color = 'var(--accent-red)';
              }
            }
          }
        });
      });
    } catch (e) {}
  };

  // 7. Direct Client Browser Download Trigger
  function triggerClientBrowserDownload(item) {
    showToast(`🎉 Đã tải xong bài "${item.title}"! File đang được lưu vào máy tính của Ba Mẹ.`, 'success');
    
    // Create hidden anchor element to trigger native browser file save
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = `/api/download/${item.id}/file`;
    a.setAttribute('download', `${item.sanitizedTitle}.mp3`);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 2000);
  }

  // 8. Toast Helper
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'warn') toast.style.borderColor = 'var(--accent-gold)';
    if (type === 'error') toast.style.borderColor = 'var(--accent-red)';
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
});
