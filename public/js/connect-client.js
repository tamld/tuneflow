/**
 * TuneFlow Connect Client & USB Exporter Helper (Issue #134, #135, #136)
 * - Remote device pairing (QR/PIN) & casting to TV receiver
 * - WakeLock API for iPad/iPhone bedside clock ambient mode
 * - USB drive discovery and single-click copy trigger
 */

class TuneFlowConnectClient {
  constructor() {
    this.activeReceiver = null; // { receiverId, name, token }
    this.isReceiverMode = false;
    this.myReceiverId = null;
    this.myPin = null;
    this.sseSource = null;
    this.wakeLock = null;
  }

  /**
   * Initialize Connect Client event listeners and check URL params
   */
  init() {
    // Restore any existing paired receiver
    try {
      const saved = localStorage.getItem('tuneflow_connect_paired');
      if (saved) {
        this.activeReceiver = JSON.parse(saved);
        this.updateCastButtonUI();
      }
    } catch (_e) {}

    // Check if opened with ?mode=receiver
    if (typeof window !== 'undefined' && window.location && window.URLSearchParams) {
      const urlParams = new window.URLSearchParams(window.location.search);
      if (urlParams.get('mode') === 'receiver') {
        this.activateReceiverMode();
      }
    }
  }

  /**
   * Request Screen WakeLock (for iPad / Android bedside ambient listening)
   */
  async toggleWakeLock() {
    if ('wakeLock' in navigator) {
      if (this.wakeLock) {
        try {
          await this.wakeLock.release();
          this.wakeLock = null;
          return false;
        } catch (_e) {
          return false;
        }
      } else {
        try {
          this.wakeLock = await navigator.wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => {
            this.wakeLock = null;
          });
          return true;
        } catch (_err) {
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Register this device as a TV receiver
   * @param {string} [name='TV Phòng Khách']
   */
  async registerAsReceiver(name = 'TV Phòng Khách') {
    try {
      const res = await fetch('/api/connect/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (data.success && data.receiver) {
        this.isReceiverMode = true;
        this.myReceiverId = data.receiver.receiverId;
        this.myPin = data.receiver.pin;
        this.startSSEListener(this.myReceiverId);
        return data.receiver;
      }
    } catch (err) {
      console.error('Failed to register receiver:', err);
    }
    return null;
  }

  /**
   * Start listening to dispatched commands via Server-Sent Events (SSE)
   * @param {string} receiverId
   */
  startSSEListener(receiverId) {
    if (this.sseSource) {
      this.sseSource.close();
    }

    this.sseSource = new EventSource(`/api/connect/events?receiverId=${receiverId}`);
    this.sseSource.onmessage = (event) => {
      try {
        const cmd = JSON.parse(event.data);
        this.handleRemoteCommand(cmd);
      } catch (_e) {}
    };

    this.sseSource.onerror = () => {
      // Auto-reconnect handled by browser EventSource
    };
  }

  /**
   * Execute command dispatched from remote sender on this receiver
   * @param {Object} cmd
   */
  handleRemoteCommand(cmd) {
    if (!cmd || !cmd.type) return;

    if (cmd.type === 'playTrack' && cmd.payload) {
      if (window.playPreviewAudio) {
        window.playPreviewAudio(cmd.payload);
      }
      // Switch to Ambient Fullscreen on TV if available
      const ambientBtn = document.getElementById('btn-ambient-toggle');
      if (ambientBtn && !document.getElementById('tv-ambient-player')?.classList.contains('active')) {
        ambientBtn.click();
      }
    } else if (cmd.type === 'pause') {
      const audio = document.getElementById('preview-audio');
      if (audio) audio.pause();
    } else if (cmd.type === 'play') {
      const audio = document.getElementById('preview-audio');
      if (audio) audio.play().catch(() => {});
    } else if (cmd.type === 'seek' && cmd.payload) {
      const audio = document.getElementById('preview-audio');
      if (audio && typeof cmd.payload.position === 'number') {
        audio.currentTime = cmd.payload.position;
      }
    } else if (cmd.type === 'setVolume' && cmd.payload) {
      const audio = document.getElementById('preview-audio');
      if (audio && typeof cmd.payload.volume === 'number') {
        audio.volume = Math.max(0, Math.min(1, cmd.payload.volume / 100));
      }
    }
  }

  /**
   * Fetch active receivers on local network
   */
  async fetchReceivers() {
    try {
      const res = await fetch('/api/connect/receivers');
      const data = await res.json();
      return (data.success && data.receivers) || [];
    } catch (_e) {
      return [];
    }
  }

  /**
   * Pair with a TV receiver using PIN
   * @param {string} pin
   * @param {string} [receiverId]
   */
  async pairWithPin(pin, receiverId) {
    try {
      const res = await fetch('/api/connect/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, receiverId })
      });
      const data = await res.json();
      if (data.success) {
        this.activeReceiver = {
          receiverId: data.receiverId,
          name: data.name,
          token: data.token
        };
        try {
          localStorage.setItem('tuneflow_connect_paired', JSON.stringify(this.activeReceiver));
        } catch (_e) {}
        this.updateCastButtonUI();
        return { success: true, receiver: this.activeReceiver };
      }
      return { success: false, error: data.error };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Disconnect from paired TV
   */
  disconnect() {
    this.activeReceiver = null;
    try {
      localStorage.removeItem('tuneflow_connect_paired');
    } catch (_e) {}
    this.updateCastButtonUI();
  }

  /**
   * Cast a playback command to the paired TV receiver
   * @param {string} type
   * @param {Object} [payload]
   */
  async castCommand(type, payload = {}) {
    if (!this.activeReceiver) return false;

    try {
      const res = await fetch('/api/connect/cast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: this.activeReceiver.receiverId,
          command: { type, payload }
        })
      });
      const data = await res.json();
      return data.success;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Update Cast button UI in player bar
   */
  updateCastButtonUI() {
    const castBtn = document.getElementById('btn-connect-cast');
    if (!castBtn) return;

    if (this.activeReceiver) {
      castBtn.classList.add('active');
      castBtn.style.color = 'var(--accent-gold)';
      castBtn.title = `Đang phát lên: ${this.activeReceiver.name} (Bấm để ngắt kết nối)`;
    } else {
      castBtn.classList.remove('active');
      castBtn.style.color = '';
      castBtn.title = 'Phát nhạc lên TV (TuneFlow Connect)';
    }
  }

  /**
   * Activate TV Receiver Mode display
   */
  async activateReceiverMode() {
    const receiver = await this.registerAsReceiver('TV Phòng Khách');
    if (!receiver) return;

    // Show prominent pairing banner or ambient player
    const ambientPlayer = document.getElementById('tv-ambient-player');
    const ambientTitle = document.getElementById('ambient-title');
    const ambientArtist = document.getElementById('ambient-artist');

    if (ambientTitle && ambientArtist) {
      ambientTitle.textContent = `Mã Ghép Nối TV: ${receiver.pin}`;
      ambientArtist.textContent = `Quét mã hoặc nhập mã PIN ${receiver.pin} trên điện thoại để phát nhạc`;
    }

    if (ambientPlayer) {
      ambientPlayer.classList.remove('hidden');
      ambientPlayer.classList.add('active');
    }
  }
}

// Global instance
window.tuneflowConnect = new TuneFlowConnectClient();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TuneFlowConnectClient };
}
