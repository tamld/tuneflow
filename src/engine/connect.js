/**
 * TuneFlow Connect Hub (Issue #134)
 * 100% Self-hosted local LAN device pairing & remote casting protocol.
 * Eliminates 10-foot TV remote keyboard typing hell for seniors.
 */

const crypto = require('crypto');

class TuneFlowConnectHub {
  constructor() {
    this.receivers = new Map();
    this.commandHistory = new Map(); // receiverId -> Array of commands
  }

  /**
   * Register a new receiver (e.g. Android TV or Desktop Leanback)
   * @param {Object} options
   * @param {string} [options.name] Friendly room name (e.g. "TV Phòng Khách")
   * @param {string} [options.userAgent] Device user agent
   * @returns {Object} Receiver credentials { receiverId, pin, name, registeredAt }
   */
  registerReceiver({ name = 'TV Phòng Khách', userAgent = '' } = {}) {
    const receiverId = `rcv_${crypto.randomBytes(6).toString('hex')}`;
    // 4-digit PIN between 1000 and 9999
    const pin = Math.floor(1000 + Math.random() * 9000).toString();

    const receiver = {
      receiverId,
      pin,
      name: (name || 'TV Phòng Khách').trim(),
      userAgent,
      registeredAt: Date.now(),
      lastSeen: Date.now(),
      sseClients: new Set(),
      state: {
        isPlaying: false,
        currentTrack: null,
        position: 0,
        duration: 0,
        volume: 100
      }
    };

    this.receivers.set(receiverId, receiver);
    this.commandHistory.set(receiverId, []);

    return {
      receiverId,
      pin,
      name: receiver.name,
      registeredAt: receiver.registeredAt
    };
  }

  /**
   * Get all active receivers for public local LAN discovery
   * Never leaks PIN in public discovery!
   * @returns {Array<Object>}
   */
  getActiveReceivers() {
    const now = Date.now();
    const active = [];

    for (const [id, rcv] of this.receivers.entries()) {
      if (now - rcv.lastSeen <= 10 * 60 * 1000) {
        active.push({
          receiverId: id,
          name: rcv.name,
          state: rcv.state,
          registeredAt: rcv.registeredAt,
          lastSeen: rcv.lastSeen
        });
      }
    }

    return active;
  }

  /**
   * Pair with a receiver using the 4-digit PIN code
   * @param {Object} params
   * @param {string} params.pin 4-digit PIN code
   * @param {string} [params.receiverId] Optional specific receiver ID
   * @returns {Object} Result { success, receiverId, name, token, error }
   */
  pair({ pin, receiverId } = {}) {
    if (!pin) {
      return { success: false, error: 'Vui lòng nhập mã PIN 4 chữ số' };
    }

    const cleanPin = pin.toString().trim();
    let targetReceiver = null;

    if (receiverId && this.receivers.has(receiverId)) {
      const candidate = this.receivers.get(receiverId);
      if (candidate.pin === cleanPin) {
        targetReceiver = candidate;
      }
    } else {
      for (const rcv of this.receivers.values()) {
        if (rcv.pin === cleanPin) {
          targetReceiver = rcv;
          break;
        }
      }
    }

    if (!targetReceiver) {
      return {
        success: false,
        error: 'Mã PIN không chính xác hoặc phòng chiếu trên TV đã hết hạn'
      };
    }

    targetReceiver.lastSeen = Date.now();
    const token = crypto.randomBytes(16).toString('hex');

    return {
      success: true,
      receiverId: targetReceiver.receiverId,
      name: targetReceiver.name,
      token
    };
  }

  /**
   * Subscribe an Express HTTP response stream to Server-Sent Events for a receiver
   * @param {string} receiverId
   * @param {Object} res Express response object
   */
  subscribeEvents(receiverId, res) {
    const rcv = this.receivers.get(receiverId);
    if (!rcv) return false;

    rcv.lastSeen = Date.now();
    rcv.sseClients.add(res);

    if (typeof res.on === 'function') {
      res.on('close', () => {
        rcv.sseClients.delete(res);
      });
    }

    // Send connected acknowledgment
    try {
      res.write(`data: ${JSON.stringify({ type: 'connected', receiverId })}\n\n`);
    } catch (_e) {}

    return true;
  }

  /**
   * Dispatch playback / queue command from mobile remote to receiver
   * @param {string} receiverId
   * @param {Object} command
   * @returns {Object} Result { success, error }
   */
  dispatchCommand(receiverId, command) {
    const rcv = this.receivers.get(receiverId);
    if (!rcv) {
      return { success: false, error: 'Thiết bị nhận (TV) không tồn tại hoặc đã ngắt kết nối' };
    }

    rcv.lastSeen = Date.now();
    const cmd = {
      ...command,
      timestamp: Date.now()
    };

    // Update internal receiver state mirror
    if (cmd.type === 'playTrack' && cmd.payload) {
      rcv.state.currentTrack = cmd.payload;
      rcv.state.isPlaying = true;
      rcv.state.position = 0;
      if (cmd.payload.durationSec) {
        rcv.state.duration = cmd.payload.durationSec;
      }
    } else if (cmd.type === 'pause') {
      rcv.state.isPlaying = false;
    } else if (cmd.type === 'play') {
      rcv.state.isPlaying = true;
    } else if (cmd.type === 'seek' && cmd.payload && typeof cmd.payload.position === 'number') {
      rcv.state.position = cmd.payload.position;
    } else if (cmd.type === 'setVolume' && cmd.payload && typeof cmd.payload.volume === 'number') {
      rcv.state.volume = Math.max(0, Math.min(100, cmd.payload.volume));
    }

    // Record in history for polling fallbacks
    const history = this.commandHistory.get(receiverId) || [];
    history.push(cmd);
    if (history.length > 50) history.shift();
    this.commandHistory.set(receiverId, history);

    // Broadcast via SSE to all active receiver connections
    const payload = `data: ${JSON.stringify(cmd)}\n\n`;
    for (const client of rcv.sseClients) {
      try {
        client.write(payload);
      } catch (_e) {
        rcv.sseClients.delete(client);
      }
    }

    return { success: true, command: cmd };
  }

  /**
   * Get current state of a receiver
   * @param {string} receiverId
   * @returns {Object|null}
   */
  getState(receiverId) {
    const rcv = this.receivers.get(receiverId);
    if (!rcv) return null;
    rcv.lastSeen = Date.now();
    return { ...rcv.state };
  }

  /**
   * Update state directly from receiver playback events
   * @param {string} receiverId
   * @param {Object} stateUpdate
   */
  updateState(receiverId, stateUpdate = {}) {
    const rcv = this.receivers.get(receiverId);
    if (!rcv) return false;

    rcv.lastSeen = Date.now();
    rcv.state = {
      ...rcv.state,
      ...stateUpdate
    };
    return true;
  }

  /**
   * Periodic pruning of inactive receivers
   * @param {number} maxAgeMs
   */
  cleanupInactive(maxAgeMs = 10 * 60 * 1000) {
    const now = Date.now();
    for (const [id, rcv] of this.receivers.entries()) {
      if (now - rcv.lastSeen > maxAgeMs) {
        for (const client of rcv.sseClients) {
          try {
            client.end();
          } catch (_e) {}
        }
        this.receivers.delete(id);
        this.commandHistory.delete(id);
      }
    }
  }
}

// Global singleton instance
const defaultHub = new TuneFlowConnectHub();

module.exports = {
  TuneFlowConnectHub,
  connectHub: defaultHub
};
