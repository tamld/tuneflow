/**
 * TuneFlow Extension Background Service Worker (Manifest V3)
 * Dispatches download requests to local TuneFlow server and manages desktop notifications.
 */

const DEFAULT_SERVER_URL = 'http://localhost:3000';

async function getServerUrl() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['tuneflow_server_url'], (res) => {
      resolve(res.tuneflow_server_url || DEFAULT_SERVER_URL);
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'DOWNLOAD_SONG') {
    handleDownloadSong(request)
      .then(sendResponse)
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'CHECK_SERVER') {
    handleCheckServer(request.serverUrl)
      .then(sendResponse)
      .catch((err) => sendResponse({ online: false, error: err.message }));
    return true;
  }
});

async function handleDownloadSong(data) {
  const serverUrl = await getServerUrl();
  const endpoint = `${serverUrl.replace(/\/$/, '')}/api/queue/add`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: data.url,
        title: data.title,
        format: 'mp3'
      })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Máy chủ trả về mã lỗi: ${res.status}`);
    }

    const result = await res.json();

    // Show desktop notification to reassure elderly user
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🎶 TuneFlow — Đang Tải Nhạc',
        message: `Đã thêm: "${data.title || 'Bài hát'}" vào hàng đợi tải về máy tính!`
      });
    }

    return { success: true, item: result.item };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleCheckServer(targetUrl) {
  const serverUrl = targetUrl || (await getServerUrl());
  const endpoint = `${serverUrl.replace(/\/$/, '')}/api/health`;

  try {
    const res = await fetch(endpoint);
    if (res.ok) {
      const json = await res.json();
      return { online: true, status: json };
    }
    return { online: false, status: res.status };
  } catch (err) {
    return { online: false, error: err.message };
  }
}
