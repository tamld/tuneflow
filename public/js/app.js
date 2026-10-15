/**
 * Main Application Logic for TuneFlow (v1.3.0)
 * Includes Persona Hero Navigation, Playlist Batch Ingestion, Vocal Filters,
 * Zero-Login Favorites, Persistent Queue Drawer, Accessible Guidance Modal,
 * Clear Search, and Font Size Scaling.
 */

// Safe thumbnail URL helper that routes through local server proxy with memory cache
function getThumbnailSrc(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:')) return url;
  const resolve = (typeof window !== 'undefined' && window.TUNEFLOW_RESOLVE_URL) ? window.TUNEFLOW_RESOLVE_URL : (p => p);
  if (url.startsWith('/')) return resolve(url);
  return resolve('/api/thumbnail?url=' + encodeURIComponent(url));
}

// Resilient thumbnail image fallback with backend proxy guard
function handleImageFallback(img, originalUrl) {
  if (!img) return;
  const targetUrl = originalUrl || img.dataset.originalThumb || '';
  if (!img.dataset.proxied && targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://'))) {
    img.dataset.proxied = 'true';
    const resolve = (typeof window !== 'undefined' && window.TUNEFLOW_RESOLVE_URL) ? window.TUNEFLOW_RESOLVE_URL : (p => p);
    img.src = resolve('/api/thumbnail?url=' + encodeURIComponent(targetUrl));
    return;
  }
  img.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='124' viewBox='0 0 220 124'><rect width='100%' height='100%' fill='%231e222d'/><circle cx='110' cy='62' r='28' fill='%232a3142'/><text x='110' y='70' font-size='24' text-anchor='middle'>🎵</text></svg>";
}
if (typeof window !== 'undefined') {
  window.handleImageFallback = handleImageFallback;
  window.getThumbnailSrc = getThumbnailSrc;
}

// Senior Desktop Keyboard Shortcuts & Input Guarding (Issue #97)
function isEditableElement(target) {
  if (!target || typeof target !== 'object') return false;
  const tagName = (target.tagName || '').toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return false;
}

function handleGlobalKeydown(e, player = (typeof window !== 'undefined' ? window.previewPlayer : null)) {
  if (!e || !player) return false;
  const target = e.target || (typeof document !== 'undefined' ? document.activeElement : null);
  if (isEditableElement(target)) {
    return false;
  }

  // Guard against TV mode handling d-pad if active
  if (typeof window !== 'undefined' && window.tvLeanback && window.tvLeanback.isTVMode) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return false;
    }
  }

  const key = e.key;

  if (key === ' ' || key === 'k' || key === 'K') {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof player.togglePlayPause === 'function') {
      player.togglePlayPause();
    } else if (typeof player.togglePlay === 'function') {
      player.togglePlay();
    }
    return true;
  }

  if (key === 'm' || key === 'M') {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof player.toggleMute === 'function') {
      player.toggleMute();
    }
    return true;
  }

  if (key === 'ArrowLeft') {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof player.seekAudio === 'function') {
      player.seekAudio(-5);
    }
    return true;
  }

  if (key === 'ArrowRight') {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof player.seekAudio === 'function') {
      player.seekAudio(5);
    }
    return true;
  }

  if (key === 'ArrowUp') {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof player.adjustVolume === 'function') {
      player.adjustVolume(0.05);
    }
    return true;
  }

  if (key === 'ArrowDown') {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof player.adjustVolume === 'function') {
      player.adjustVolume(-0.05);
    }
    return true;
  }

  return false;
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    handleGlobalKeydown(e, window.previewPlayer);
  });
}

if (typeof document !== 'undefined') {
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

  // Settings Modal & Theme Controls (Issue #133)
  const btnSettingsTrigger = document.getElementById('btn-settings-trigger');
  const modalSettings = document.getElementById('modal-settings');
  const btnSettingsClose = document.getElementById('btn-settings-close');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');
  const themeToggleText = document.getElementById('theme-toggle-text');

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

  // Editorial Typography Helper: Tames screaming ALL-CAPS YouTube titles into gentle Title Case
  const KEEP_ACRONYMS = new Set(['MP3', 'FLAC', 'WAV', 'HD', '4K', '8K', 'TV', 'MV', 'CD', 'DVD', 'LP', 'DJ', 'OST', 'VIP', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX']);
  function formatCalmTitle(raw) {
    if (!raw) return '';
    return String(raw).replace(/\p{Lu}[\p{Lu}\p{M}]{1,}/gu, (word) => {
      if (KEEP_ACRONYMS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  // Persona buttons
  const btnPersonaMom = document.getElementById('btn-persona-mom');
  const btnPersonaDad = document.getElementById('btn-persona-dad');
  const btnPersonaFavs = document.getElementById('btn-persona-favorites');

  // Filter chips
  const filterChips = document.querySelectorAll('.filter-chip:not([data-search-type]):not([data-search-sort])');
  let currentFilter = 'all';

  // Search Filters State (Issue #80)
  let currentSearchType = 'all';
  let currentSearchSort = 'relevance';

  const typeFilterChips = document.querySelectorAll('[data-search-type]');
  typeFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      typeFilterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentSearchType = chip.getAttribute('data-search-type') || 'all';
      if (searchInput.value.trim()) {
        executeSearch(searchInput.value.trim());
      }
    });
  });

  const sortFilterChips = document.querySelectorAll('[data-search-sort]');
  sortFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      sortFilterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentSearchSort = chip.getAttribute('data-search-sort') || 'relevance';
      if (searchInput.value.trim()) {
        executeSearch(searchInput.value.trim());
      }
    });
  });

  // Playlist Batch Panel
  const playlistPanel = document.getElementById('playlist-panel');
  const playlistPanelTitle = document.getElementById('playlist-panel-title');
  const playlistPanelMeta = document.getElementById('playlist-panel-meta');
  const playlistItemsList = document.getElementById('playlist-items-list');
  const btnSelectAll = document.getElementById('btn-select-all');
  const btnPlayPlaylist = document.getElementById('btn-play-playlist');
  const batchPlayCountEl = document.getElementById('batch-play-count');
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
      sectionLabel: 'Thể loại Mẹ hay nghe:',
      pills: [
        { label: 'Dân Ca Quê Hương', query: 'Dân ca quê hương chọn lọc ngọt ngào' },
        { label: 'Niệm Phật Tịnh Tâm', query: 'Niệm phật êm dịu thanh tịnh' },
        { label: 'Nhạc Thiền Dễ Ngủ', query: 'Nhạc thiền tịnh tâm ngủ ngon dễ ngủ' },
        { label: 'Trữ Tình Quê Mẹ', query: 'Ca nhạc trữ tình quê hương ngọt ngào' },
        { label: 'Tân Cổ Giao Duyên', query: 'Tân cổ giao duyên tuyển chọn hay nhất' },
        { label: 'Nhạc Spa Thư Giãn', query: 'Nhạc spa thư giãn ngủ sâu giảm căng thẳng' }
      ],
      defaultQuery: 'Dân ca quê hương chọn lọc ngọt ngào'
    },
    dad: {
      title: 'Bố Hay Nghe',
      sectionLabel: 'Thể loại Bố hay nghe:',
      pills: [
        { label: 'Nhạc Vàng Bolero', query: 'Nhạc vàng 1975 bolero chọn lọc' },
        { label: 'Tình Ca Trịnh Công Sơn', query: 'Nhạc Trịnh Công Sơn Khánh Ly bất hủ' },
        { label: 'Nhạc Tiền Chiến & Đỏ', query: 'Nhạc tiền chiến bất hủ hào hùng' },
        { label: 'Cải Lương & Vọng Cổ', query: 'Cải lương vọng cổ hồ quảng tuyển chọn' },
        { label: 'Hòa Tấu Guitar & Saxophone', query: 'Hòa tấu guitar saxophone êm dịu' },
        { label: 'Tình Ca Quê Hương', query: 'Ca khúc quê hương đi cùng năm tháng hay nhất' }
      ],
      defaultQuery: 'Nhạc vàng 1975 bolero chọn lọc'
    }
  };

  let currentPersona = 'mom';
  let lastSearchResults = null;

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

  function renderCuratedStarterShelf(personaKey) {
    if (!resultsContainer) return;
    const isEn = window.TuneFlowI18n && window.TuneFlowI18n.getLanguage() === 'en';
    const presets = window.TuneFlowI18n ? window.TuneFlowI18n.getPresets() : personaPresets;
    const preset = presets[personaKey] || presets.mom;
    if (!preset || !Array.isArray(preset.pills)) return;

    const shelfSubtitlesVi = [
      'Tuyển chọn những làn điệu ngọt ngào, ấm áp nghe mỗi ngày',
      'Âm thanh thanh tịnh, nhẹ nhàng giúp thư thái tâm hồn',
      'Giai điệu êm dịu giúp Bố Mẹ thư giãn và dễ đi vào giấc ngủ',
      'Những ca khúc quê hương đi cùng năm tháng được yêu thích nhất',
      'Tuyển tập chọn lọc chất lượng cao, bấm 1 chạm để mở ngay',
      'Không gian âm nhạc hi-fi ấm cúng dành riêng cho gia đình'
    ];
    const shelfSubtitlesEn = [
      'Warm, timeless melodies curated for daily family listening',
      'Peaceful acoustic harmonies for calm relaxation',
      'Gentle soothing instrumental & vocal tracks for restful sleep',
      'Beloved homeland classics with high-clarity audio',
      'Handpicked golden collection — click once to open shelf',
      'Hi-Fi lounge atmosphere tailored for your home stereo'
    ];

    resultsContainer.innerHTML = '';
    preset.pills.forEach((pillData, idx) => {
      const card = document.createElement('div');
      card.className = 'curated-shelf-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-shelf-query', pillData.query);

      const badgeText = isEn ? `COLLECTION 0${idx + 1}` : `KỆ ĐĨA 0${idx + 1}`;
      const subText = isEn
        ? shelfSubtitlesEn[idx % shelfSubtitlesEn.length]
        : shelfSubtitlesVi[idx % shelfSubtitlesVi.length];
      const ctaText = isEn ? 'Open Shelf' : 'Mở Kệ Nhạc';

      card.innerHTML = `
        <div class="curated-shelf-disc" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9"></circle>
            <circle cx="12" cy="12" r="2.5"></circle>
            <path d="M14.5 9.5 19 5"></path>
          </svg>
        </div>
        <div class="curated-shelf-body">
          <span class="curated-shelf-badge">${escapeHtml(badgeText)}</span>
          <h3 class="curated-shelf-title">${escapeHtml(pillData.label)}</h3>
          <p class="curated-shelf-sub">${escapeHtml(subText)}</p>
        </div>
        <button type="button" class="curated-shelf-cta">
          <span>▶</span> <span>${escapeHtml(ctaText)}</span>
        </button>
      `;

      const openShelfHandler = () => {
        if (categoryPillsContainer) {
          categoryPillsContainer.querySelectorAll('.pill-btn').forEach(p => {
            p.classList.toggle('active', p.getAttribute('data-query') === pillData.query);
          });
        }
        if (searchInput) searchInput.value = pillData.query;
        if (btnClearSearch) btnClearSearch.style.display = 'flex';
        executeSearch(pillData.query, pillData.label);
      };

      card.addEventListener('click', openShelfHandler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openShelfHandler();
        }
      });

      resultsContainer.appendChild(card);
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

    const activeQuery = searchInput ? searchInput.value.trim() : '';
    categoryPillsContainer.innerHTML = '';
    preset.pills.forEach((pillData, idx) => {
      const btn = document.createElement('button');
      const isPillActive = autoSearch ? (idx === 0) : (activeQuery === pillData.query);
      btn.className = 'pill-btn' + (isPillActive ? ' active' : '');
      btn.setAttribute('data-query', pillData.query);
      btn.textContent = pillData.label;
      categoryPillsContainer.appendChild(btn);
    });

    if (autoSearch) {
      searchInput.value = preset.defaultQuery;
      if (btnClearSearch) btnClearSearch.style.display = 'flex';
      executeSearch(preset.defaultQuery, preset.pills[0].label);
    } else if (!lastSearchResults || !lastSearchResults.results || lastSearchResults.results.length === 0) {
      renderCuratedStarterShelf(type);
    }
  }

  // Initial load: Check if user enabled auto-load initial category preference, otherwise render Curated Starter Shelf
  let shouldAutoLoadInitial = false;
  try {
    shouldAutoLoadInitial = localStorage.getItem('tuneflow_autoload_category') === 'true';
  } catch (_e) {}
  switchPersona('mom', shouldAutoLoadInitial);

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

  // 5b. Unified Settings Modal (Issue #133)
  function openSettingsModal() {
    if (modalSettings) modalSettings.style.display = 'flex';
  }
  function closeSettingsModal() {
    if (modalSettings) modalSettings.style.display = 'none';
  }
  if (btnSettingsTrigger) btnSettingsTrigger.addEventListener('click', openSettingsModal);
  if (btnSettingsClose) btnSettingsClose.addEventListener('click', closeSettingsModal);
  if (modalSettings) {
    modalSettings.addEventListener('click', (e) => {
      if (e.target === modalSettings) closeSettingsModal();
    });
  }

  // Global Keyboard Shortcuts (Escape to close modals)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeHelpModal();
      closeQueueDrawer();
      closeSettingsModal();
    }
  });

  // 5c. 5-Theme System & Visual Ergonomics Engine (Issue #133 & Multi-Theme Expansion)
  const THEME_ORDER = ['dark', 'cream', 'wood', 'jade', 'hc'];
  const THEME_META = {
    dark: { icon: '🌙', i18nKey: 'theme_night', fallback: 'Đêm Ấm', chromeColor: '#121316', toast: '🌙 Đã bật giao diện Đêm Ấm (Đen hổ phách dịu mắt)' },
    cream: { icon: '☀️', i18nKey: 'theme_day', fallback: 'Ngày Dịu', chromeColor: '#fcf9f2', toast: '☀️ Đã bật giao diện Ngày Dịu (Nền giấy dó chống lóa)' },
    wood: { icon: '🪵', i18nKey: 'theme_wood', fallback: 'Gỗ Trầm', chromeColor: '#1a120e', toast: '🪵 Đã bật giao diện Gỗ Trầm (Phòng trà Bolero hoài cổ)' },
    jade: { icon: '🌿', i18nKey: 'theme_jade', fallback: 'Sen Xanh', chromeColor: '#0d1815', toast: '🌿 Đã bật giao diện Sen Xanh (Nhạc thiền tịnh tâm)' },
    hc: { icon: '👁️', i18nKey: 'theme_hc', fallback: 'Rõ Nét', chromeColor: '#000000', toast: '👁️ Đã bật giao diện Rõ Nét (Tương phản tối đa 21:1)' }
  };

  function applyTheme(theme) {
    const validTheme = THEME_META[theme] ? theme : 'dark';
    const isCream = validTheme === 'cream';
    document.documentElement.setAttribute('data-theme', validTheme);
    THEME_ORDER.forEach(t => {
      document.body.classList.toggle(`theme-${t}`, validTheme === t);
    });
    const dayLabel = window.TuneFlowI18n ? window.TuneFlowI18n.t('theme_day') : 'Ngày Dịu';
    const nightLabel = window.TuneFlowI18n ? window.TuneFlowI18n.t('theme_night') : 'Đêm Ấm';
    const baseIcon = isCream ? '☀️' : '🌙';
    const baseLabel = isCream ? dayLabel : nightLabel;
    const meta = THEME_META[validTheme];
    const activeIcon = (validTheme === 'dark' || validTheme === 'cream') ? baseIcon : meta.icon;
    const activeLabel = (validTheme === 'dark' || validTheme === 'cream')
      ? baseLabel
      : (window.TuneFlowI18n ? window.TuneFlowI18n.t(meta.i18nKey) : meta.fallback);

    const metaThemeColorEl = document.getElementById('meta-theme-color');
    if (metaThemeColorEl && meta.chromeColor) {
      metaThemeColorEl.setAttribute('content', meta.chromeColor);
    }

    if (themeToggleIcon) themeToggleIcon.textContent = activeIcon;
    if (themeToggleText) themeToggleText.textContent = activeLabel;
    if (btnThemeToggle) {
      const titleDay = window.TuneFlowI18n ? window.TuneFlowI18n.t('theme_toggle_title_day') : 'Chế độ Ngày Dịu — Bấm để đổi bảng màu giao diện';
      const titleNight = window.TuneFlowI18n ? window.TuneFlowI18n.t('theme_toggle_title_night') : 'Chế độ Đêm Ấm — Bấm để đổi bảng màu giao diện';
      const currentTitle = isCream ? titleDay : titleNight;
      btnThemeToggle.setAttribute('title', `${activeLabel} — ${currentTitle}`);
      btnThemeToggle.setAttribute('aria-label', `${activeLabel} — ${currentTitle}`);
    }

    const swatchBtns = document.querySelectorAll('[data-theme-select]');
    swatchBtns.forEach(btn => {
      const isSelected = btn.getAttribute('data-theme-select') === validTheme;
      btn.classList.toggle('active', isSelected);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });
  }

  window.syncCurrentThemeUI = function() {
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(activeTheme);
  };

  function initTheme() {
    let savedTheme = 'dark';
    try {
      savedTheme = localStorage.getItem('tuneflow_theme') || 'dark';
    } catch (_e) {}
    applyTheme(savedTheme);

    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const currentIdx = THEME_ORDER.indexOf(currentTheme);
        const nextTheme = THEME_ORDER[(currentIdx + 1) % THEME_ORDER.length];
        try {
          localStorage.setItem('tuneflow_theme', nextTheme);
        } catch (_e) {}
        applyTheme(nextTheme);
        if (typeof showToast === 'function' && THEME_META[nextTheme]) {
          showToast(THEME_META[nextTheme].toast, 'info');
        }
      });
    }

    // Wire 5-Theme Swatch Picker in Settings Modal
    const themeSwatchBtns = document.querySelectorAll('[data-theme-select]');
    themeSwatchBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTheme = btn.getAttribute('data-theme-select') || 'dark';
        try {
          localStorage.setItem('tuneflow_theme', targetTheme);
        } catch (_e) {}
        applyTheme(targetTheme);
        if (typeof showToast === 'function' && THEME_META[targetTheme]) {
          showToast(THEME_META[targetTheme].toast, 'info');
        }
      });
    });

    // Wire Compact Mode & Startup Auto-Load Preferences
    const btnToggleCompact = document.getElementById('btn-toggle-compact');
    if (btnToggleCompact) {
      const syncCompactUI = (enabled) => {
        document.body.classList.toggle('compact-mode', enabled);
        btnToggleCompact.style.borderColor = enabled ? 'var(--accent-gold)' : 'var(--border-color)';
        btnToggleCompact.style.color = enabled ? 'var(--accent-gold)' : '';
        btnToggleCompact.textContent = enabled ? '📐 Bố Cục Gọn (BẬT)' : '📐 Bố Cục Gọn';
      };
      let isCompact = false;
      try {
        isCompact = localStorage.getItem('tuneflow_compact_mode') === 'true';
      } catch (_e) {}
      syncCompactUI(isCompact);
      btnToggleCompact.addEventListener('click', () => {
        isCompact = !document.body.classList.contains('compact-mode');
        try {
          localStorage.setItem('tuneflow_compact_mode', isCompact ? 'true' : 'false');
        } catch (_e) {}
        syncCompactUI(isCompact);
        if (typeof showToast === 'function') {
          showToast(isCompact ? '📐 Đã bật Bố Cục Gọn (Hiển thị nhiều bài hát hơn trên màn hình)' : '📐 Đã chuyển về Bố Cục Tiêu Chuẩn', 'info');
        }
      });
    }

    const btnToggleAutoload = document.getElementById('btn-toggle-autoload');
    if (btnToggleAutoload) {
      const syncAutoloadUI = (enabled) => {
        btnToggleAutoload.style.borderColor = enabled ? 'var(--accent-gold)' : 'var(--border-color)';
        btnToggleAutoload.style.color = enabled ? 'var(--accent-gold)' : '';
        btnToggleAutoload.textContent = enabled ? '⚡ Tự Mở Nhạc Đầu (BẬT)' : '⚡ Tự Mở Nhạc Đầu';
      };
      let isAutoload = false;
      try {
        isAutoload = localStorage.getItem('tuneflow_autoload_category') === 'true';
      } catch (_e) {}
      syncAutoloadUI(isAutoload);
      btnToggleAutoload.addEventListener('click', () => {
        isAutoload = !isAutoload;
        try {
          localStorage.setItem('tuneflow_autoload_category', isAutoload ? 'true' : 'false');
        } catch (_e) {}
        syncAutoloadUI(isAutoload);
        if (typeof showToast === 'function') {
          showToast(isAutoload ? '⚡ Đã bật Tự Mở Nhạc Đầu khi khởi động ứng dụng' : '⚡ Đã tắt Tự Mở Nhạc Đầu khi khởi động', 'info');
        }
      });
    }
  }
  initTheme();

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

  // 4. Search Execution with L1 Client-Side LRU Query Cache (system-design-primer query_cache)
  const SEARCH_LRU_MAX = 24;
  const SEARCH_LRU_TTL_MS = 15 * 60 * 1000;
  const searchLruCache = new Map();

  function getCachedSearch(cacheKey) {
    if (!searchLruCache.has(cacheKey)) return null;
    const entry = searchLruCache.get(cacheKey);
    if (!entry || Date.now() - entry.timestamp > SEARCH_LRU_TTL_MS) {
      searchLruCache.delete(cacheKey);
      return null;
    }
    // Refresh key to most-recently-used position
    searchLruCache.delete(cacheKey);
    searchLruCache.set(cacheKey, entry);
    return entry.results;
  }

  function setCachedSearch(cacheKey, results) {
    if (searchLruCache.has(cacheKey)) {
      searchLruCache.delete(cacheKey);
    } else if (searchLruCache.size >= SEARCH_LRU_MAX) {
      const oldestKey = searchLruCache.keys().next().value;
      if (oldestKey !== undefined) searchLruCache.delete(oldestKey);
    }
    searchLruCache.set(cacheKey, { results, timestamp: Date.now() });
  }

  function prewarmTopTrack(songs) {
    if (!Array.isArray(songs) || songs.length === 0) return;
    const firstPlayable = songs.find(s => s && s.id && !s.isPlaylist && !String(s.id).startsWith('PL'));
    if (!firstPlayable) return;
    fetch('/api/preview/prewarm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: firstPlayable.id })
    }).catch(() => {});
  }

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

    let finalQuery = trimmed;
    if (currentFilter === 'vocal') finalQuery += ' có lời ca sĩ hát';
    if (currentFilter === 'instrumental') finalQuery += ' hòa tấu không lời guitar saxophone';

    const cacheKey = `${finalQuery.toLowerCase()}|${currentSearchType || 'all'}|${currentSearchSort || 'relevance'}`;
    const cachedResults = getCachedSearch(cacheKey);
    if (cachedResults && cachedResults.length > 0) {
      const fallbackBanner = document.getElementById('filial-fallback-banner');
      if (fallbackBanner) fallbackBanner.style.display = 'none';
      lastSearchResults = { results: cachedResults, genreLabel };
      const foundTemplate = window.TuneFlowI18n ? window.TuneFlowI18n.t('search_results_found') : 'Tìm thấy {count} bài hát chọn lọc:';
      const foundMsg = foundTemplate.replace('{count}', cachedResults.length);
      resultsHeader.textContent = genreLabel
        ? `${genreLabel} • ${foundMsg}`
        : foundMsg;
      renderResults(cachedResults);
      prewarmTopTrack(cachedResults);
      return;
    }

    resultsHeader.textContent = genreLabel 
      ? `Đang mở thể loại: ${genreLabel} (Bố Mẹ chờ xíu nha...)`
      : 'Đang tìm kiếm các bài hát hay cho Bố Mẹ...';
    resultsContainer.innerHTML = '<div style="padding: 40px; text-align: center; font-size: 18px; color: var(--text-muted); grid-column: 1 / -1;">Đang tải danh sách bài hát, vui lòng chờ chút xíu ạ...</div>';

    if (currentSearchAbortController) {
      try {
        currentSearchAbortController.abort();
      } catch (_e) {}
    }
    currentSearchAbortController = new AbortController();
    const searchSignal = currentSearchAbortController.signal;

    try {
      const searchUrl = `/api/search?q=${encodeURIComponent(finalQuery)}&limit=12&type=${encodeURIComponent(currentSearchType || 'all')}&sort=${encodeURIComponent(currentSearchSort || 'relevance')}`;
      const res = await fetch(searchUrl, {
        signal: searchSignal
      });
      const data = await res.json();

      const fallbackBanner = document.getElementById('filial-fallback-banner');
      const fallbackMsg = document.getElementById('filial-fallback-message');

      if (!res.ok || !data.success) {
        resultsHeader.textContent = '⚠️ Lỗi tìm kiếm bài hát';
        if (data.isYouTubeDegraded || data.fallbackSuggested) {
          if (fallbackBanner) {
            if (fallbackMsg && data.filialMessage) fallbackMsg.textContent = data.filialMessage;
            fallbackBanner.style.display = 'block';
          }
        }
        resultsContainer.innerHTML = `<div style="padding: 40px; text-align: center; font-size: 18px; color: var(--accent-red); grid-column: 1 / -1;">${escapeHtml(data.filialMessage || data.error || 'Dạ hệ thống tìm kiếm đang gặp trục trặc, Bố Mẹ bấm thử lại nha!')}</div>`;
        return;
      }

      if (fallbackBanner) {
        fallbackBanner.style.display = 'none';
      }

      if (!data.results || data.results.length === 0) {
        lastSearchResults = null;
        resultsHeader.textContent = window.TuneFlowI18n ? window.TuneFlowI18n.t('search_no_results') : 'Không tìm thấy bài hát';
        resultsContainer.innerHTML = '<div style="padding: 40px; text-align: center; font-size: 18px; grid-column: 1 / -1;">Dạ không tìm thấy bài hát này. Bố Mẹ thử chọn thể loại khác hoặc gõ tên khác xem sao nhé!</div>';
        return;
      }

      setCachedSearch(cacheKey, data.results);
      lastSearchResults = { results: data.results, genreLabel };
      const foundTemplate = window.TuneFlowI18n ? window.TuneFlowI18n.t('search_results_found') : 'Tìm thấy {count} bài hát chọn lọc:';
      const foundMsg = foundTemplate.replace('{count}', data.results.length);
      resultsHeader.textContent = genreLabel
        ? `${genreLabel} • ${foundMsg}`
        : foundMsg;
      renderResults(data.results);
      prewarmTopTrack(data.results);
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      lastSearchResults = null;
      resultsHeader.textContent = 'Lỗi kết nối';
      resultsContainer.innerHTML = `<div style="padding: 40px; text-align: center; font-size: 18px; color: var(--accent-red); grid-column: 1 / -1;">Dạ mạng đang bị gián đoạn, Bố Mẹ bấm thử lại nha!</div>`;
    }
  }

  // 5. Playlist Ingestion Handler
  async function handlePlaylistUrl(url, triggerBtn = null) {
    let originalBtnHtml = '';
    if (triggerBtn) {
      originalBtnHtml = triggerBtn.innerHTML;
      triggerBtn.disabled = true;
      triggerBtn.innerHTML = `⏳ ${window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_loading_btn') : 'Đang mở tuyển tập...'}`;
    }

    const loadingText = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_loading') : '⏳ Đang bóc tách danh sách phát...';
    resultsHeader.textContent = loadingText;
    playlistPanel.style.display = 'block';
    if (typeof playlistPanel.scrollIntoView === 'function') {
      playlistPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    playlistPanelTitle.textContent = loadingText;
    playlistPanelMeta.textContent = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_panel_meta') : 'Vui lòng chờ một chút ạ...';
    playlistItemsList.innerHTML = '<div style="padding: 20px; text-align: center; font-size: 18px; color: var(--text-muted);">⏳ Đang đọc thông tin các bài hát trong playlist...</div>';

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
      const defaultTitle = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_panel_title') : 'Danh Sách Tuyển Chọn';
      const defaultArtist = window.TuneFlowI18n ? window.TuneFlowI18n.t('artist_default') : 'Nghệ sĩ';
      playlistPanelTitle.textContent = `📻 ${data.title || defaultTitle}`;
      playlistPanelMeta.textContent = `Tuyển tập gồm ${data.count} bài hát của "${data.uploader || defaultArtist}"`;
      renderPlaylistBatch(data.items);
      const displayTemplate = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_display_all') : '✨ Đã hiển thị toàn bộ tuyển tập gồm {count} bài hát.';
      resultsHeader.textContent = displayTemplate.replace('{count}', data.count);
    } catch (err) {
      showToast('❌ Lỗi khi đọc danh sách phát', 'error');
      playlistPanel.style.display = 'none';
    } finally {
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.innerHTML = originalBtnHtml;
      }
    }
  }

  // 6. Render Playlist Batch Panel
  function renderPlaylistBatch(items) {
    playlistItemsList.innerHTML = '';
    const pauseLabel = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_pause') : '⏸️ Dừng';
    const playLabel = window.TuneFlowI18n ? window.TuneFlowI18n.t('btnPreview') : '▶️ Nghe';

    items.forEach((item, index) => {
      const isCurrentlyPlaying = window.previewPlayer && window.previewPlayer.currentTrack && window.previewPlayer.currentTrack.id === item.id && window.previewPlayer.isPlaying;
      const row = document.createElement('div');
      row.className = `playlist-item-row${isCurrentlyPlaying ? ' playing' : ''}`;
      row.id = `playlist-row-${escapeHtml(item.id)}`;
      row.innerHTML = `
        <input type="checkbox" class="playlist-checkbox" id="chk-${escapeHtml(item.id)}" data-id="${escapeHtml(item.id)}" checked>
        <span style="font-weight: 700; color: var(--accent-gold); min-width: 28px;">${index + 1}.</span>
        <div class="playlist-item-thumb-wrapper" role="button" tabindex="0" title="Bấm để nghe bài hát này" aria-label="Nghe thử: ${escapeHtml(item.title)}">
          <img class="playlist-item-thumb" src="${escapeHtml(getThumbnailSrc(item.thumbnail))}" data-original-thumb="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" referrerpolicy="no-referrer" onerror="handleImageFallback(this)">
          <span class="playlist-play-icon-overlay">${isCurrentlyPlaying ? '⏸' : '▶'}</span>
        </div>
        <span class="playlist-item-title" role="button" tabindex="0" title="Bấm để nghe bài hát này" aria-label="Nghe thử: ${escapeHtml(item.title)}">${escapeHtml(item.title)}</span>
        <span class="playlist-item-duration">${escapeHtml(item.duration_string || '00:00')}</span>
        <button class="btn-preview" style="min-height: 40px; padding: 6px 14px; font-size: 15px;" id="btn-preview-pl-${escapeHtml(item.id)}">${isCurrentlyPlaying ? pauseLabel : playLabel}</button>
      `;

      const playItemHandler = (e) => {
        if (e) e.stopPropagation();
        if (window.previewPlayer) {
          const checked = Array.from(playlistItemsList.querySelectorAll('.playlist-checkbox:checked'));
          const selectedIds = new Set(checked.map(cb => cb.getAttribute('data-id')));
          const selectedTracks = currentPlaylistTracks.filter(t => selectedIds.has(t.id));
          if (selectedTracks.some(t => t.id === item.id)) {
            activeTrackList = selectedTracks;
          } else {
            activeTrackList = currentPlaylistTracks;
          }
          window.previewPlayer.playTrack(item);
          updatePlaylistPlayButtonState();
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

    currentPlaylistTracks = items;
    activeTrackList = items;
    updateSelectedBatchCount();
  }

  function updatePlaylistPlayButtonState() {
    if (!btnPlayPlaylist) return;
    const checkedCount = playlistItemsList ? playlistItemsList.querySelectorAll('.playlist-checkbox:checked').length : 0;
    if (batchPlayCountEl) {
      batchPlayCountEl.textContent = checkedCount;
    }

    const current = window.previewPlayer ? window.previewPlayer.currentTrack : null;
    const isCurrentInPlaylist = Boolean(current && currentPlaylistTracks && currentPlaylistTracks.some(t => t.id === current.id));

    const pauseLabel = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_pause') : '⏸️ Tạm Dừng Tuyển Tập';
    const resumeLabel = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_resume') : '▶️ Tiếp Tục Phát';
    const playAllLabel = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_play_all') : '▶️ Phát Danh Sách';

    if (isCurrentInPlaylist && window.previewPlayer && window.previewPlayer.isPlaying) {
      btnPlayPlaylist.classList.add('playing');
      btnPlayPlaylist.innerHTML = pauseLabel;
      btnPlayPlaylist.title = pauseLabel;
      btnPlayPlaylist.setAttribute('aria-label', pauseLabel);
    } else if (isCurrentInPlaylist && window.previewPlayer && !window.previewPlayer.isPlaying) {
      btnPlayPlaylist.classList.remove('playing');
      btnPlayPlaylist.innerHTML = `${resumeLabel} (<span id="batch-play-count">${checkedCount}</span>)`;
      btnPlayPlaylist.title = resumeLabel;
      btnPlayPlaylist.setAttribute('aria-label', resumeLabel);
    } else {
      btnPlayPlaylist.classList.remove('playing');
      btnPlayPlaylist.innerHTML = `${playAllLabel} (<span id="batch-play-count">${checkedCount}</span>)`;
      btnPlayPlaylist.title = playAllLabel;
      btnPlayPlaylist.setAttribute('aria-label', playAllLabel);
    }
  }

  function updateSelectedBatchCount() {
    const checked = playlistItemsList.querySelectorAll('.playlist-checkbox:checked');
    if (batchSelectedCountEl) batchSelectedCountEl.textContent = checked.length;
    if (batchPlayCountEl) batchPlayCountEl.textContent = checked.length;
    updatePlaylistPlayButtonState();
  }

  btnSelectAll.addEventListener('click', () => {
    const checkboxes = playlistItemsList.querySelectorAll('.playlist-checkbox');
    const anyUnchecked = Array.from(checkboxes).some(cb => !cb.checked);
    checkboxes.forEach(cb => cb.checked = anyUnchecked);
    const selectAllLabel = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_select_all') : 'Đánh Dấu Tất Cả';
    const deselectAllLabel = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_deselect_all') : 'Bỏ Chọn Tất Cả';
    btnSelectAll.textContent = anyUnchecked ? deselectAllLabel : selectAllLabel;
    updateSelectedBatchCount();
  });

  if (btnPlayPlaylist) {
    btnPlayPlaylist.addEventListener('click', () => {
      const checked = Array.from(playlistItemsList.querySelectorAll('.playlist-checkbox:checked'));
      if (checked.length === 0) {
        showToast('⚠️ Bố Mẹ hãy tích chọn ít nhất 1 bài hát để phát nhé!', 'warn');
        return;
      }

      const selectedIds = new Set(checked.map(cb => cb.getAttribute('data-id')));
      const sourceTracks = (currentPlaylistTracks && currentPlaylistTracks.length > 0) ? currentPlaylistTracks : activeTrackList;
      const selectedTracks = sourceTracks.filter(t => selectedIds.has(t.id));

      if (selectedTracks.length === 0) {
        showToast('⚠️ Không tìm thấy bài hát hợp lệ để phát!', 'warn');
        return;
      }

      const current = window.previewPlayer ? window.previewPlayer.currentTrack : null;
      const isCurrentInPlaylist = Boolean(current && selectedTracks.some(t => t.id === current.id));

      if (isCurrentInPlaylist && window.previewPlayer) {
        window.previewPlayer.togglePlay();
        updatePlaylistPlayButtonState();
        return;
      }

      activeTrackList = selectedTracks;
      if (window.previewPlayer) {
        showToast(`▶️ Đang phát tuyển tập: "${selectedTracks[0].title}"`, 'info');
        window.previewPlayer.playTrack(selectedTracks[0]);
      }
      updatePlaylistPlayButtonState();
    });
  }

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

    const artistDefault = window.TuneFlowI18n ? window.TuneFlowI18n.t('artist_default') : 'Nghệ sĩ';
    const playlistTypeBadge = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_type_badge') : 'Tuyển Tập / Album';
    const playlistDuration = window.TuneFlowI18n ? window.TuneFlowI18n.t('playlist_duration_badge') : 'Tuyển tập';
    const btnOpenPlaylistText = window.TuneFlowI18n ? window.TuneFlowI18n.t('btn_open_playlist') : '▶ Mở Tuyển Tập Nghe & Tải';
    const btnPreviewText = window.TuneFlowI18n ? window.TuneFlowI18n.t('btnPreview') : '▶ Nghe Thử';
    const btnPauseText = window.TuneFlowI18n ? window.TuneFlowI18n.t('btn_pause') : '⏸ Tạm Dừng';
    const btnDownloadText = window.TuneFlowI18n ? window.TuneFlowI18n.t('btnDownload') : '↓ Tải MP3';

    songs.forEach(song => {
      const displayTitle = formatCalmTitle(song.title);
      const isPlaylist = Boolean(song.isPlaylist || (song.id && String(song.id).startsWith('PL')));
      if (isPlaylist) {
        const card = document.createElement('div');
        card.className = 'song-card playlist-card';
        card.id = `card-${escapeHtml(song.id)}`;

        card.innerHTML = `
          <div class="song-thumbnail-wrapper" role="button" tabindex="0" title="Bấm để mở danh sách phát này" aria-label="Mở danh sách phát: ${escapeHtml(displayTitle)}">
            <img class="song-thumbnail" src="${escapeHtml(getThumbnailSrc(song.thumbnail))}" data-original-thumb="${escapeHtml(song.thumbnail)}" alt="${escapeHtml(displayTitle)}" referrerpolicy="no-referrer" loading="lazy" onerror="handleImageFallback(this)">
            <div class="song-thumb-overlay" aria-hidden="true">
              <span class="play-icon-overlay">▶</span>
            </div>
            <span class="song-duration" style="background: rgba(217, 155, 67, 0.88); font-weight: 600;">${playlistDuration}</span>
          </div>
          <div class="song-info">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
              <h3 class="song-title" role="button" tabindex="0" title="Bấm để mở tuyển tập này" aria-label="Mở tuyển tập: ${escapeHtml(displayTitle)}">${escapeHtml(displayTitle)}</h3>
            </div>
            <p class="song-uploader">${escapeHtml(song.uploader || artistDefault)}</p>
            <div style="margin-top: 4px; font-size: 13px; font-weight: 600; color: var(--accent-gold);">${playlistTypeBadge}</div>
          </div>
          <div class="song-actions" style="display: flex;">
            <button class="btn-preview btn-open-playlist" id="btn-playlist-${escapeHtml(song.id)}">
              ${btnOpenPlaylistText}
            </button>
          </div>
        `;

        const btnPl = card.querySelector(`#btn-playlist-${song.id}`);

        const openPlaylistHandler = (e) => {
          if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
          const targetUrl = song.url || `https://www.youtube.com/playlist?list=${song.id}`;
          handlePlaylistUrl(targetUrl, btnPl || card);
        };

        const thumbWrapper = card.querySelector('.song-thumbnail-wrapper');
        if (thumbWrapper) {
          thumbWrapper.addEventListener('click', openPlaylistHandler);
          thumbWrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPlaylistHandler(e);
            }
          });
        }

        const titleEl = card.querySelector('.song-title');
        if (titleEl) {
          titleEl.addEventListener('click', openPlaylistHandler);
          titleEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openPlaylistHandler(e);
            }
          });
        }

        if (btnPl) {
          btnPl.addEventListener('click', openPlaylistHandler);
        }

        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('title', `Bấm để mở danh sách phát: ${displayTitle}`);
        card.addEventListener('click', openPlaylistHandler);
        card.addEventListener('keydown', (e) => {
          if (e.target === card && (e.key === 'Enter' || e.key === ' ') && !e.target.closest('button')) {
            e.preventDefault();
            openPlaylistHandler(e);
          }
        });

        resultsContainer.appendChild(card);
        return;
      }

      const isFav = favorites.some(f => f.id === song.id);
      const isCurrentlyPlaying = window.previewPlayer && window.previewPlayer.currentTrack && window.previewPlayer.currentTrack.id === song.id && window.previewPlayer.isPlaying;
      const card = document.createElement('div');
      card.className = `song-card${isCurrentlyPlaying ? ' playing' : ''}`;
      card.id = `card-${escapeHtml(song.id)}`;

      card.innerHTML = `
        <div class="song-thumbnail-wrapper" role="button" tabindex="0" title="Bấm để nghe thử bài hát này" aria-label="Nghe thử bài hát: ${escapeHtml(displayTitle)}">
          <img class="song-thumbnail" src="${escapeHtml(getThumbnailSrc(song.thumbnail))}" data-original-thumb="${escapeHtml(song.thumbnail)}" alt="${escapeHtml(displayTitle)}" referrerpolicy="no-referrer" loading="lazy" onerror="handleImageFallback(this)">
          <div class="song-thumb-overlay" aria-hidden="true">
            <span class="play-icon-overlay">${isCurrentlyPlaying ? '⏸' : '▶'}</span>
          </div>
          <span class="song-duration">${escapeHtml(song.duration_string || '00:00')}</span>
        </div>
        <div class="song-info">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <h3 class="song-title" role="button" tabindex="0" title="Bấm để nghe thử bài hát này" aria-label="Nghe thử bài hát: ${escapeHtml(displayTitle)}">${escapeHtml(displayTitle)}</h3>
            <button class="btn-fav${isFav ? ' active' : ''}" id="btn-fav-${escapeHtml(song.id)}" title="Lưu bài hát yêu thích">${isFav ? '♥' : '♡'}</button>
          </div>
          <p class="song-uploader" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
            <span>${escapeHtml(song.uploader || artistDefault)}</span>
            <span class="song-duration-badge" style="font-weight: 500; color: var(--text-sub); background: rgba(255, 255, 255, 0.04); padding: 2px 8px; border-radius: 6px; font-size: 13px; display: inline-flex; align-items: center; gap: 4px;">${escapeHtml(song.duration_string || '00:00')}</span>
          </p>
          <div class="song-status-badge" id="status-${escapeHtml(song.id)}" style="margin-top: 6px; font-size: 14px; font-weight: 500; color: var(--accent-gold); display: none;"></div>
        </div>
        <div class="song-actions">
          <button class="btn-preview" id="btn-preview-${escapeHtml(song.id)}">
            ${isCurrentlyPlaying ? btnPauseText : btnPreviewText}
          </button>
          <button class="btn-download" id="btn-download-${escapeHtml(song.id)}">
            ${btnDownloadText}
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
      card.setAttribute('title', `Bấm để nghe thử bài hát: ${displayTitle}`);

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

  // Dynamic card re-render for i18n language toggle (Issue #121, Issue #126)
  window.reRenderActiveCards = function() {
    if (lastSearchResults && lastSearchResults.results && lastSearchResults.results.length > 0) {
      const foundTemplate = window.TuneFlowI18n ? window.TuneFlowI18n.t('search_results_found') : 'Tìm thấy {count} bài hát chọn lọc:';
      const foundMsg = foundTemplate.replace('{count}', lastSearchResults.results.length);
      resultsHeader.textContent = lastSearchResults.genreLabel
        ? `${lastSearchResults.genreLabel} • ${foundMsg}`
        : foundMsg;
      renderResults(lastSearchResults.results);
      if (window.previewPlayer) {
        window.previewPlayer.updateCardState();
      }
    } else if (activeTrackList && activeTrackList.length > 0) {
      renderResults(activeTrackList);
      if (window.previewPlayer) {
        window.previewPlayer.updateCardState();
      }
    }
    if (currentPlaylistTracks && currentPlaylistTracks.length > 0 && playlistPanel && playlistPanel.style.display !== 'none') {
      renderPlaylistBatch(currentPlaylistTracks);
    }
  };

  window.setLastSearchResults = function(results, genreLabel = '') {
    lastSearchResults = { results, genreLabel };
    window.reRenderActiveCards();
  };

  // 8. Favorites Management (Zero-Login & Server-Sync for Authenticated Users)
  function toggleFavorite(song, btnEl) {
    const idx = favorites.findIndex(f => f.id === song.id);
    if (idx >= 0) {
      favorites.splice(idx, 1);
      btnEl.textContent = '♡';
      btnEl.classList.remove('active');
      showToast(`Đã xóa khỏi danh sách yêu thích: "${song.title}"`, 'info');
      if (window.authController && window.authController.user) {
        fetch(`/api/user/favorites/${encodeURIComponent(song.id)}`, { method: 'DELETE' })
          .catch(err => console.warn('[Favorite DELETE Error]', err));
      }
    } else {
      const favItem = {
        id: song.id,
        title: song.title,
        uploader: song.uploader,
        thumbnail: song.thumbnail,
        duration: song.duration,
        duration_string: song.duration_string,
        url: song.url
      };
      favorites.push(favItem);
      btnEl.textContent = '♥';
      btnEl.classList.add('active');
      showToast(`♥ Đã lưu bài "${song.title}" vào mục yêu thích của Bố Mẹ!`, 'success');
      if (window.authController && window.authController.user) {
        fetch('/api/user/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(favItem)
        }).catch(err => console.warn('[Favorite POST Error]', err));
      }
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

  async function syncFavoritesWithServer() {
    if (!window.authController || !window.authController.user) return;
    try {
      const res = await fetch('/api/user/favorites/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorites })
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.favorites)) {
        favorites = data.favorites;
        try {
          localStorage.setItem('tuneflow_favorites', JSON.stringify(favorites));
        } catch (_e) {}
        updateFavCount();
        if (btnPersonaFavs && btnPersonaFavs.classList.contains('active')) {
          showFavoritesView();
        }
      }
    } catch (err) {
      console.warn('[Favorites Sync Error]', err);
    }
  }

  window.addEventListener('tuneflow:auth_change', (e) => {
    if (e.detail && e.detail.authenticated) {
      syncFavoritesWithServer();
    }
  });

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
                  downloadBtn.textContent = '✓ Đã Tải';
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
    
    const resolve = (typeof window !== 'undefined' && window.TUNEFLOW_RESOLVE_URL) ? window.TUNEFLOW_RESOLVE_URL : (p => p);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = resolve(`/api/download/${item.id}/file`);
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
    updatePlaylistPlayButtonState();
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
    updatePlaylistPlayButtonState();
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
      toast.style.animation = 'fadeOut 0.3s forwards';
      setTimeout(() => {
        if (toast.parentElement) toast.parentElement.removeChild(toast);
      }, 300);
    }, 4000);
  }

  // PWA A2HS (Add to Home Screen)
  let deferredInstallPrompt = null;
  const btnInstallPwa = document.getElementById('btn-install-pwa');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btnInstallPwa) {
      btnInstallPwa.style.display = 'inline-flex';
    }
  });

  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('🎉 Đang cài đặt TuneFlow lên thiết bị của Bố Mẹ!', 'info');
      }
      deferredInstallPrompt = null;
      btnInstallPwa.style.display = 'none';
    });
  }

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (btnInstallPwa) {
      btnInstallPwa.style.display = 'none';
    }
    showToast('✨ Đã cài đặt TuneFlow thành công!', 'info');
  });

  // 14. TuneFlow Connect, USB Exporter & WakeLock Wiring (Issue #134, #135, #136)
  if (window.tuneflowConnect) {
    window.tuneflowConnect.init();
  }

  // Filial Fallback CTA
  const btnFallbackLibrary = document.getElementById('btn-fallback-library');
  if (btnFallbackLibrary) {
    btnFallbackLibrary.addEventListener('click', () => {
      const favBtn = document.getElementById('btn-persona-favorites');
      if (favBtn) favBtn.click();
      const banner = document.getElementById('filial-fallback-banner');
      if (banner) banner.style.display = 'none';
      showToast('🌸 Đang chuyển sang các bài hát yêu thích đã tải sẵn của Bố Mẹ!', 'info');
    });
  }

  // WakeLock Ambient Bedside Mode (Gap 4)
  const btnToggleWakeLock = document.getElementById('btn-toggle-wakelock');
  if (btnToggleWakeLock) {
    btnToggleWakeLock.addEventListener('click', async () => {
      if (window.tuneflowConnect) {
        const active = await window.tuneflowConnect.toggleWakeLock();
        if (active) {
          btnToggleWakeLock.style.borderColor = 'var(--accent-gold)';
          btnToggleWakeLock.style.color = 'var(--accent-gold)';
          btnToggleWakeLock.innerHTML = '⏰ Giữ Màn Hình (BẬT)';
          showToast('🌟 Màn hình sẽ luôn giữ sáng khi đặt trên bàn để nghe nhạc không bị ngắt quãng!', 'info');
        } else {
          btnToggleWakeLock.style.borderColor = '';
          btnToggleWakeLock.style.color = '';
          btnToggleWakeLock.innerHTML = '⏰ Màn Hình Đặt Bàn';
          showToast('💤 Đã tắt chế độ giữ sáng màn hình.', 'info');
        }
      }
    });
  }

  // TuneFlow Connect Modal & Pairing (Gap 5 & Issue #134)
  const modalConnect = document.getElementById('modal-connect-cast');
  const btnConnectCast = document.getElementById('btn-connect-cast');
  const btnOpenConnect = document.getElementById('btn-open-connect-modal');
  const btnCloseConnect = document.getElementById('btn-connect-modal-close');
  const connectList = document.getElementById('connect-receivers-list');
  const inputConnectPin = document.getElementById('input-connect-pin');
  const btnPairPin = document.getElementById('btn-connect-pair-pin');
  const connectPinStatus = document.getElementById('connect-pin-status');
  const btnActivateTv = document.getElementById('btn-activate-tv-receiver');

  const openConnectModal = async () => {
    if (!modalConnect) return;
    modalConnect.style.display = 'flex';
    if (connectList) {
      connectList.innerHTML = '<div style="font-size: 13px; color: var(--text-muted); padding: 12px; background: var(--bg-card); border-radius: 8px; text-align: center;">Đang tìm TV trong mạng gia đình...</div>';
      if (window.tuneflowConnect) {
        const receivers = await window.tuneflowConnect.fetchReceivers();
        if (receivers.length === 0) {
          connectList.innerHTML = '<div style="font-size: 13px; color: var(--text-sub); padding: 12px; background: var(--bg-card); border-radius: 8px; text-align: center;">Chưa thấy TV nào mở TuneFlow. Bố Mẹ bật TuneFlow trên TV trước nha!</div>';
        } else {
          connectList.innerHTML = receivers.map(r => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px;">
              <div>
                <strong>📺 ${escapeHtml(r.name)}</strong>
                <div style="font-size: 12px; color: var(--text-muted);">${r.state && r.state.isPlaying ? '🟢 Đang phát nhạc' : '⚪ Đang chờ'}</div>
              </div>
              <button class="primary-btn btn-connect-quick-pair" data-rcv-id="${r.receiverId}" style="padding: 6px 14px; font-size: 13px; border-radius: var(--radius-pill);">
                Phát Lên TV Này
              </button>
            </div>
          `).join('');

          connectList.querySelectorAll('.btn-connect-quick-pair').forEach(btn => {
            btn.addEventListener('click', () => {
              if (inputConnectPin) inputConnectPin.focus();
              showToast('🔑 Vui lòng nhập 4 số PIN hiển thị trên góc TV để ghép nối nhé!', 'info');
            });
          });
        }
      }
    }
  };

  if (btnConnectCast) btnConnectCast.addEventListener('click', openConnectModal);
  if (btnOpenConnect) btnOpenConnect.addEventListener('click', openConnectModal);
  if (btnCloseConnect) btnCloseConnect.addEventListener('click', () => { modalConnect.style.display = 'none'; });

  if (btnPairPin && inputConnectPin) {
    btnPairPin.addEventListener('click', async () => {
      const pin = inputConnectPin.value.trim();
      if (!pin) return;
      btnPairPin.disabled = true;
      btnPairPin.textContent = 'Đang ghép...';
      const result = await window.tuneflowConnect.pairWithPin(pin);
      btnPairPin.disabled = false;
      btnPairPin.textContent = 'Ghép Nối';
      if (result.success) {
        showToast(`🎉 Đã kết nối thành công với ${result.receiver.name}! Giờ đây bất kỳ bài hát nào Bố Mẹ bấm nghe đều sẽ phát lên TV!`, 'info');
        modalConnect.style.display = 'none';
      } else {
        if (connectPinStatus) {
          connectPinStatus.style.display = 'block';
          connectPinStatus.style.color = 'var(--accent-red)';
          connectPinStatus.textContent = result.error || 'Mã PIN chưa đúng, Bố Mẹ kiểm tra lại trên TV nha!';
        }
      }
    });
  }

  if (btnActivateTv) {
    btnActivateTv.addEventListener('click', () => {
      modalConnect.style.display = 'none';
      if (window.tuneflowConnect) {
        window.tuneflowConnect.activateReceiverMode();
        showToast('📺 Đã bật chế độ TV Receiver! Màn hình đang sẵn sàng nhận nhạc từ điện thoại.', 'info');
      }
    });
  }

  // Physical USB Exporter Modal (Gap 1 & Issue #135)
  const modalUsb = document.getElementById('modal-export-usb');
  const btnOpenUsb = document.getElementById('btn-open-usb-modal');
  const btnCloseUsb = document.getElementById('btn-usb-modal-close');
  const selectUsb = document.getElementById('select-usb-drive');
  const btnRefreshUsb = document.getElementById('btn-refresh-usb-drives');
  const btnDoExportUsb = document.getElementById('btn-do-usb-export');
  const usbStatus = document.getElementById('usb-export-status');

  const refreshUsbDrives = async () => {
    if (!selectUsb) return;
    selectUsb.innerHTML = '<option value="">-- Đang quét ổ đĩa USB... --</option>';
    try {
      const res = await fetch('/api/usb/drives');
      const data = await res.json();
      if (data.success && data.drives && data.drives.length > 0) {
        selectUsb.innerHTML = data.drives.map(d => `<option value="${escapeHtml(d.path)}">💾 ${escapeHtml(d.name)} (${escapeHtml(d.path)})</option>`).join('');
      } else {
        selectUsb.innerHTML = '<option value="">⚠️ Không thấy USB nào cắm vào máy chủ. Hãy cắm USB hoặc dùng tải ZIP bên dưới nhé!</option>';
      }
    } catch (_e) {
      selectUsb.innerHTML = '<option value="">Lỗi khi quét ổ đĩa USB</option>';
    }
  };

  if (btnOpenUsb) {
    btnOpenUsb.addEventListener('click', () => {
      if (modalUsb) {
        modalUsb.style.display = 'flex';
        refreshUsbDrives();
      }
    });
  }
  if (btnCloseUsb && modalUsb) {
    btnCloseUsb.addEventListener('click', () => { modalUsb.style.display = 'none'; });
  }
  if (btnRefreshUsb) {
    btnRefreshUsb.addEventListener('click', refreshUsbDrives);
  }
  if (btnDoExportUsb && selectUsb) {
    btnDoExportUsb.addEventListener('click', async () => {
      const drivePath = selectUsb.value;
      if (!drivePath) {
        showToast('⚠️ Vui lòng cắm USB hoặc chọn ổ đĩa USB trước khi xuất nhé!', 'warn');
        return;
      }
      btnDoExportUsb.disabled = true;
      btnDoExportUsb.textContent = '⏳ Đang sao chép & đánh số thứ tự...';
      try {
        const res = await fetch('/api/usb/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drivePath, subDir: 'TuneFlow_Music' })
        });
        const data = await res.json();
        btnDoExportUsb.disabled = false;
        btnDoExportUsb.textContent = '⚡ Chép Toàn Bộ Bài Đã Tải Vào USB';
        if (data.success) {
          showToast(`🎉 Đã xuất thành công ${data.exportedCount} bài hát vào USB! Các bài đã được đánh số 001, 002... sẵn sàng nghe trên loa đài / ô tô!`, 'info');
          if (usbStatus) {
            usbStatus.style.display = 'block';
            usbStatus.style.color = 'var(--accent-green)';
            usbStatus.style.background = 'rgba(16, 185, 129, 0.15)';
            usbStatus.textContent = `✅ Đã chép ${data.exportedCount} bài hát vào thư mục: ${data.targetDir}`;
          }
        } else {
          showToast(`⚠️ Lỗi: ${data.error}`, 'error');
        }
      } catch (err) {
        btnDoExportUsb.disabled = false;
        btnDoExportUsb.textContent = '⚡ Chép Toàn Bộ Bài Đã Tải Vào USB';
        showToast(`⚠️ Lỗi kết nối: ${err.message}`, 'error');
      }
    });
  }

  window.showToast = showToast;
  window.renderResults = renderResults;
  window.renderPlaylistBatch = renderPlaylistBatch;
  window.updatePlaylistPlayButtonState = updatePlaylistPlayButtonState;
});
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isEditableElement,
    handleGlobalKeydown
  };
}
