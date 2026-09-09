document.addEventListener('DOMContentLoaded', async () => {
  const serverInput = document.getElementById('server-url-input');
  const btnSave = document.getElementById('btn-save-server');
  const serverBadge = document.getElementById('server-badge');
  const serverUptime = document.getElementById('server-uptime');
  const serverTasks = document.getElementById('server-tasks');
  const btnOpenWeb = document.getElementById('btn-open-web');

  const DEFAULT_SERVER = 'http://localhost:3000';

  // Load saved server URL
  chrome.storage.local.get(['tuneflow_server_url'], (res) => {
    const currentUrl = res.tuneflow_server_url || DEFAULT_SERVER;
    serverInput.value = currentUrl;
    checkStatus(currentUrl);
  });

  btnSave.addEventListener('click', () => {
    const newUrl = serverInput.value.trim() || DEFAULT_SERVER;
    chrome.storage.local.set({ tuneflow_server_url: newUrl }, () => {
      checkStatus(newUrl);
    });
  });

  btnOpenWeb.addEventListener('click', () => {
    const url = serverInput.value.trim() || DEFAULT_SERVER;
    chrome.tabs.create({ url });
  });

  async function checkStatus(url) {
    serverBadge.textContent = 'Đang kiểm tra...';
    serverBadge.className = 'badge badge-offline';

    try {
      chrome.runtime.sendMessage({ action: 'CHECK_SERVER', serverUrl: url }, (res) => {
        if (res && res.online && res.status) {
          serverBadge.textContent = '🟢 Đang hoạt động';
          serverBadge.className = 'badge badge-online';
          const upSecs = Math.round(res.status.uptime || 0);
          const mins = Math.floor(upSecs / 60);
          serverUptime.textContent = `${mins} phút (${upSecs}s)`;
          serverTasks.textContent = `${res.status.activeTasks || 0} bài`;
        } else {
          serverBadge.textContent = '🔴 Mất kết nối';
          serverBadge.className = 'badge badge-offline';
          serverUptime.textContent = '--';
          serverTasks.textContent = '--';
        }
      });
    } catch (err) {
      serverBadge.textContent = '🔴 Ngoại tuyến';
      serverBadge.className = 'badge badge-offline';
    }
  }
});
