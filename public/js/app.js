/**
 * Main Application Logic for TuneFlow (v1.3.0)
 * Includes Persona Hero Navigation, Playlist Batch Ingestion, Vocal Filters,
 * Zero-Login Favorites, Persistent Queue Drawer, Accessible Guidance Modal,
 * Clear Search, and Font Size Scaling.
 */
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const resultsContainer = document.getElementById('results-grid');
  const resultsHeader = document.getElementById('results-header');
  const categoryPillsContainer = document.getElementById('category-pills');
  const toastContainer = document.getElementById('toast-container');
  const favCountEl = document.getElementById('fav-count');
  const categorySectionLabel = document.getElementById('category-section-label');

  // Modal & Drawer Elements
  const btnHelp = document.getElementById('btn-help');
  const helpModal = document.getElementById('help-modal');
  const btnHelpClose = document.getElementById('btn-help-close');
  const btnHelpAck = document.getElementById('btn-help-ack');

  const btnFloatingQueue = document.getElementById('btn-floating-queue');
  const queueBadgeCountEl = document.getElementById('queue-badge-count');
  const queueDrawerOverlay = document.getElementById('queue-drawer-overlay');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const drawerCountEl = document.getElementById('drawer-count');
  const drawerQueueList = document.getElementById('drawer-queue-list');
  const btnDrawerClearDone = document.getElementById('btn-drawer-clear-done');

  // Font Scaler Buttons
  const btnFontDec = document.getElementById('btn-font-dec');
  const btnFontReset = document.getElementById('btn-font-reset');
  const btnFontInc = document.getElementById('btn-font-inc');

  // Security: HTML Escaping Helper (Prevents DOM-based XSS)
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

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
  let activeTrackList = [];
  let currentSearchAbortController = null;

  try {
    favorites = JSON.parse(localStorage.getItem('tuneflow_favorites') || '[]');
  } catch (e) {
    favorites = [];
  }
  updateFavCount();

  // 1. Persona Navigation & Curation Presets (Bố vs Mẹ)
  const personaPresets = {
    mom: {
      title: 'Mẹ Hay Nghe',
      sectionLabel: '🌸 Thể loại Mẹ hay nghe:',
      pills: [
        { label: '🌸 Dân Ca Quê Hương', query: 'Dân ca quê hương chọn lọc ngọt ngào' },
        { label: '📿 Niệm Phật Tịnh Tâm', query: 'Niệm phật êm dịu thanh tịnh' },
        { label: '🧘 Nhạc Thiền Dễ Ngủ', query: 'Nhạc thiền tịnh tâm ngủ ngon dễ ngủ' },
        { label: '🪷 Trữ Tình Quê Mẹ', query: 'Ca nhạc trữ tình quê hương ngọt ngào' },
        { label: '🪕 Tân Cổ Giao Duyên', query: 'Tân cổ giao duyên tuyển chọn hay nhất' },
        { label: '🌿 Nhạc Spa Thư Giãn', query: 'Nhạc spa thư giãn ngủ sâu giảm căng thẳng' }
      ],
      defaultQuery: 'Dân ca quê hương chọn lọc ngọt ngào'
    },
    dad: {
      title: 'Bố Hay Nghe',
      sectionLabel: '☕ Thể loại Bố hay nghe:',
      pills: [
        { label: '📻 Nhạc Vàng Bolero', query: 'Nhạc vàng 1975 bolero chọn lọc' },
        { label: '🎸 Tình Ca Trịnh Công Sơn', query: 'Nhạc Trịnh Công Sơn Khánh Ly bất hủ' },
        { label: '📜 Nhạc Tiền Chiến & Đỏ', query: 'Nhạc tiền chiến bất hủ hào hùng' },
        { label: '🪕 Cải Lương & Vọng Cổ', query: 'Cải lương vọng cổ hồ quảng tuyển chọn' },
        { label: '🎷 Hòa Tấu Guitar & Saxophone', query: 'Hòa tấu guitar saxophone êm dịu' },
        { label: '🌾 Tình Ca Quê Hương', query: 'Ca khúc quê hương đi cùng năm tháng hay nhất' }
      ],
      defaultQuery: 'Nhạc vàng 1975 bolero chọn lọc'
    }
  };

  let currentPersona = 'mom';

  btnPersonaMom.addEventListener('click', () => switchPersona('mom', true));
  btnPersonaDad.addEventListener('click', () => switchPersona('dad', true));
  btnPersonaFavs.addEventListener('click', showFavoritesView);

  const btnLangToggle = document.getElementById('btn-lang-toggle');
  if (btnLangToggle && window.TuneFlowI18n) {
    // Initial language setup from saved preference
    window.TuneFlowI18n.setLanguage(window.TuneFlowI18n.getLanguage());

    btnLangToggle.addEventListener('click', () => {
      const nextLang = window.TuneFlowI18n.getLanguage() === 'vi' ? 'en' : 'vi';
      window.TuneFlowI18n.setLanguage(nextLang);
      showToast(nextLang === 'en' ? '🇬🇧 Switched language to English!' : '🇻🇳 Đã chuyển sang Tiếng Việt!', 'info');
      refreshCurrentPersonaPresets();
    });
  }

  function refreshCurrentPersonaPresets() {
    switchPersona(currentPersona, false);
  }

  function removeFavBatchBar() {
    const existingBar = document.getElementById('fav-batch-bar');
    if (existingBar) existingBar.remove();
  }

  // Event delegation on category pills container (Issue #40)
  // Ensures any category pill button click always triggers search reliably across all tabs/languages
  if (categoryPillsContainer) {
    categoryPillsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.pill-btn');
      if (!btn) return;
      const query = btn.getAttribute('data-query');
      const label = btn.textContent.trim();
      if (query) {
        categoryPillsContainer.querySelectorAll('.pill-btn').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        searchInput.value = query;
        if (btnClearSearch) btnClearSearch.style.display = 'flex';
        executeSearch(query, label);
      }
    });
  }

  function switchPersona(type, autoSearch = true) {
    currentPersona = type;
    removeFavBatchBar();
    btnPersonaMom.classList.toggle('active', type === 'mom');
    btnPersonaDad.classList.toggle('active', type === 'dad');
    btnPersonaFavs.classList.remove('active');
    playlistPanel.style.display = 'none';

    const presets = window.TuneFlowI18n ? window.TuneFlowI18n.getPresets() : personaPresets;
    const preset = presets[type];
    if (!preset) return;

    if (categorySectionLabel) {
      categorySectionLabel.textContent = preset.sectionLabel;
    }

    categoryPillsContainer.innerHTML = '';
    preset.pills.forEach((pillData, idx) => {
      const btn = document.createElement('button');
      btn.className = 'pill-btn' + (idx === 0 ? ' active' : '');
      btn.setAttribute('data-query', pillData.query);
      btn.textContent = pillData.label;
      categoryPillsContainer.appendChild(btn);
    });

    if (autoSearch) {
      searchInput.value = preset.defaultQuery;
      if (btnClearSearch) btnClearSearch.style.display = 'flex';
      executeSearch(preset.defaultQuery, preset.pills[0].label);
    }
  }

  // Initial load: Bind default Mom persona pills without heavy auto search (Issue #40)
  switchPersona('mom', false);

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

  // 3. Search Button, Enter Key, & Clear Search (Issue #12)
  searchBtn.addEventListener('click', () => {
    executeSearch(searchInput.value);
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      executeSearch(searchInput.value);
    }
  });

  if (searchInput && btnClearSearch) {
    searchInput.addEventListener('input', () => {
      btnClearSearch.style.display = searchInput.value.length > 0 ? 'flex' : 'none';
    });
    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      btnClearSearch.style.display = 'none';
      searchInput.focus();
    });
  }

  // Vietnamese Voice Search (Phase 8 - Issue #45)
  const btnVoiceSearch = document.getElementById('btn-voice-search');
  if (btnVoiceSearch) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = (localStorage.getItem('tuneflow_lang') === 'en') ? 'en-US' : 'vi-VN';

      let isRecording = false;

      recognition.onstart = () => {
        isRecording = true;
        btnVoiceSearch.classList.add('recording');
        btnVoiceSearch.title = '🔴 Đang nghe Bố Mẹ nói...';
        showToast('🎙️ Đang lắng nghe... Bố Mẹ nói tên bài hát nhé!', 'info');
      };

      recognition.onresult = (event) => {
        const rawTranscript = event.results[0][0].transcript;
        if (rawTranscript) {
          const transcript = rawTranscript.replace(/[\.\,\?\!]+$/, '').trim();
          searchInput.value = transcript;
          if (btnClearSearch) btnClearSearch.style.display = 'flex';
          showToast(`🎙️ Đã nghe: "${transcript}" - Đang tìm kiếm...`, 'success');
          executeSearch(transcript);
        }
      };

      recognition.onerror = (event) => {
        console.warn('[Voice Recognition Error]', event.error);
        showToast('⚠️ Chưa nghe rõ Bố Mẹ nói, Bố Mẹ thử lại nhé!', 'warn');
      };

      recognition.onend = () => {
        isRecording = false;
        btnVoiceSearch.classList.remove('recording');
        btnVoiceSearch.title = 'Tìm kiếm bằng giọng nói';
      };

      btnVoiceSearch.addEventListener('click', () => {
        if (isRecording) {
          try { recognition.stop(); } catch (_e) {}
        } else {
          try {
            recognition.lang = (localStorage.getItem('tuneflow_lang') === 'en') ? 'en-US' : 'vi-VN';
            recognition.start();
          } catch (e) {
            console.warn('[Voice Start Error]', e);
          }
        }
      });
    } else {
      btnVoiceSearch.addEventListener('click', () => {
        showToast('Trình duyệt chưa hỗ trợ tính năng nhận diện giọng nói này.', 'warn');
      });
    }
  }

  // 4. Accessible Guidance Modal (Issue #10)
  function openHelpModal() {
    if (helpModal) helpModal.style.display = 'flex';
  }
  function closeHelpModal() {
    if (helpModal) helpModal.style.display = 'none';
  }
  if (btnHelp) btnHelp.addEventListener('click', openHelpModal);
  if (btnHelpClose) btnHelpClose.addEventListener('click', closeHelpModal);
  if (btnHelpAck) btnHelpAck.addEventListener('click', closeHelpModal);
  if (helpModal) {
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) closeHelpModal();
    });
  }

  // 5. Persistent Queue Slide-Over Drawer (Issue #9)
  function openQueueDrawer() {
    if (queueDrawerOverlay) queueDrawerOverlay.style.display = 'flex';
  }
  function closeQueueDrawer() {
    if (queueDrawerOverlay) queueDrawerOverlay.style.display = 'none';
  }
  if (btnFloatingQueue) btnFloatingQueue.addEventListener('click', openQueueDrawer);
  if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeQueueDrawer);
  if (queueDrawerOverlay) {
    queueDrawerOverlay.addEventListener('click', (e) => {
      if (e.target === queueDrawerOverlay) closeQueueDrawer();
    });
  }

  // Global Keyboard Shortcuts (Escape to close modals)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeHelpModal();
      closeQueueDrawer();
    }
  });

  // 6. Font Size Scaling (Issue #12 & Issue #49: Dynamic Typography Scaling)
  const fontScales = [
    { label: '90%', multiplier: 0.9 },
    { label: '100%', multiplier: 1.0 },
    { label: '115%', multiplier: 1.15 },
    { label: '130%', multiplier: 1.3 }
  ];
  let currentScaleIdx = 1; // Default 100%

  function applyFontScale(idx) {
    currentScaleIdx = Math.max(0, Math.min(fontScales.length - 1, idx));
    const { label, multiplier } = fontScales[currentScaleIdx];
    document.documentElement.style.fontSize = label;
    document.documentElement.style.setProperty('--user-font-scale', multiplier);
    try {
      localStorage.setItem('tuneflow_font_scale', label);
    } catch (e) {}
    showToast(`🔤 Cỡ chữ hiển thị: ${label}`, 'info');
  }

  try {
    const savedScale = localStorage.getItem('tuneflow_font_scale');
    const matchedIdx = fontScales.findIndex(s => s.label === savedScale);
    if (matchedIdx !== -1) {
      currentScaleIdx = matchedIdx;
      const { label, multiplier } = fontScales[currentScaleIdx];
      document.documentElement.style.fontSize = label;
      document.documentElement.style.setProperty('--user-font-scale', multiplier);
    }
  } catch (e) {}

  if (btnFontDec) btnFontDec.addEventListener('click', () => applyFontScale(currentScaleIdx - 1));
  if (btnFontReset) btnFontReset.addEventListener('click', () => applyFontScale(1));
  if (btnFontInc) btnFontInc.addEventListener('click', () => applyFontScale(currentScaleIdx + 1));

  // 4. Search Execution (Supports both single track and playlist URL)
  async function executeSearch(query, genreLabel = null) {
    removeFavBatchBar();
    if (!query || !query.trim()) {
      showToast('⚠️ Bố Mẹ vui lòng nhập tên bài hát hoặc ca sĩ nhé!', 'warn');
      return;
    }

    const trimmed = query.trim();

    // Check if input is a YouTube Playlist URL
    if (trimmed.includes('list=') || trimmed.includes('/playlist')) {
      handlePlaylistUrl(trimmed);
      return;
    }

    playlistPanel.style.display = 'none';
    resultsHeader.textContent = genreLabel 
      ? `📻 Đang mở thể loại: ${genreLabel} (Bố Mẹ chờ xíu nha...)`
      : '⏳ Đang tìm kiếm các bài hát hay cho Bố Mẹ...';
    resultsContainer.innerHTML = '<div style="padding: 40px; text-align: center; font-size: 22px; color: var(--text-muted);">Đang tải danh sách bài hát, vui lòng chờ chút xíu ạ...</div>';

    let finalQuery = trimmed;
    if (currentFilter === 'vocal') finalQuery += ' có lời ca sĩ hát';
    if (currentFilter === 'instrumental') finalQuery += ' hòa tấu không lời guitar saxophone';

    if (currentSearchAbortController) {
      try {
        currentSearchAbortController.abort();
      } catch (_e) {}
    }
    currentSearchAbortController = new AbortController();
    const searchSignal = currentSearchAbortController.signal;

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(finalQuery)}&limit=12`, {
        signal: searchSignal
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        resultsHeader.textContent = '⚠️ Lỗi tìm kiếm bài hát';
        resultsContainer.innerHTML = `<div style="padding: 40px; text-align: center; font-size: 20px; color: var(--accent-red);">${escapeHtml(data.error || 'Dạ hệ thống tìm kiếm đang gặp trục trặc, Bố Mẹ bấm thử lại nha!')}</div>`;
        return;
      }

      if (!data.results || data.results.length === 0) {
        resultsHeader.textContent = 'Không tìm thấy bài hát';
        resultsContainer.innerHTML = '<div style="padding: 40px; text-align: center; font-size: 20px;">Dạ không tìm thấy bài hát này. Bố Mẹ thử chọn thể loại khác hoặc gõ tên khác xem sao nhé!</div>';
        return;
      }

      resultsHeader.textContent = genreLabel
        ? `📻 Thể loại: ${genreLabel} — Tìm thấy ${data.results.length} bài hát hay (Bố Mẹ bấm nghe thử hoặc tải về máy nhé!):`
        : `🎵 Tìm thấy ${data.results.length} bài hát hay (Bố Mẹ bấm nghe thử rồi chọn tải nhé!):`;
      renderResults(data.results);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      resultsHeader.textContent = 'Lỗi kết nối';
      resultsContainer.innerHTML = `<div style="padding: 40px; text-align: center; font-size: 20px; color: var(--accent-red);">Dạ mạng đang bị gián đoạn, Bố Mẹ bấm thử lại nha!</div>`;
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
      const isCurrentlyPlaying = window.previewPlayer && window.previewPlayer.currentTrack && window.previewPlayer.currentTrack.id === item.id && window.previewPlayer.isPlaying;
      const row = document.createElement('div');
      row.className = `playlist-item-row${isCurrentlyPlaying ? ' playing' : ''}`;
      row.id = `playlist-row-${escapeHtml(item.id)}`;
      row.innerHTML = `
        <input type="checkbox" class="playlist-checkbox" id="chk-${escapeHtml(item.id)}" data-id="${escapeHtml(item.id)}" checked>
        <span style="font-weight: 700; color: var(--accent-gold); min-width: 28px;">${index + 1}.</span>
        <div class="playlist-item-thumb-wrapper" role="button" tabindex="0" title="Bấm để nghe bài hát này" aria-label="Nghe thử: ${escapeHtml(item.title)}">
          <img class="playlist-item-thumb" src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'70\\' height=\\'45\\' fill=\\'%232e323e\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
          <span class="playlist-play-icon-overlay">${isCurrentlyPlaying ? '⏸' : '▶'}</span>
        </div>
        <span class="playlist-item-title" role="button" tabindex="0" title="Bấm để nghe bài hát này" aria-label="Nghe thử: ${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
        <span class="playlist-item-duration">${escapeHtml(item.duration_string || '00:00')}</span>
        <button class="btn-preview" style="min-height: 40px; padding: 6px 14px; font-size: 15px;" id="btn-preview-pl-${escapeHtml(item.id)}">${isCurrentlyPlaying ? '⏸️ Dừng' : '▶️ Nghe'}</button>
      `;

      const playItemHandler = (e) => {
        if (e) e.stopPropagation();
        if (window.previewPlayer) {
          window.previewPlayer.playTrack(item);
        }
      };

      const plThumb = row.querySelector('.playlist-item-thumb-wrapper');
      if (plThumb) {
        plThumb.addEventListener('click', playItemHandler);
        plThumb.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            playItemHandler(e);
          }
        });
      }

      const plTitle = row.querySelector('.playlist-item-title');
      if (plTitle) {
        plTitle.addEventListener('click', playItemHandler);
        plTitle.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            playItemHandler(e);
          }
        });
      }

      const previewBtn = row.querySelector(`#btn-preview-pl-${item.id}`);
      if (previewBtn) {
        previewBtn.addEventListener('click', playItemHandler);
      }

      row.addEventListener('click', (e) => {
        if (e.target.closest('.playlist-checkbox')) return;
        playItemHandler(e);
      });

      row.querySelector('.playlist-checkbox').addEventListener('change', updateSelectedBatchCount);
      playlistItemsList.appendChild(row);
    });

    updateSelectedBatchCount();
    activeTrackList = items;
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
      showToast('⚠️ Bố Mẹ hãy tích chọn ít nhất 1 bài hát để tải nhé!', 'warn');
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
    activeTrackList = songs;

    songs.forEach(song => {
      const isFav = favorites.some(f => f.id === song.id);
      const isCurrentlyPlaying = window.previewPlayer && window.previewPlayer.currentTrack && window.previewPlayer.currentTrack.id === song.id && window.previewPlayer.isPlaying;
      const card = document.createElement('div');
      card.className = `song-card${isCurrentlyPlaying ? ' playing' : ''}`;
      card.id = `card-${escapeHtml(song.id)}`;

      card.innerHTML = `
        <div class="song-thumbnail-wrapper" role="button" tabindex="0" title="Bấm để nghe thử bài hát này" aria-label="Nghe thử bài hát: ${escapeHtml(song.title)}">
          <img class="song-thumbnail" src="${escapeHtml(song.thumbnail)}" alt="${escapeHtml(song.title)}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'220\\' height=\\'124\\' fill=\\'%232e323e\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
          <div class="song-thumb-overlay" aria-hidden="true">
            <span class="play-icon-overlay">${isCurrentlyPlaying ? '⏸' : '▶'}</span>
          </div>
          <span class="song-duration">${escapeHtml(song.duration_string || '00:00')}</span>
        </div>
        <div class="song-info">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <h3 class="song-title" role="button" tabindex="0" title="Bấm để nghe thử bài hát này" aria-label="Nghe thử bài hát: ${escapeHtml(song.title)}">${escapeHtml(song.title)}</h3>
            <button class="btn-fav" id="btn-fav-${escapeHtml(song.id)}" title="Lưu bài hát yêu thích">${isFav ? '❤️' : '🤍'}</button>
          </div>
          <p class="song-uploader">🎙️ ${escapeHtml(song.uploader || 'Nghệ sĩ')}</p>
          <div class="song-status-badge" id="status-${escapeHtml(song.id)}" style="margin-top: 8px; font-size: 16px; font-weight: 600; color: var(--accent-gold); display: none;"></div>
        </div>
        <div class="song-actions">
          <button class="btn-preview" id="btn-preview-${escapeHtml(song.id)}">
            ${isCurrentlyPlaying ? '⏸️ Tạm Dừng' : '▶️ Nghe Thử Trước'}
          </button>
          <button class="btn-download" id="btn-download-${escapeHtml(song.id)}">
            ⬇️ Tải Về Máy (MP3)
          </button>
        </div>
      `;

      // Play action handler for thumbnail, title, preview button, and card click
      const playHandler = (e) => {
        if (e && typeof e.stopPropagation === 'function') {
          e.stopPropagation();
        }
        if (window.previewPlayer) {
          window.previewPlayer.playTrack(song);
        }
      };

      const thumbWrapper = card.querySelector('.song-thumbnail-wrapper');
      if (thumbWrapper) {
        thumbWrapper.addEventListener('click', playHandler);
        thumbWrapper.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            playHandler(e);
          }
        });
      }

      const titleEl = card.querySelector('.song-title');
      if (titleEl) {
        titleEl.addEventListener('click', playHandler);
        titleEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            playHandler(e);
          }
        });
      }

      // Event: Preview
      const previewBtn = card.querySelector(`#btn-preview-${song.id}`);
      if (previewBtn) {
        previewBtn.addEventListener('click', playHandler);
      }

      // Event: Download
      const downloadBtn = card.querySelector(`#btn-download-${song.id}`);
      downloadBtn.addEventListener('click', (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        queueDownload(song);
      });

      // Event: Favorite Toggle
      const favBtn = card.querySelector(`#btn-fav-${song.id}`);
      favBtn.addEventListener('click', (e) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        toggleFavorite(song, favBtn);
      });

      // Make entire card clickable to play (Issue #70)
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('title', `Bấm để nghe thử bài hát: ${song.title}`);

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-download') || e.target.closest('.btn-fav')) {
          return;
        }
        playHandler(e);
      });

      card.addEventListener('keydown', (e) => {
        if (e.target === card && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          playHandler();
        }
      });

      // Speculative stream prewarm on pointer hover (debounced 150ms)
      let prewarmTimer = null;
      card.addEventListener('pointerenter', () => {
        prewarmTimer = setTimeout(() => {
          fetch('/api/preview/prewarm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: song.id })
          }).catch(() => {});
        }, 150);
      });
      card.addEventListener('pointerleave', () => {
        if (prewarmTimer) clearTimeout(prewarmTimer);
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
      showToast(`❤️ Đã lưu bài "${song.title}" vào mục yêu thích của Bố Mẹ!`, 'success');
    }
    try {
      localStorage.setItem('tuneflow_favorites', JSON.stringify(favorites));
    } catch (err) {
      console.warn('[LocalStorage Quota Error] Could not save favorites:', err);
      showToast('⚠️ Bộ nhớ lưu trữ bài hát của trình duyệt đã đầy!', 'warn');
    }
    updateFavCount();
  }

  function updateFavCount() {
    if (favCountEl) favCountEl.textContent = favorites.length;
  }

  function showFavoritesView() {
    removeFavBatchBar();
    btnPersonaMom.classList.remove('active');
    btnPersonaDad.classList.remove('active');
    btnPersonaFavs.classList.add('active');
    playlistPanel.style.display = 'none';

    if (favorites.length === 0) {
      resultsHeader.textContent = '❤️ Danh Sách Bài Hát Yêu Thích';
      resultsContainer.innerHTML = '<div style="padding: 40px; text-align: center; font-size: 20px; color: var(--text-muted);">Bố Mẹ chưa bấm lưu bài hát nào. Khi nghe bài nào ưng ý, Bố Mẹ bấm vào hình trái tim ❤️ để lưu vào đây nhé!</div>';
      return;
    }

    resultsHeader.textContent = `❤️ Các bài hát Bố Mẹ đã bấm thích (${favorites.length} bài):`;
    renderResults(favorites);

    // 1-Click Batch Download Favorites Bar (Issue #11)
    const batchBar = document.createElement('div');
    batchBar.id = 'fav-batch-bar';
    batchBar.className = 'fav-batch-bar';
    batchBar.innerHTML = `
      <div>
        <h3 style="font-size: 20px; font-weight: 700; color: #fff; margin: 0 0 4px 0;">❤️ Tuyển Tập Yêu Thích Của Bố Mẹ</h3>
        <p style="font-size: 15px; color: var(--accent-gold); margin: 0;">Đang có ${favorites.length} bài hát đã lưu trữ</p>
      </div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button id="btn-batch-fav-dl" class="btn-batch-fav-dl">⬇️ Tải Toàn Bộ Về Máy (${favorites.length} bài)</button>
        <button id="btn-batch-fav-clear" class="btn-batch-fav-clear">🗑️ Xóa Toàn Bộ</button>
      </div>
    `;

    resultsContainer.parentNode.insertBefore(batchBar, resultsContainer);

    batchBar.querySelector('#btn-batch-fav-dl').addEventListener('click', async () => {
      showToast(`⏳ Đang xếp hàng tải toàn bộ ${favorites.length} bài hát yêu thích về máy...`, 'info');
      try {
        const res = await fetch('/api/queue/batch-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: favorites, format: 'mp3' })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`🎉 Đã đưa ${data.queuedCount} bài hát yêu thích vào danh sách tải tự động!`, 'success');
        }
      } catch (e) {
        showToast('❌ Có lỗi khi tải danh sách bài hát yêu thích', 'error');
      }
    });

    batchBar.querySelector('#btn-batch-fav-clear').addEventListener('click', () => {
      if (confirm('Bố Mẹ có chắc chắn muốn xóa toàn bộ danh sách bài hát yêu thích không ạ?')) {
        favorites = [];
        try {
          localStorage.removeItem('tuneflow_favorites');
        } catch (e) {}
        updateFavCount();
        removeFavBatchBar();
        showFavoritesView();
        showToast('🗑️ Đã làm trống danh sách bài hát yêu thích', 'info');
      }
    });
  }

  // 9. Single Download Queue with In-Flight Spam Guard (ck:scenario Dimension 3)
  const pendingDownloadRequests = new Set();

  async function queueDownload(song) {
    if (pendingDownloadRequests.has(song.id)) {
      showToast(`⏳ Bài hát "${song.title}" đang được đưa vào hàng đợi, Bố Mẹ đợi một chút nhé!`, 'info');
      return;
    }

    pendingDownloadRequests.add(song.id);
    const downloadBtn = document.getElementById(`btn-download-${song.id}`);
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.style.opacity = '0.7';
    }

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
    } finally {
      setTimeout(() => {
        pendingDownloadRequests.delete(song.id);
        if (downloadBtn) {
          downloadBtn.disabled = false;
          downloadBtn.style.opacity = '1';
        }
      }, 1200);
    }
  }

  // 10. Connect Server-Sent Events (SSE) with Reconnection & Error Guard (FARD Resiliency)
  let eventSource = null;
  let sseReconnectAttempts = 0;
  let isInitialSSEMessage = true;

  function initSSE() {
    if (eventSource) {
      try { eventSource.close(); } catch (_e) {}
    }

    eventSource = new EventSource('/api/queue/stream');

    eventSource.onopen = () => {
      sseReconnectAttempts = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const items = JSON.parse(event.data);
        if (!Array.isArray(items)) return;

        // Prevent accidental automatic downloads on page reload / initial connect (Issue #59)
        if (isInitialSSEMessage) {
          items.forEach(item => {
            if (item.status === 'completed') {
              activeDownloadedIds.add(item.id);
            }
          });
          isInitialSSEMessage = false;
        }

        // Update Floating Queue Badge & Drawer Header Count
        const activeCount = items.filter(i => i.status === 'downloading' || i.status === 'converting' || i.status === 'queued').length;
        if (queueBadgeCountEl) queueBadgeCountEl.textContent = activeCount;
        if (drawerCountEl) drawerCountEl.textContent = items.length;

        // Update Persistent Queue Slide-Over Drawer
        if (drawerQueueList) {
          if (items.length === 0) {
            drawerQueueList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 40px 10px; font-size: 16px;">Chưa có bài hát nào trong hàng đợi tải.<br>Bố Mẹ bấm [Tải Về Máy] ở bài hát để theo dõi tiến độ tại đây nhé!</div>`;
          } else {
            drawerQueueList.innerHTML = '';
            items.forEach(item => {
              const div = document.createElement('div');
              div.className = 'drawer-queue-item';
              let statusText = '⏳ Đang chờ...';
              let statusColor = 'var(--accent-gold)';
              if (item.status === 'downloading') {
                statusText = `📥 Đang tải ${item.progress}% ${item.speed ? '(' + item.speed + ')' : ''}`;
              } else if (item.status === 'converting') {
                statusText = '⚙️ Ghép MP3 320kbps';
              } else if (item.status === 'completed') {
                statusText = '✅ Đã tải xong';
                statusColor = 'var(--accent-green)';
              } else if (item.status === 'failed') {
                statusText = '❌ Lỗi tải';
                statusColor = 'var(--accent-red)';
              }

              div.innerHTML = `
                <div class="drawer-item-header">
                  <span class="drawer-item-title">${escapeHtml(item.title)}</span>
                  <span class="drawer-item-status" style="color: ${statusColor};">${statusText}</span>
                </div>
                ${item.status === 'downloading' || item.status === 'converting' ? `
                  <div style="background: #090a0d; border-radius: 4px; height: 6px; overflow: hidden; margin-top: 6px;">
                    <div style="background: var(--accent-gold); height: 100%; width: ${item.progress || 10}%; transition: width 0.3s ease;"></div>
                  </div>
                ` : ''}
              `;
              drawerQueueList.appendChild(div);
            });
          }
        }

        // Update Visible Song Cards on Main View via direct O(1) ID lookup (Issue #60)
        items.forEach(item => {
          const card = document.getElementById(`card-${item.id}`);
          if (card) {
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
                statusBadge.textContent = `✅ Đã xong! File đang lưu vào máy tính Bố Mẹ.`;
                statusBadge.style.color = 'var(--accent-green)';
                if (downloadBtn) {
                  downloadBtn.textContent = '✅ Đã Tải Xong';
                }

                if (!activeDownloadedIds.has(item.id)) {
                  activeDownloadedIds.add(item.id);
                  triggerClientBrowserDownload(item);
                }
              } else if (item.status === 'failed') {
                statusBadge.textContent = `⚠️ Bài này bị lỗi tải, Bố Mẹ chọn bài khác nhé!`;
                statusBadge.style.color = 'var(--accent-red)';
              }
            }
          }
        });
      } catch (err) {
        console.error('[SSE Event Processing Error]', err);
      }
    };

    eventSource.onerror = (err) => {
      sseReconnectAttempts++;
      const delay = Math.min(30000, 1000 * Math.pow(2, sseReconnectAttempts));
      console.warn(`[SSE Connection Lost] Attempting reconnect #${sseReconnectAttempts} in ${delay}ms...`, err);
      if (eventSource) {
        try { eventSource.close(); } catch (_e) {}
      }
      setTimeout(initSSE, delay);
    };
  }

  initSSE();

  // Wire Drawer Clear Handled Items Button
  if (btnDrawerClearDone) {
    btnDrawerClearDone.addEventListener('click', () => {
      if (!drawerQueueList) return;
      const completedCards = drawerQueueList.querySelectorAll('.drawer-queue-item');
      let count = 0;
      completedCards.forEach(c => {
        if (c.textContent.includes('Đã tải xong') || c.textContent.includes('Lỗi tải')) {
          c.remove();
          count++;
        }
      });
      showToast(count > 0 ? `🧹 Đã dọn dẹp ${count} bài đã hoàn tất` : 'Hàng đợi đang gọn gàng!', 'info');
    });
  }

  // 11. Direct Client Browser Download Trigger
  function triggerClientBrowserDownload(item) {
    showToast(`🎉 Đã tải xong bài "${item.title}"! File đang được lưu vào máy tính của Bố Mẹ.`, 'success');
    
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

  // 12. Continuous Playback Handlers (Issue #16)
  window.playNextTrack = () => {
    if (!activeTrackList || activeTrackList.length === 0) return;
    const current = window.previewPlayer ? window.previewPlayer.currentTrack : null;
    if (!current) return;
    const currentIndex = activeTrackList.findIndex(t => t.id === current.id);
    if (currentIndex >= 0 && currentIndex < activeTrackList.length - 1) {
      const nextTrack = activeTrackList[currentIndex + 1];
      showToast(`⏭️ Đang tự động phát bài tiếp: "${nextTrack.title}"`, 'info');
      window.previewPlayer.playTrack(nextTrack);
    } else {
      showToast('🎵 Đã phát hết danh sách bài hát!', 'info');
    }
  };

  window.playPreviousTrack = () => {
    if (!activeTrackList || activeTrackList.length === 0) return;
    const current = window.previewPlayer ? window.previewPlayer.currentTrack : null;
    if (!current) return;
    const currentIndex = activeTrackList.findIndex(t => t.id === current.id);
    if (currentIndex > 0) {
      const prevTrack = activeTrackList[currentIndex - 1];
      showToast(`⏮️ Đang phát bài trước: "${prevTrack.title}"`, 'info');
      window.previewPlayer.playTrack(prevTrack);
    }
  };

  // 13. Toast Helper (Safe Text Rendering & Global Exposure)
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'warn') toast.style.borderColor = 'var(--accent-gold)';
    if (type === 'error') toast.style.borderColor = 'var(--accent-red)';
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  window.showToast = showToast;
  window.renderResults = renderResults;
  window.renderPlaylistBatch = renderPlaylistBatch;
});
