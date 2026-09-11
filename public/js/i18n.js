/**
 * TuneFlow Client-side i18n Localization Engine (Issue #19)
 * Supports Vietnamese (vi - default) and English (en) with full elderly persona adaptation
 */
(function() {
  const translations = {
    vi: {
      tagline: 'Nghe thử & Tải nhạc chất lượng cao dành cho Bố Mẹ',
      helpBtn: '❓ Hướng Dẫn Dễ Hiểu',
      momPersona: 'Mẹ Hay Nghe',
      dadPersona: 'Bố Hay Nghe',
      favPersona: 'Bài Bố Mẹ Thích',
      momSectionLabel: '🌸 Thể loại Mẹ hay nghe:',
      dadSectionLabel: '☕ Thể loại Bố hay nghe:',
      filterAll: 'Tất Cả',
      filterVocal: '🎤 Có Lời',
      filterInstrumental: '🎻 Không Lời Hòa Tấu',
      searchLabel: '🔍 Bố Mẹ muốn tìm bài hát hoặc dán link danh sách phát (Playlist) tại đây:',
      searchPlaceholder: 'Gõ tên bài hát, ca sĩ, hoặc dán link Playlist YouTube...',
      searchBtn: '🔎 Tìm Kiếm',
      resultsDefault: '✨ Bấm chọn một thể loại ở trên hoặc gõ tên bài hát để bắt đầu nhé!',
      modalTitle: '❓ Hướng Dẫn Sử Dụng Cho Bố Mẹ',
      step1Title: 'Bước 1: Chọn Thể Loại Nhạc Quen Thuộc',
      step1Desc: 'Bố Mẹ chỉ cần bấm vào các nút thể loại có sẵn ở trên (Dân ca quê hương, Nhạc vàng Bolero, Nhạc thiền...), hoặc gõ tên bài hát vào ô tìm kiếm.',
      step2Title: 'Bước 2: Bấm Nghe Thử Trước',
      step2Desc: 'Bấm nút [▶️ Nghe Thử Trước] để nghe bài hát phát ngay ở thanh phát nhạc bên dưới. Thấy ưng ý giai điệu thì mới tải về máy nhé!',
      step3Title: 'Bước 3: Tải Về Máy Tính',
      step3Desc: 'Bấm nút [⬇️ Tải Về Máy]. Bản nhạc chất lượng cao MP3 320kbps sẽ tự động được tải và lưu an toàn vào máy tính của Bố Mẹ.',
      modalAck: 'Dạ Bố Mẹ Đã Hiểu Rồi!',
      drawerTitle: '📥 Hàng Đợi Tải Nhạc',
      drawerEmpty: 'Chưa có bài hát nào trong hàng đợi tải.<br>Bố Mẹ bấm [Tải Về Máy] ở bài hát để theo dõi tiến độ tại đây nhé!',
      drawerClear: '🧹 Dọn Dẹp Các Bài Đã Tải Xong',
      queueBadge: '📥 Hàng Đợi',
      btnDownload: '⬇️ Tải Về Máy (MP3)',
      btnPreview: '▶️ Nghe Thử Trước',
      favBatchDl: '⬇️ Tải Toàn Bộ Về Máy',
      favBatchClear: '🗑️ Xóa Toàn Bộ',
      favBatchTitle: '❤️ Tuyển Tập Yêu Thích Của Bố Mẹ',
      playerEq: '🎛️ Bộ Chỉnh Âm Giọng Ca',
      playerBoost: '⚡ Khuếch Đại Âm Lượng',
      tv_mode: '📺 Chế Độ TV',
      exit_tv_mode: '📺 Thoát TV',
      ambient_mode: '🖼️ Toàn Màn Hình Tĩnh Dưỡng',
      voice_search: '🎙️ Nói Để Tìm Bài',
      voice_listening: '🔴 Đang nghe Bố Mẹ nói...',
      voice_unsupported: 'Trình duyệt chưa hỗ trợ tìm bằng giọng nói',
      install_app: '📲 Cài App',
      filter_playlist: '📻 Tuyển Tập / Album',
      sort_relevance: '⭐ Phù Hợp',
      sort_views: '👁️ Nhiều Lượt Nghe',
      sort_date: '🆕 Mới Nhất',
      open_playlist: '📂 Mở Tuyển Tập',
      playlist_play_all: '▶️ Phát Danh Sách',
      playlist_pause: '⏸️ Tạm Dừng Tuyển Tập',
      playlist_resume: '▶️ Tiếp Tục Phát',
      playlist_select_all: 'Đánh Dấu Tất Cả',
      playlist_deselect_all: 'Bỏ Chọn Tất Cả',
      playlist_download_selected: '⬇️ Tải Các Bài Đã Chọn'
    },
    en: {
      tagline: 'High-fidelity music preview & downloader lovingly designed for Parents',
      helpBtn: '❓ Easy Guide',
      momPersona: "Mom's Favorites",
      dadPersona: "Dad's Favorites",
      favPersona: 'Favorite Songs',
      momSectionLabel: "🌸 Genres Mom loves:",
      dadSectionLabel: "☕ Genres Dad loves:",
      filterAll: 'All',
      filterVocal: '🎤 With Vocals',
      filterInstrumental: '🎻 Instrumental',
      searchLabel: '🔍 Search for your favorite song, artist, or YouTube playlist URL:',
      searchPlaceholder: 'Type song name, artist, or paste YouTube Playlist link...',
      searchBtn: '🔎 Search',
      resultsDefault: '✨ Tap a genre pill above or type a song title to start listening!',
      modalTitle: '❓ Simple Guide for Parents & Grandparents',
      step1Title: 'Step 1: Pick a Familiar Genre',
      step1Desc: 'Simply tap one of the genre buttons above (Golden Oldies, Meditation, Country, Classical...), or type a song title in the search box.',
      step2Title: 'Step 2: Preview the Song First',
      step2Desc: 'Tap the blue [▶️ Preview First] button to listen instantly in the player below. Make sure it is the exact melody you love!',
      step3Title: 'Step 3: Download to Your Device',
      step3Desc: 'Tap the green [⬇️ Download MP3] button. The high-quality 320kbps audio file will automatically save to your computer.',
      modalAck: 'Got it, thank you!',
      drawerTitle: '📥 Download Queue',
      drawerEmpty: 'No downloads in progress.<br>Tap [Download MP3] on any song to monitor it here!',
      drawerClear: '🧹 Clear Completed Tasks',
      queueBadge: '📥 Queue',
      btnDownload: '⬇️ Download MP3',
      btnPreview: '▶️ Preview First',
      favBatchDl: '⬇️ Download All Favorites',
      favBatchClear: '🗑️ Clear All',
      favBatchTitle: "❤️ Parents' Favorite Collection",
      playerEq: '🎛️ Audio Equalizer',
      playerBoost: '⚡ Volume Booster',
      tv_mode: '📺 TV Mode',
      exit_tv_mode: '📺 Exit TV',
      ambient_mode: '🖼️ Ambient Leanback Mode',
      voice_search: '🎙️ Voice Search',
      voice_listening: '🔴 Listening to Parents...',
      voice_unsupported: 'Voice search is not supported in this browser',
      install_app: '📲 Install App',
      filter_playlist: '📻 Playlists / Albums',
      sort_relevance: '⭐ Relevance',
      sort_views: '👁️ Most Viewed',
      sort_date: '🆕 Latest',
      open_playlist: '📂 Open Playlist',
      playlist_play_all: '▶️ Play Playlist',
      playlist_pause: '⏸️ Pause Playlist',
      playlist_resume: '▶️ Resume Playlist',
      playlist_select_all: 'Select All',
      playlist_deselect_all: 'Deselect All',
      playlist_download_selected: '⬇️ Download Selected'
    }
  };

  const personaPresetsByLang = {
    vi: {
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
    },
    en: {
      mom: {
        title: "Mom's Favorites",
        sectionLabel: "🌸 Genres Mom loves:",
        pills: [
          { label: '🧘 Peaceful Meditation', query: 'peaceful meditation relaxing sleep music' },
          { label: '🕊️ Celtic & Sacred Hymns', query: 'celtic melodies gentle hymns peaceful' },
          { label: '🌾 Gentle Acoustic Country', query: 'gentle acoustic country folk classics' },
          { label: '🎹 Classical & Soft Piano', query: 'classical piano lullabies peaceful relax' },
          { label: '🌧️ Nature Sounds & Rain', query: 'calming rain and nature sounds deep sleep' },
          { label: '✨ Spirituals & Gospel', query: 'traditional gospel peaceful spiritual songs' }
        ],
        defaultQuery: 'peaceful meditation relaxing sleep music'
      },
      dad: {
        title: "Dad's Favorites",
        sectionLabel: "☕ Genres Dad loves:",
        pills: [
          { label: '📻 Golden Oldies 50s-70s', query: 'golden oldies 50s 60s 70s greatest hits' },
          { label: '🎙️ Frank Sinatra & Crooners', query: 'frank sinatra nat king cole crooners classics' },
          { label: '🎸 Classic Rock Ballads', query: 'classic rock ballads acoustic 70s 80s' },
          { label: '🌾 Vintage Country & Blues', query: 'vintage country blues classics acoustic' },
          { label: '🎷 Smooth Jazz & Saxophone', query: 'smooth relaxing jazz saxophone instrumental' },
          { label: '🪕 Bluegrass & Folk Melodies', query: 'classic bluegrass and acoustic folk songs' }
        ],
        defaultQuery: 'golden oldies 50s 60s 70s greatest hits'
      }
    }
  };

  let currentLang = 'vi';
  try {
    currentLang = localStorage.getItem('tuneflow_lang') || 'vi';
  } catch (_e) {}

  function getTranslation(key) {
    return (translations[currentLang] && translations[currentLang][key]) || translations['vi'][key] || key;
  }

  function setLanguage(lang) {
    currentLang = lang === 'en' ? 'en' : 'vi';
    try {
      localStorage.setItem('tuneflow_lang', currentLang);
    } catch (_e) {}

    // Update HTML lang attribute
    document.documentElement.setAttribute('lang', currentLang);

    // Update DOM static texts
    const taglineEl = document.querySelector('.brand-tagline');
    if (taglineEl) taglineEl.textContent = getTranslation('tagline');

    const helpBtnEl = document.getElementById('btn-help');
    if (helpBtnEl) helpBtnEl.textContent = getTranslation('helpBtn');

    const momText = document.querySelector('#btn-persona-mom .persona-text');
    if (momText) momText.textContent = getTranslation('momPersona');

    const dadText = document.querySelector('#btn-persona-dad .persona-text');
    if (dadText) dadText.textContent = getTranslation('dadPersona');

    const favBtn = document.getElementById('btn-persona-favorites');
    if (favBtn) {
      const count = document.getElementById('fav-count')?.textContent || '0';
      favBtn.querySelector('.persona-text').innerHTML = `${getTranslation('favPersona')} (<span id="fav-count">${count}</span>)`;
    }

    const searchLabelEl = document.querySelector('.search-label');
    if (searchLabelEl) searchLabelEl.textContent = getTranslation('searchLabel');

    const searchInputEl = document.getElementById('search-input');
    if (searchInputEl) searchInputEl.placeholder = getTranslation('searchPlaceholder');

    const searchBtnEl = document.getElementById('search-btn');
    if (searchBtnEl) searchBtnEl.textContent = getTranslation('searchBtn');

    // Filter Chips
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      const filterType = chip.getAttribute('data-filter');
      if (filterType === 'all') chip.textContent = getTranslation('filterAll');
      if (filterType === 'vocal') chip.textContent = getTranslation('filterVocal');
      if (filterType === 'instrumental') chip.textContent = getTranslation('filterInstrumental');
    });

    // Guidance Modal
    const modalTitleEl = document.getElementById('help-modal-title');
    if (modalTitleEl) modalTitleEl.textContent = getTranslation('modalTitle');

    const stepCards = document.querySelectorAll('#help-modal .step-card');
    if (stepCards[0]) {
      stepCards[0].querySelector('h3').textContent = getTranslation('step1Title');
      stepCards[0].querySelector('p').textContent = getTranslation('step1Desc');
    }
    if (stepCards[1]) {
      stepCards[1].querySelector('h3').textContent = getTranslation('step2Title');
      stepCards[1].querySelector('p').textContent = getTranslation('step2Desc');
    }
    if (stepCards[2]) {
      stepCards[2].querySelector('h3').textContent = getTranslation('step3Title');
      stepCards[2].querySelector('p').textContent = getTranslation('step3Desc');
    }

    const modalAckBtn = document.getElementById('btn-help-ack');
    if (modalAckBtn) modalAckBtn.textContent = getTranslation('modalAck');

    // Drawer
    const drawerHeader = document.querySelector('.drawer-header h3');
    if (drawerHeader) {
      const count = document.getElementById('drawer-count')?.textContent || '0';
      drawerHeader.innerHTML = `${getTranslation('drawerTitle')} (<span id="drawer-count">${count}</span>)`;
    }
    const drawerClearBtn = document.getElementById('btn-drawer-clear-done');
    if (drawerClearBtn) drawerClearBtn.textContent = getTranslation('drawerClear');

    // Language Toggle Button UI
    const langBtn = document.getElementById('btn-lang-toggle');
    if (langBtn) {
      langBtn.textContent = currentLang === 'vi' ? '🇻🇳 Tiếng Việt' : '🇬🇧 English';
      langBtn.title = currentLang === 'vi' ? 'Chuyển sang Tiếng Anh (English)' : 'Switch to Vietnamese (Tiếng Việt)';
    }

    // Trigger persona reload if active
    if (typeof window.refreshCurrentPersonaPresets === 'function') {
      window.refreshCurrentPersonaPresets();
    }
  }

  window.TuneFlowI18n = {
    getLanguage: () => currentLang,
    setLanguage,
    t: getTranslation,
    getPresets: () => personaPresetsByLang[currentLang]
  };
})();
