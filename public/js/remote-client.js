/**
 * TuneFlow Remote Client & Server Switcher Engine (SPEC-0013)
 * Allows Web Client & PWA (Quadrant Q3/Q4) to seamlessly switch between
 * Local Same-Origin Server and Remote Headless Server (LAN IP or HTTPS FQDN).
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'tuneflow_server_endpoint';

  function getStoredEndpoint() {
    try {
      return (localStorage.getItem(STORAGE_KEY) || '').trim();
    } catch (_err) {
      return '';
    }
  }

  function setStoredEndpoint(url) {
    try {
      if (!url) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''));
      }
    } catch (_err) {}
  }

  function resolveUrl(path) {
    if (!path) return '';
    const endpoint = getStoredEndpoint();
    if (!endpoint) return path;

    // Only rewrite root-relative API calls or media assets
    if (typeof path === 'string' && path.startsWith('/')) {
      return endpoint + path;
    }
    return path;
  }

  // 1. Intercept window.fetch for /api/ routes
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const endpoint = getStoredEndpoint();
    if (endpoint) {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        return originalFetch.call(this, endpoint + input, init);
      }
      if (typeof Request !== 'undefined' && input instanceof Request && input.url) {
        try {
          const u = new URL(input.url, window.location.origin);
          if (u.origin === window.location.origin && u.pathname.startsWith('/api/')) {
            const newUrl = endpoint + u.pathname + u.search + u.hash;
            const newReq = new Request(newUrl, input);
            return originalFetch.call(this, newReq, init);
          }
        } catch (_err) {}
      }
    }
    return originalFetch.apply(this, arguments);
  };

  // 2. Intercept window.EventSource for /api/ SSE streams
  if (typeof window.EventSource !== 'undefined') {
    const OriginalEventSource = window.EventSource;
    window.EventSource = function(url, eventSourceInitDict) {
      const endpoint = getStoredEndpoint();
      if (endpoint && typeof url === 'string' && url.startsWith('/api/')) {
        return new OriginalEventSource(endpoint + url, eventSourceInitDict);
      }
      return new OriginalEventSource(url, eventSourceInitDict);
    };
  }

  // 3. Test Connection Helper
  async function testServerConnection(urlStr) {
    const target = (urlStr || getStoredEndpoint() || window.location.origin).replace(/\/+$/, '');
    const startTime = performance.now();
    try {
      const res = await originalFetch(`${target}/api/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const latencyMs = Math.round(performance.now() - startTime);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          ok: true,
          latencyMs,
          statusCode: res.status,
          version: data.version || 'v2.7.0',
          status: data.status || 'healthy'
        };
      }
      return { ok: false, statusCode: res.status, latencyMs, error: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, error: err.message || 'Không thể kết nối' };
    }
  }

  // Export Global Helpers
  window.TUNEFLOW_RESOLVE_URL = resolveUrl;
  window.TUNEFLOW_GET_SERVER_ENDPOINT = getStoredEndpoint;
  window.TUNEFLOW_SET_SERVER_ENDPOINT = setStoredEndpoint;
  window.TUNEFLOW_TEST_SERVER_CONNECTION = testServerConnection;

  // 4. UI Bindings
  document.addEventListener('DOMContentLoaded', () => {
    const btnTrigger = document.getElementById('btn-server-endpoint-trigger');
    const modal = document.getElementById('modal-server-endpoint');
    const btnClose = document.getElementById('btn-server-modal-close');
    const btnCancel = document.getElementById('btn-server-cancel');
    const btnTest = document.getElementById('btn-server-test');
    const btnSave = document.getElementById('btn-server-save');
    const btnReset = document.getElementById('btn-server-reset');
    const inputUrl = document.getElementById('server-endpoint-input');
    const statusMsg = document.getElementById('server-endpoint-status');
    const currentLabel = document.getElementById('server-current-label');

    function updateTriggerBadge() {
      const endpoint = getStoredEndpoint();
      if (!btnTrigger) return;
      if (endpoint) {
        try {
          const parsed = new URL(endpoint);
          btnTrigger.innerHTML = `🌐 <span style="font-size: 13px; color: var(--accent-gold);">${parsed.hostname}</span>`;
          btnTrigger.title = `Đang kết nối máy chủ từ xa: ${endpoint}`;
        } catch (_err) {
          btnTrigger.innerHTML = `🌐 <span style="font-size: 13px; color: var(--accent-gold);">Từ Xa</span>`;
        }
      } else {
        btnTrigger.innerHTML = `🌐 <span style="font-size: 13px;">Máy Chủ</span>`;
        btnTrigger.title = `Cài đặt máy chủ TuneFlow (Mặc định: Cùng máy chủ)`;
      }
    }

    function openModal() {
      if (!modal) return;
      const endpoint = getStoredEndpoint();
      if (inputUrl) inputUrl.value = endpoint;
      if (currentLabel) {
        currentLabel.textContent = endpoint ? endpoint : `${window.location.origin} (Mặc định)`;
      }
      if (statusMsg) {
        statusMsg.style.display = 'none';
        statusMsg.textContent = '';
      }
      modal.style.display = 'flex';
      if (inputUrl) inputUrl.focus();
    }

    function closeModal() {
      if (modal) modal.style.display = 'none';
    }

    if (btnTrigger) btnTrigger.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (btnTest) {
      btnTest.addEventListener('click', async () => {
        const val = (inputUrl ? inputUrl.value : '').trim();
        if (statusMsg) {
          statusMsg.style.display = 'block';
          statusMsg.className = 'server-status-info';
          statusMsg.textContent = '⏳ Đang kiểm tra kết nối...';
        }
        const result = await testServerConnection(val);
        if (statusMsg) {
          if (result.ok) {
            statusMsg.className = 'server-status-success';
            statusMsg.textContent = `✅ Kết nối thành công! Độ trễ: ${result.latencyMs}ms | Phiên bản: ${result.version}`;
          } else {
            statusMsg.className = 'server-status-error';
            statusMsg.textContent = `❌ Không thể kết nối: ${result.error || 'Server không phản hồi'}`;
          }
        }
      });
    }

    if (btnSave) {
      btnSave.addEventListener('click', async () => {
        const val = (inputUrl ? inputUrl.value : '').trim();
        if (val) {
          // Normalize URL
          let norm = val;
          if (!norm.toLowerCase().startsWith('http://') && !norm.toLowerCase().startsWith('https://')) {
            norm = 'http://' + norm;
          }
          setStoredEndpoint(norm);
        } else {
          setStoredEndpoint('');
        }
        updateTriggerBadge();
        closeModal();
        if (window.showToast) {
          window.showToast('✅ Đã lưu cấu hình máy chủ. Đang tải lại giao diện...', 'success');
        }
        setTimeout(() => {
          window.location.reload();
        }, 500);
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        setStoredEndpoint('');
        updateTriggerBadge();
        closeModal();
        if (window.showToast) {
          window.showToast('🔄 Đã khôi phục máy chủ mặc định. Đang tải lại...', 'info');
        }
        setTimeout(() => {
          window.location.reload();
        }, 500);
      });
    }

    updateTriggerBadge();
  });
})();
