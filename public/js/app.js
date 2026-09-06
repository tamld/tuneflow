/**
 * Main Application Logic for TuneFlow (v1.2.0)
 * Includes Persona Hero Navigation, Playlist Batch Ingestion, Vocal Filters, and Zero-Login Favorites
 */
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const resultsContainer = document.getElementById('results-grid');
  const resultsHeader = document.getElementById('results-header');
  const categoryPillsContainer = document.getElementById('category-pills');
  const toastContainer = document.getElementById('toast-container');
  const favCountEl = document.getElementById('fav-count');

  // Persona buttons
  const btnPersonaMom = document.getElementById('btn-persona-mom');
  const btnPersonaDad = document.getElementById('btn-persona-dad');
  const btnPersonaFavs = document.getElementById('btn-persona-favorites');

  // Filter chips
  const filterChips = document.querySelectorAll('.filter-chip');
  let currentFilter = 'all';

  // Playlist Batch Panel
  const playlistPanel = document.getElementById('playlist-panel');
  const playlistPanelTitle = document.getElementById('playlist-panel-title');
  const playlistPanelMeta = document.getElementById('playlist-panel-meta');
  const playlistItemsList = document.getElementById('playlist-items-list');
  const btnSelectAll = document.getElementById('btn-select-all');
  const btnDownloadBatch = document.getElementById('btn-download-batch');
  const batchSelectedCountEl = document.getElementById('batch-selected-count');

  let activeDownloadedIds = new Set();
  let currentPlaylistTracks = [];
  let favorites = [];

  try {
    favorites = JSON.parse(localStorage.getItem('tuneflow_favorites') || '[]');
  } catch (e) {
    favorites = [];
  }
  updateFavCount();

  // 1. Persona Navigation & Curation
  const personaPresets = {
    mom: {
      title: 'Mẹ Hay Nghe',
      pills: [
        { label: '🧘 Nhạc Thiền Thư Giãn', query: 'Nhạc thiền tịnh tâm ngủ ngon' },
        { label: '📿 Niệm Phật Tịnh Tâm', query: 'Niệm phật êm dịu thanh tịnh' },
        { label: '🌿 Nhạc Spa Thư Giãn', query: 'Nhạc spa thư giãn ngủ sâu' },
        { label: '🌾 Dân Ca Quê Hương', query: 'Dân ca quê hương chọn lọc ngọt ngào' }
      ],
      defaultQuery: 'Nhạc thiền tịnh tâm ngủ ngon'
    },
    dad: {
      title: 'Ba Hay Nghe',
      pills: [
        { label: '📻 Nhạc Vàng Bolero', query: 'Nhạc vàng 1975 bolero chọn lọc' },
        { label: '🎭 Tân Cổ Giao Duyên', query: 'Tân cổ giao duyên tuyển chọn hay nhất' },
        { label: '🌸 Nhạc Tiền Chiến', query: 'Nhạc tiền chiến bất hủ trữ tình' },
        { label: '🌾 Ca Cổ Miền Tây', query: 'Vọng cổ miền tây ngọt ngào' }
      ],
      defaultQuery: 'Nhạc vàng 1975 bolero chọn lọc'
    }
  };

  btnPersonaMom.addEventListener('click', () => switchPersona('mom'));
  btnPersonaDad.addEventListener('click', () => switchPersona('dad'));
  btnPersonaFavs.addEventListener('click', showFavoritesView);

  function switchPersona(type) {
    btnPersonaMom.classList.toggle('active', type === 'mom');
    btnPersonaDad.classList.toggle('active', type === 'dad');
    btnPersonaFavs.classList.remove('active');
    playlistPanel.style.display = 'none';

    const preset = personaPresets[type];
    if (!preset) return;

    categoryPillsContainer.innerHTML = '';
    preset.pills.forEach(pillData => {
      const btn = document.createElement('button');
      btn.className = 'pill-btn';
      btn.setAttribute('data-query', pillData.query);
      btn.textContent = pillData.label;
      btn.addEventListener('click', () => {
        searchInput.value = pillData.query;
        executeSearch(pillData.query);
      });
      categoryPillsContainer.appendChild(btn);
    });

    searchInput.value = preset.defaultQuery;
    executeSearch(preset.defaultQuery);
  }

  // 2. Vocal / Instrumental Filter Chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.getAttribute('data-filter');
      if (searchInput.value.trim()) {
        executeSearch(searchInput.value);
      }
    });
  });

  // 3. Search Button & Enter Key
  searchBtn.addEventListener('click', () => {
    executeSearch(searchInput.value);
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      executeSearch(searchInput.value);
    }
  });

  // 4. Search Execution (Supports both single track and playlist URL)
  async function executeSearch(query) {
    if (!query || !query.trim()) {
      showToast('⚠️ Ba Mẹ vui lòng nhập tên bài hát hoặc ca sĩ nhé!', 'warn');
      return;
    }

    const trimmed = query.trim();

    // Check if input is a YouTube Playlist URL
    if (trimmed.includes('list=') || trimmed.includes('/playlist')) {
      handlePlaylistUrl(trimmed);
      return;
    }

    playlistPanel.style.display = 'none';
    resultsHeader.textContent = '⏳ Đang tìm kiếm các bài hát hay cho Ba Mẹ...';
    resultsContainer.innerHTML = '<div style="padding: 40px; text-align: center; font-size: 22px; color: var(--text-muted);">Đang tải danh sách bài hát, vui lòng chờ chút xíu ạ...</div>';

    let finalQuery = trimmed;
    if (currentFilter === 'vocal') finalQuery += ' có lời ca sĩ hát';
    if (currentFilter === 'instrumental') finalQuery += ' không lời hòa tấu';

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(finalQuery)}&limit=12`);
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

  // 5. Playlist Ingestion Handler
  async function handlePlaylistUrl(url) {
    resultsHeader.textContent = '⏳ Đang bóc tách danh sách phát...';
    resultsContainer.innerHTML = '';
    playlistPanel.style.display = 'block';
    playlistPanelTitle.textContent = '⏳ Đang tải toàn bộ danh sách phát...';
    playlistPanelMeta.textContent = 'Vui lòng chờ một chút ạ...';
    playlistItemsList.innerHTML = '<div style="padding: 20px; text-align: center; font-size: 18px;">Đang đọc thông tin các bài hát trong playlist...</div>';

    try {
      const res = await fetch('/api/playlist/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();

      if (!data.success || !data.items || data.items.length === 0) {
        showToast('⚠️ Không thể đọc danh sách phát này hoặc danh sách đang để chế độ riêng tư', 'warn');
        playlistPanel.style.display = 'none';
        return;
      }

      currentPlaylistTracks = data.items;
      playlistPanelTitle.textContent = `📻 ${data.title || 'Danh Sách Tuyển Chọn'}`;
      playlistPanelMeta.textContent = `Tuyển tập gồm ${data.count} bài hát của "${data.uploader || 'Nghệ sĩ'}"`;
      renderPlaylistBatch(data.items);
      resultsHeader.textContent = `✨ Đã hiển thị toàn bộ tuyển tập gồm ${data.count} bài hát.`;
    } catch (err) {
      showToast('❌ Lỗi khi đọc danh sách phát', 'error');
      playlistPanel.style.display = 'none';
    }
  }

  // 6. Render Playlist Batch Panel
  function renderPlaylistBatch(items) {
    playlistItemsList.innerHTML = '';
    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'playlist-item-row';
      row.innerHTML = `
        <input type="checkbox" class="playlist-checkbox" id="chk-${item.id}" data-id="${item.id}" checked>
        <span style="font-weight: 700; color: var(--accent-gold); min-width: 28px;">${index + 1}.</span>
        <img class="playlist-item-thumb" src="${item.thumbnail}" alt="${item.title}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'70\\' height=\\'45\\' fill=\\'%232e323e\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
        <span class="playlist-item-title">${item.title}</span>
        <span class="playlist-item-duration">${item.duration_string || '00:00'}</span>
        <button class="btn-preview" style="min-height: 40px; padding: 6px 14px; font-size: 15px;" id="btn-preview-pl-${item.id}">▶️ Nghe</button>
      `;

      row.querySelector(`#btn-preview-pl-${item.id}`).addEventListener('click', (e) => {
        e.stopPropagation();
        window.previewPlayer.playTrack(item);
      });

      row.querySelector('.playlist-checkbox').addEventListener('change', updateSelectedBatchCount);
      playlistItemsList.appendChild(row);
    });

    updateSelectedBatchCount();
  }

  function updateSelectedBatchCount() {
    const checked = playlistItemsList.querySelectorAll('.playlist-checkbox:checked');
    batchSelectedCountEl.textContent = checked.length;
  }

  btnSelectAll.addEventListener('click', () => {
    const checkboxes = playlistItemsList.querySelectorAll('.playlist-checkbox');
    const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
    checkboxes.forEach(cb => cb.checked = anyUnchecked);
    btnSelectAll.textContent = anyUnchecked ? 'Bỏ Chọn Tất Cả' : 'Đánh Dấu Tất Cả';
    updateSelectedBatchCount();
  });

  btnDownloadBatch.addEventListener('click', async () => {
    const checked = Array.from(playlistItemsList.querySelectorAll('.playlist-checkbox:checked'));
    if (checked.length === 0) {
      showToast('⚠️ Ba Mẹ hãy tích chọn ít nhất 1 bài hát để tải nhé!', 'warn');
      return;
    }

    const selectedIds = new Set(checked.map(cb => cb.getAttribute('data-id')));
    const selectedTracks = currentPlaylistTracks.filter(t => selectedIds.has(t.id));

    showToast(`⏳ Đang bắt đầu xếp hàng ${selectedTracks.length} bài hát tải về máy...`, 'info');

    try {
      const res = await fetch('/api/queue/batch-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedTracks, format: 'mp3' })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🎉 Đã đưa ${data.queuedCount} bài hát vào danh sách tải tự động!`, 'success');
      }
    } catch (err) {
      showToast('❌ Lỗi khi tải danh sách bài hát', 'error');
    }
  });

  // 7. Render Song Cards
  function renderResults(songs) {
    resultsContainer.innerHTML = '';

    songs.forEach(song => {
      const isFav = favorites.some(f => f.id === song.id);
      const card = document.createElement('div');
      card.className = 'song-card';
      card.id = `card-${song.id}`;

      card.innerHTML = `
        <div class="song-thumbnail-wrapper">
          <img class="song-thumbnail" src="${song.thumbnail}" alt="${song.title}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'220\\' height=\\'124\\' fill=\\'%232e323e\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
          <span class="song-duration">${song.duration_string || '00:00'}</span>
        </div>
        <div class="song-info">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <h3 class="song-title">${song.title}</h3>
            <button class="btn-fav" id="btn-fav-${song.id}" title="Lưu bài hát yêu thích">${isFav ? '❤️' : '🤍'}</button>
          </div>
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

      // Event: Favorite Toggle
      const favBtn = card.querySelector(`#btn-fav-${song.id}`);
      favBtn.addEventListener('click', () => {
        toggleFavorite(song, favBtn);
      });

      resultsContainer.appendChild(card);
    });
  }

  // 8. Favorites Management (Zero-Login)
  function toggleFavorite(song, btnEl) {
    const idx = favorites.findIndex(f => f.id === song.id);
    if (idx >= 0) {
      favorites.splice(idx, 1);
      btnEl.textContent = '🤍';
      showToast(`Đã xóa khỏi danh sách yêu thích: "${song.title}"`, 'info');
    } else {
      favorites.push({
        id: song.id,
        title: song.title,
        uploader: song.uploader,
        thumbnail: song.thumbnail,
        duration: song.duration,
        duration_string: song.duration_string,
        url: song.url
      });
      btnEl.textContent = '❤️';
      showToast(`❤️ Đã lưu bài "${song.title}" vào mục yêu thích của Ba Mẹ!`, 'success');
    }
    localStorage.setItem('tuneflow_favorites', JSON.stringify(favorites));
    updateFavCount();
  }

  function updateFavCount() {
    if (favCountEl) favCountEl.textContent = favorites.length;
  }

  function showFavoritesView() {
    btnPersonaMom.classList.remove('active');
    btnPersonaDad.classList.remove('active');
    btnPersonaFavs.classList.add('active');
    playlistPanel.style.display = 'none';

    if (favorites.length === 0) {
      resultsHeader.textContent = '❤️ Danh Sách Bài Hát Yêu Thích';
      resultsContainer.innerHTML = '<div style="padding: 40px; text-align: center; font-size: 20px; color: var(--text-muted);">Ba Mẹ chưa bấm lưu bài hát nào. Khi nghe bài nào ưng ý, Ba Mẹ bấm vào hình trái tim ❤️ để lưu vào đây nhé!</div>';
      return;
    }

    resultsHeader.textContent = `❤️ Các bài hát Ba Mẹ đã bấm thích (${favorites.length} bài):`;
    renderResults(favorites);
  }

  // 9. Single Download Queue
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

  // 10. Connect Server-Sent Events (SSE) for Real-Time Progress & Client Download
  const eventSource = new EventSource('/api/queue/stream');

  eventSource.onmessage = (event) => {
    try {
      const items = JSON.parse(event.data);
      if (!Array.isArray(items)) return;

      items.forEach(item => {
        document.querySelectorAll('.song-card').forEach(card => {
          const titleEl = card.querySelector('.song-title');
          if (titleEl && titleEl.textContent === item.title) {
            const statusBadge = card.querySelector('.song-status-badge');
            const downloadBtn = card.querySelector('.btn-download');

            if (statusBadge) {
              statusBadge.style.display = 'block';
              if (item.status === 'downloading') {
                statusBadge.textContent = `📥 Đang tải về... (${item.progress}%) ${item.speed ? '• ' + item.speed : ''}`;
                statusBadge.style.color = 'var(--accent-gold)';
              } else if (item.status === 'converting') {
                statusBadge.textContent = `⚙️ Đang ghép âm thanh MP3 320kbps... (90%)`;
                statusBadge.style.color = 'var(--accent-gold)';
              } else if (item.status === 'completed') {
                statusBadge.textContent = `✅ Đã xong! File đang lưu vào máy tính Ba Mẹ.`;
                statusBadge.style.color = 'var(--accent-green)';
                if (downloadBtn) {
                  downloadBtn.textContent = '✅ Đã Tải Xong';
                }

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

  // 11. Direct Client Browser Download Trigger
  function triggerClientBrowserDownload(item) {
    showToast(`🎉 Đã tải xong bài "${item.title}"! File đang được lưu vào máy tính của Ba Mẹ.`, 'success');
    
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

  // 12. Toast Helper
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
