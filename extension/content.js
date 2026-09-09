/**
 * TuneFlow Chrome / Edge Extension Content Script (Manifest V3)
 * Injects 1-Click "🎧 Tải Về Cho Bố Mẹ" button on YouTube watch pages.
 */
(function () {
  'use strict';

  const BUTTON_ID = 'tuneflow-quick-download-btn';

  function createTuneFlowButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const targetContainer = document.querySelector('#owner') ||
                            document.querySelector('#subscribe-button') ||
                            document.querySelector('#top-row');

    if (!targetContainer) return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Tải bài hát này về máy chủ TuneFlow gia đình');
    btn.textContent = '🎧 Tải Về Cho Bố Mẹ';

    // Style button to match SilverMelody high-contrast standards
    Object.assign(btn.style, {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '38px',
      padding: '0 18px',
      marginLeft: '12px',
      backgroundColor: '#2b825b',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: '700',
      border: '2px solid #e6b800',
      borderRadius: '19px',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
      transition: 'all 0.2s ease',
      zIndex: '9999'
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#236b4b';
      btn.style.transform = 'scale(1.04)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = '#2b825b';
      btn.style.transform = 'scale(1)';
    });

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const videoUrl = window.location.href;
      const titleEl = document.querySelector('h1.style-scope.ytd-watch-metadata') || document.querySelector('h1');
      const title = titleEl ? titleEl.textContent.trim() : document.title.replace(' - YouTube', '');

      btn.disabled = true;
      btn.textContent = '⏳ Đang gửi sang TuneFlow...';

      try {
        chrome.runtime.sendMessage({
          action: 'DOWNLOAD_SONG',
          url: videoUrl,
          title: title
        }, (response) => {
          if (response && response.success) {
            btn.textContent = '✅ Đã thêm vào hàng đợi!';
            btn.style.backgroundColor = '#1f7a4a';
          } else {
            const errorMsg = response?.error || 'Không kết nối được TuneFlow';
            btn.textContent = '⚠️ Lỗi: ' + errorMsg;
            btn.style.backgroundColor = '#d32f2f';
          }

          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '🎧 Tải Về Cho Bố Mẹ';
            btn.style.backgroundColor = '#2b825b';
          }, 3500);
        });
      } catch (err) {
        btn.disabled = false;
        btn.textContent = '⚠️ Lỗi tiện ích';
      }
    });

    targetContainer.appendChild(btn);
  }

  // Inject on navigation and DOM mutations
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(createTuneFlowButton, 1000);
  });

  const observer = new MutationObserver(() => {
    if (window.location.pathname === '/watch' && !document.getElementById(BUTTON_ID)) {
      createTuneFlowButton();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  if (window.location.pathname === '/watch') {
    setTimeout(createTuneFlowButton, 1000);
  }
})();
