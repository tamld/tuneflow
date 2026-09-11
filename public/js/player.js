/**
 * In-App Preview Audio Player for TuneFlow (SilverMelody UX)
 * Features: Volume cycle, Repeat mode, Sleep timer, MediaSession API, Continuous playback
 */
class PreviewPlayer {
  constructor() {
    this.audio = new Audio();
    this.currentTrack = null;
    this.isPlaying = false;
    this.isLoading = false;

    // Audio Control State
    this.volumeLevels = [1.0, 0.6, 0.3];
    this.volumeIcons = ['🔊', '🔉', '🔈'];
    this.volumeIndex = 0;
    this.isLooping = false;
    this.sleepTimerId = null;
    this.sleepFadeTimerId = null;
    this.fadeIntervalId = null;
    this.originalVolumeBeforeFade = null;
    this.sleepMinutes = 0;

    // Web Audio API State (Phase 5: Hybrid Client-Side Compute)
    this.audioCtx = null;
    this.sourceNode = null;
    this.lowFilter = null;
    this.midFilter = null;
    this.highFilter = null;
    this.gainNode = null;
    this.compressorNode = null;
    this.analyserNode = null;
    this.dataArray = null;
    this.visualizerAnimId = null;

    // EQ Presets: standard | clarity (voice boost) | warm (bolero/relax)
    this.eqPresets = ['standard', 'clarity', 'warm'];
    this.eqLabels = {
      standard: { icon: '🎛️', name: 'Chuẩn', desc: 'Âm thanh cân bằng tự nhiên' },
      clarity: { icon: '🗣️', name: 'Trong Rõ', desc: 'Tăng cường giọng ca, giảm ù rè' },
      warm: { icon: '☕', name: 'Trầm Ấm', desc: 'Dày dặn, êm ái cho Bolero & Thư giãn' }
    };
    this.eqIndex = 0;

    // Volume Boost Levels: 1.0 (100%), 1.25 (125%), 1.5 (150%)
    this.boostLevels = [1.0, 1.25, 1.5];
    this.boostIndex = 0;

    // DOM Elements
    this.playerContainer = document.getElementById('bottom-player');
    this.trackTitle = document.getElementById('player-track-title');
    this.trackStatus = document.getElementById('player-track-status');
    this.btnPlayPause = document.getElementById('btn-player-play-pause');
    this.progressBar = document.getElementById('player-progress');
    this.timeCurrent = document.getElementById('player-time-current');
    this.timeTotal = document.getElementById('player-time-total');
    this.btnRepeat = document.getElementById('btn-player-repeat');
    this.btnVolume = document.getElementById('btn-player-volume');
    this.btnSleep = document.getElementById('btn-player-sleep');
    this.btnEq = document.getElementById('btn-player-eq');
    this.btnBoost = document.getElementById('btn-player-boost');
    this.visualizerCanvas = document.getElementById('player-visualizer');
    this.visualizerCtx = this.visualizerCanvas ? this.visualizerCanvas.getContext('2d') : null;

    // iOS WebKit Environment Detection (Issue #88)
    this.isIOS = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    // Picture-in-Picture (PiP) State (Issue #88)
    this.btnPip = document.getElementById('btn-player-pip');
    this.pipVideo = document.getElementById('player-pip-video');
    this.pipCanvas = document.createElement('canvas');
    this.pipCanvas.width = 512;
    this.pipCanvas.height = 512;
    this.pipCtx = this.pipCanvas ? this.pipCanvas.getContext('2d') : null;
    this.pipStream = null;
    this.isPipActive = false;
    this.pipThumbnailImg = null;
    this.lastPipProgressRender = 0;
    this.lastPositionSyncTime = 0;

    this.bindEvents();
  }

  bindEvents() {
    if (this.btnPlayPause) {
      this.btnPlayPause.addEventListener('click', () => this.togglePlay());
    }

    if (this.btnRepeat) {
      this.btnRepeat.addEventListener('click', () => this.toggleRepeat());
    }

    if (this.btnVolume) {
      this.btnVolume.addEventListener('click', () => this.cycleVolume());
    }

    if (this.btnSleep) {
      this.btnSleep.addEventListener('click', () => this.cycleSleepTimer());
    }

    if (this.btnEq) {
      this.btnEq.addEventListener('click', () => this.cycleEq());
    }

    if (this.btnBoost) {
      this.btnBoost.addEventListener('click', () => this.cycleBoost());
    }

    if (this.btnPip) {
      this.btnPip.addEventListener('click', () => this.togglePip());
    }

    if (this.pipVideo) {
      this.pipVideo.addEventListener('enterpictureinpicture', () => {
        this.isPipActive = true;
        this.updatePipBtnState();
      });
      this.pipVideo.addEventListener('leavepictureinpicture', () => {
        this.isPipActive = false;
        this.updatePipBtnState();
      });
      this.pipVideo.addEventListener('webkitpresentationmodechanged', () => {
        this.isPipActive = (this.pipVideo.webkitPresentationMode === 'picture-in-picture');
        this.updatePipBtnState();
      });
    }

    // Page Visibility & Lifecycle Guard (Issue #88)
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          // Sync UI with audio state when returning from background
          if (this.audio && !this.audio.paused && !this.isPlaying) {
            this.isPlaying = true;
            this.updatePlayPauseIcon();
            this.updateCardState();
            this.updateMediaSessionPlaybackState();
          } else if (this.audio && this.audio.paused && this.isPlaying) {
            this.isPlaying = false;
            this.updatePlayPauseIcon();
            this.updateCardState();
            this.updateMediaSessionPlaybackState();
          }
          if (this.audioCtx && this.audioCtx.state === 'suspended' && this.isPlaying) {
            this.audioCtx.resume().catch(() => {});
          }
        }
      });
    }

    this.audio.addEventListener('timeupdate', () => {
      if (!isNaN(this.audio.duration)) {
        const pct = (this.audio.currentTime / this.audio.duration) * 100;
        if (this.progressBar) this.progressBar.value = pct || 0;
        if (this.timeCurrent) this.timeCurrent.textContent = this.formatTime(this.audio.currentTime);
        if (this.timeTotal) this.timeTotal.textContent = this.formatTime(this.audio.duration);

        // Throttle position state update for Lock Screen & Control Center
        const now = Date.now();
        if (now - this.lastPositionSyncTime > 1500) {
          this.lastPositionSyncTime = now;
          this.updateMediaSessionPositionState();
        }

        // Throttle PiP canvas rendering to 1s intervals during playback
        if (this.isPipActive && now - this.lastPipProgressRender > 1000) {
          this.lastPipProgressRender = now;
          this.renderPipCanvas();
        }
      }
    });

    if (this.progressBar) {
      this.progressBar.addEventListener('input', () => {
        if (!isNaN(this.audio.duration)) {
          this.audio.currentTime = (this.progressBar.value / 100) * this.audio.duration;
        }
      });
    }

    this.audio.addEventListener('ended', () => {
      if (this.isLooping) {
        this.audio.currentTime = 0;
        this.audio.play();
        return;
      }

      this.isPlaying = false;
      this.stopVisualizer();
      this.updatePlayPauseIcon();
      this.updateCardState();
      this.trackStatus.textContent = 'Đã nghe hết bài';

      // Continuous Playback: Advance to next track if hook exists
      if (typeof window.playNextTrack === 'function') {
        window.playNextTrack();
      }
    });

    this.audio.addEventListener('error', () => {
      this.isPlaying = false;
      this.stopVisualizer();
      this.updatePlayPauseIcon();
      this.updateCardState();
      this.trackStatus.textContent = 'Dạ bài này đang bị giới hạn, Bố Mẹ thử chọn bài khác nhé!';
    });
  }

  /**
   * Initialize Web Audio API node graph lazily on first audio interaction
   * @param {boolean} force - Force initialization even on iOS (e.g. on explicit user EQ adjustment)
   */
  initWebAudio(force = false) {
    if (this.isIOS && !force) {
      // On iOS WebKit, routing HTML5 audio into AudioContext causes Apple to suspend playback
      // as soon as the screen locks or app goes to background. Leave audio flowing direct to hardware.
      return;
    }

    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);

      // 3-Band Biquad Filter Equalizer
      this.lowFilter = this.audioCtx.createBiquadFilter();
      this.lowFilter.type = 'lowshelf';
      this.lowFilter.frequency.value = 250;
      this.lowFilter.gain.value = 0;

      this.midFilter = this.audioCtx.createBiquadFilter();
      this.midFilter.type = 'peaking';
      this.midFilter.frequency.value = 3000;
      this.midFilter.Q.value = 1.0;
      this.midFilter.gain.value = 0;

      this.highFilter = this.audioCtx.createBiquadFilter();
      this.highFilter.type = 'highshelf';
      this.highFilter.frequency.value = 6000;
      this.highFilter.gain.value = 0;

      // Gain Booster & Compressor (Anti-Clipping Protection)
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = this.boostLevels[this.boostIndex];

      this.compressorNode = this.audioCtx.createDynamicsCompressor();
      this.compressorNode.threshold.value = -12;
      this.compressorNode.knee.value = 20;
      this.compressorNode.ratio.value = 6;
      this.compressorNode.attack.value = 0.003;
      this.compressorNode.release.value = 0.25;

      // Real-time Visualizer Analyser
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 64;
      this.analyserNode.smoothingTimeConstant = 0.8;
      this.dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

      // Connect DSP pipeline: source -> low -> mid -> high -> gain -> compressor -> analyser -> speakers
      this.sourceNode.connect(this.lowFilter);
      this.lowFilter.connect(this.midFilter);
      this.midFilter.connect(this.highFilter);
      this.highFilter.connect(this.gainNode);
      this.gainNode.connect(this.compressorNode);
      this.compressorNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);

      this.applyEq();
    } catch (e) {
      console.warn('Web Audio API initialization fallback to direct audio:', e);
    }
  }

  applyEq() {
    if (!this.lowFilter || !this.midFilter || !this.highFilter) return;
    const current = this.eqPresets[this.eqIndex];

    if (current === 'clarity') {
      // Voice clarity: Low cut -3dB, Vocal presence +4.5dB, Air +2dB
      this.lowFilter.gain.value = -3.0;
      this.midFilter.gain.value = 4.5;
      this.highFilter.gain.value = 2.0;
    } else if (current === 'warm') {
      // Warm Bolero: Warm low +4dB, Neutral mid, Gentle high roll-off -2dB
      this.lowFilter.gain.value = 4.0;
      this.midFilter.gain.value = 0.0;
      this.highFilter.gain.value = -2.0;
    } else {
      // Standard Flat
      this.lowFilter.gain.value = 0.0;
      this.midFilter.gain.value = 0.0;
      this.highFilter.gain.value = 0.0;
    }
  }

  cycleEq() {
    this.initWebAudio(true);
    this.eqIndex = (this.eqIndex + 1) % this.eqPresets.length;
    const presetKey = this.eqPresets[this.eqIndex];
    const info = this.eqLabels[presetKey];
    this.applyEq();

    if (this.btnEq) {
      this.btnEq.textContent = info.icon;
      this.btnEq.title = `Bộ chỉnh âm: ${info.name} (${info.desc})`;
      this.btnEq.classList.toggle('active', presetKey !== 'standard');
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`${info.icon} Chỉnh âm: ${info.name} — ${info.desc}`, 'info');
    }
  }

  cycleBoost() {
    this.initWebAudio(true);
    this.boostIndex = (this.boostIndex + 1) % this.boostLevels.length;
    const level = this.boostLevels[this.boostIndex];
    const pct = Math.round(level * 100);

    if (this.gainNode) {
      this.gainNode.gain.value = level;
    }

    if (this.btnBoost) {
      this.btnBoost.classList.toggle('boosted', level > 1.0);
      this.btnBoost.title = `Khuếch đại âm lượng: ${pct}% (Bấm để đổi)`;
      this.btnBoost.textContent = level > 1.0 ? `⚡${pct}%` : '⚡';
    }

    if (typeof window.showToast === 'function') {
      window.showToast(`⚡ Khuếch đại âm thanh: ${pct}%${level > 1.0 ? ' (Đã bật chống rè loa)' : ''}`, 'info');
    }
  }

  startVisualizer() {
    if (!this.visualizerCanvas || !this.visualizerCtx || !this.analyserNode) return;
    if (this.visualizerAnimId) window.cancelAnimationFrame(this.visualizerAnimId);

    const render = () => {
      if (!this.isPlaying) return;
      this.visualizerAnimId = window.requestAnimationFrame(render);

      this.analyserNode.getByteFrequencyData(this.dataArray);
      const ctx = this.visualizerCtx;
      const width = this.visualizerCanvas.width;
      const height = this.visualizerCanvas.height;

      ctx.clearRect(0, 0, width, height);

      const barCount = 10;
      const barWidth = (width / barCount) - 2;
      const step = Math.floor(this.dataArray.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = this.dataArray[i * step] || 0;
        const barHeight = Math.max(3, (val / 255) * height);
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Gold to Emerald gradient
        ctx.fillStyle = i % 2 === 0 ? '#e6b800' : '#2b825b';
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    render();
  }

  stopVisualizer() {
    if (this.visualizerAnimId) {
      window.cancelAnimationFrame(this.visualizerAnimId);
      this.visualizerAnimId = null;
    }
    if (this.visualizerCtx && this.visualizerCanvas) {
      this.visualizerCtx.clearRect(0, 0, this.visualizerCanvas.width, this.visualizerCanvas.height);
    }
  }

  playTrack(track) {
    if (this.currentTrack && this.currentTrack.id === track.id) {
      if (this.isLoading) {
        // Prevent double-click disruption during stream handshake (Issue #70)
        return;
      }
      this.togglePlay();
      return;
    }

    this.currentTrack = track;
    this.isLoading = true;
    this.isPlaying = false;

    if (this.playerContainer) this.playerContainer.classList.add('visible');
    if (this.trackTitle) this.trackTitle.textContent = `${track.title} - ${track.uploader || ''}`;
    if (this.trackStatus) this.trackStatus.textContent = '⏳ Đang kết nối luồng nhạc...';

    // Highlight loading card on UI & reset other cards immediately
    this.resetAllCards();
    this.highlightCard(track.id, false, true);
    this.updatePlayPauseIcon();

    // Preload thumbnail for PiP canvas & MediaSession
    if (track.thumbnail && typeof window !== 'undefined' && window.Image) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.pipThumbnailImg = img;
        if (this.isPipActive) this.renderPipCanvas();
      };
      img.src = track.thumbnail;
    } else {
      this.pipThumbnailImg = null;
    }

    // Load stream from backend preview route (HTML5 audio auto-loads on src assignment)
    this.audio.src = `/api/preview/${track.id}`;

    this.audio.play().then(() => {
      this.isLoading = false;
      this.isPlaying = true;
      this.initWebAudio(false);
      this.startVisualizer();
      if (this.trackStatus) this.trackStatus.textContent = '🟢 Đang nghe thử trực tiếp...';
      this.updatePlayPauseIcon();
      this.updateCardState();
      this.setupMediaSession(track);
      if (this.isPipActive) this.renderPipCanvas();
    }).catch((err) => {
      this.isLoading = false;
      if (err && err.name === 'AbortError') {
        return;
      }
      this.isPlaying = false;
      this.stopVisualizer();
      if (this.trackStatus) this.trackStatus.textContent = 'Bấm nút Play để bắt đầu nghe thử';
      this.updatePlayPauseIcon();
      this.updateCardState();
      this.updateMediaSessionPlaybackState();
    });
  }

  togglePlay() {
    if (!this.audio.src) return;
    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      this.stopVisualizer();
      if (this.trackStatus) this.trackStatus.textContent = 'Tạm dừng nghe thử';
    } else {
      if (this.audio.ended) {
        this.audio.currentTime = 0;
      }
      this.audio.play().then(() => {
        this.initWebAudio(false);
        this.startVisualizer();
      }).catch(() => {});
      this.isPlaying = true;
      if (this.trackStatus) this.trackStatus.textContent = '🟢 Đang nghe thử trực tiếp...';
    }
    this.updatePlayPauseIcon();
    this.updateCardState();
    this.updateMediaSessionPlaybackState();
    if (this.isPipActive) this.renderPipCanvas();
  }

  resetAllCards() {
    document.querySelectorAll('.song-card').forEach(card => {
      card.classList.remove('playing');
      card.classList.remove('loading');
      const btn = card.querySelector('.btn-preview');
      if (btn) btn.innerHTML = '▶️ Nghe Thử Trước';
      const icon = card.querySelector('.play-icon-overlay');
      if (icon) icon.textContent = '▶';
    });
    document.querySelectorAll('.playlist-item-row').forEach(row => {
      row.classList.remove('playing');
      row.classList.remove('loading');
      const btn = row.querySelector('.btn-preview');
      if (btn) btn.innerHTML = '▶️ Nghe';
      const icon = row.querySelector('.playlist-play-icon-overlay');
      if (icon) icon.textContent = '▶';
    });
    if (typeof window.updatePlaylistPlayButtonState === 'function') {
      window.updatePlaylistPlayButtonState();
    }
  }

  highlightCard(trackId, isPlaying, isLoading = false) {
    const card = document.getElementById(`card-${trackId}`);
    if (card) {
      card.classList.toggle('playing', isPlaying);
      card.classList.toggle('loading', isLoading);
      const btn = card.querySelector('.btn-preview');
      if (btn) {
        if (isLoading) {
          btn.innerHTML = '⏳ Đang tải...';
        } else {
          btn.innerHTML = isPlaying ? '⏸️ Tạm Dừng' : '▶️ Tiếp Tục Nghe';
        }
      }
      const icon = card.querySelector('.play-icon-overlay');
      if (icon) {
        icon.textContent = isLoading ? '⏳' : (isPlaying ? '⏸' : '▶');
      }
    }

    const plRow = document.getElementById(`playlist-row-${trackId}`);
    if (plRow) {
      plRow.classList.toggle('playing', isPlaying);
      plRow.classList.toggle('loading', isLoading);
      const btn = plRow.querySelector('.btn-preview');
      if (btn) {
        if (isLoading) {
          btn.innerHTML = '⏳ Đang tải...';
        } else {
          btn.innerHTML = isPlaying ? '⏸️ Dừng' : '▶️ Nghe';
        }
      }
      const icon = plRow.querySelector('.playlist-play-icon-overlay');
      if (icon) {
        icon.textContent = isLoading ? '⏳' : (isPlaying ? '⏸' : '▶');
      }
    }
  }

  updateCardState() {
    if (!this.currentTrack) return;
    this.highlightCard(this.currentTrack.id, this.isPlaying, this.isLoading);
    if (typeof window.updatePlaylistPlayButtonState === 'function') {
      window.updatePlaylistPlayButtonState();
    }
  }

  toggleRepeat() {
    this.isLooping = !this.isLooping;
    this.audio.loop = this.isLooping;
    if (this.btnRepeat) {
      this.btnRepeat.classList.toggle('active', this.isLooping);
      this.btnRepeat.title = this.isLooping 
        ? 'Lặp lại bài hát: Đang BẬT (Bấm để tắt)' 
        : 'Lặp lại bài hát: Đang TẮT (Bấm để bật)';
    }
    if (typeof window.showToast === 'function') {
      window.showToast(this.isLooping ? '🔁 Đã bật chế độ lặp lại bài hát!' : '➡️ Đã tắt lặp lại bài hát', 'info');
    }
  }

  cycleVolume() {
    this.volumeIndex = (this.volumeIndex + 1) % this.volumeLevels.length;
    const vol = this.volumeLevels[this.volumeIndex];
    this.audio.volume = vol;
    const icon = this.volumeIcons[this.volumeIndex];
    const pct = Math.round(vol * 100);
    if (this.btnVolume) {
      this.btnVolume.textContent = icon;
      this.btnVolume.title = `Âm lượng: ${pct}% (Bấm để đổi)`;
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`🔊 Đã chỉnh âm lượng: ${pct}%`, 'info');
    }
  }

  togglePlayPause() {
    this.togglePlay();
  }

  toggleMute() {
    if (!this.audio) return;
    this.audio.muted = !this.audio.muted;
    if (this.btnVolume) {
      if (this.audio.muted) {
        this.btnVolume.textContent = '🔇';
        this.btnVolume.title = 'Âm lượng: Đang tắt tiếng (Bấm để bật)';
      } else {
        const icon = this.volumeIcons[this.volumeIndex] || '🔊';
        const pct = Math.round(this.audio.volume * 100);
        this.btnVolume.textContent = icon;
        this.btnVolume.title = `Âm lượng: ${pct}% (Bấm để đổi)`;
      }
    }
    if (typeof window.showToast === 'function') {
      window.showToast(this.audio.muted ? '🔇 Đã tắt tiếng' : '🔊 Đã bật âm thanh', 'info');
    }
  }

  seekAudio(offsetSeconds) {
    if (!this.audio || isNaN(this.audio.duration)) return;
    const newTime = Math.max(0, Math.min(this.audio.duration, this.audio.currentTime + offsetSeconds));
    this.audio.currentTime = newTime;
    if (this.progressBar && this.audio.duration > 0) {
      this.progressBar.value = (newTime / this.audio.duration) * 100;
    }
    if (this.timeCurrent) {
      this.timeCurrent.textContent = this.formatTime(newTime);
    }
    this.updateMediaSessionPositionState();
  }

  adjustVolume(delta) {
    if (!this.audio) return;
    if (this.audio.muted && delta > 0) {
      this.audio.muted = false;
    }
    let newVol = Math.max(0, Math.min(1.0, this.audio.volume + delta));
    newVol = Math.round(newVol * 100) / 100;
    this.audio.volume = newVol;
    const pct = Math.round(newVol * 100);
    if (this.btnVolume) {
      this.btnVolume.textContent = newVol === 0 ? '🔇' : (newVol > 0.5 ? '🔊' : '🔉');
      this.btnVolume.title = `Âm lượng: ${pct}% (Bấm để đổi)`;
    }
    if (typeof window.showToast === 'function') {
      window.showToast(`🔊 Âm lượng: ${pct}%`, 'info');
    }
  }

  formatSleepLabel(mins) {
    if (!mins) return 'Tắt';
    if (mins >= 60) {
      const hours = mins / 60;
      return `${hours}h`;
    }
    return `${mins}m`;
  }

  clearSleepTimers() {
    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }
    if (this.sleepFadeTimerId) {
      clearTimeout(this.sleepFadeTimerId);
      this.sleepFadeTimerId = null;
    }
    if (this.fadeIntervalId) {
      clearInterval(this.fadeIntervalId);
      this.fadeIntervalId = null;
    }
    if (this.originalVolumeBeforeFade !== null) {
      this.audio.volume = this.originalVolumeBeforeFade;
      this.originalVolumeBeforeFade = null;
    }
  }

  cycleSleepTimer() {
    const sleepOptions = [0, 15, 30, 60, 120, 240];
    const currentIdx = sleepOptions.indexOf(this.sleepMinutes);
    const nextIdx = (currentIdx + 1) % sleepOptions.length;
    this.sleepMinutes = sleepOptions[nextIdx];

    this.clearSleepTimers();

    if (this.sleepMinutes > 0) {
      const label = this.formatSleepLabel(this.sleepMinutes);
      const totalMs = this.sleepMinutes * 60 * 1000;
      const fadeDurationMs = Math.min(30000, totalMs);
      const fadeStartDelay = Math.max(0, totalMs - fadeDurationMs);

      // Start fade-out timer 30s before final stop
      this.sleepFadeTimerId = setTimeout(() => {
        if (!this.isPlaying) return;
        const initialVol = this.audio.volume;
        this.originalVolumeBeforeFade = initialVol;
        const steps = 30;
        const stepMs = fadeDurationMs / steps;
        let currentStep = 0;

        this.fadeIntervalId = setInterval(() => {
          currentStep++;
          const newVol = Math.max(0, initialVol * (1 - currentStep / steps));
          this.audio.volume = newVol;
          if (currentStep >= steps) {
            clearInterval(this.fadeIntervalId);
            this.fadeIntervalId = null;
          }
        }, stepMs);
      }, fadeStartDelay);

      // Final stop timer
      this.sleepTimerId = setTimeout(() => {
        if (this.fadeIntervalId) {
          clearInterval(this.fadeIntervalId);
          this.fadeIntervalId = null;
        }
        if (this.isPlaying) {
          this.audio.pause();
          this.isPlaying = false;
          this.updatePlayPauseIcon();
          if (this.trackStatus) this.trackStatus.textContent = '😴 Đã tắt nhạc theo hẹn giờ';
          if (typeof window.showToast === 'function') {
            window.showToast('😴 Hẹn giờ tắt nhạc: Chúc Bố Mẹ ngủ ngon!', 'success');
          }
        }
        if (this.originalVolumeBeforeFade !== null) {
          this.audio.volume = this.originalVolumeBeforeFade;
          this.originalVolumeBeforeFade = null;
        }
        this.sleepMinutes = 0;
        this.updateSleepBtn();
        if (this.btnSleep) this.btnSleep.classList.remove('active');
      }, totalMs);

      if (this.btnSleep) this.btnSleep.classList.add('active');
      if (typeof window.showToast === 'function') {
        window.showToast(`⏱️ Đã hẹn giờ tự động tắt nhạc sau ${label}`, 'info');
      }
    } else {
      if (this.btnSleep) this.btnSleep.classList.remove('active');
      if (typeof window.showToast === 'function') {
        window.showToast('⏱️ Đã tắt chế độ hẹn giờ', 'info');
      }
    }

    this.updateSleepBtn();
  }

  updateSleepBtn() {
    if (!this.btnSleep) return;
    if (this.sleepMinutes > 0) {
      const label = this.formatSleepLabel(this.sleepMinutes);
      this.btnSleep.textContent = `⏱️ ${label}`;
      this.btnSleep.title = `Hẹn giờ tắt nhạc: còn ${label} (Bấm để đổi)`;
    } else {
      this.btnSleep.textContent = '⏱️';
      this.btnSleep.title = 'Hẹn giờ tắt nhạc: Đang tắt (Bấm để bật 15m, 30m, 1h, 2h, 4h)';
    }
  }

  setupMediaSession(track) {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'TuneFlow',
        artist: track.uploader || 'Bố Mẹ Hay Nghe',
        album: 'TuneFlow SilverMelody',
        artwork: track.thumbnail ? [
          { src: track.thumbnail, sizes: '96x96', type: 'image/jpeg' },
          { src: track.thumbnail, sizes: '128x128', type: 'image/jpeg' },
          { src: track.thumbnail, sizes: '256x256', type: 'image/jpeg' },
          { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });

      this.updateMediaSessionPlaybackState();
      this.updateMediaSessionPositionState();

      navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const skip = (details && details.seekOffset) || 10;
        this.audio.currentTime = Math.max(0, this.audio.currentTime - skip);
        this.updateMediaSessionPositionState();
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const skip = (details && details.seekOffset) || 10;
        this.audio.currentTime = Math.min(this.audio.duration || 0, this.audio.currentTime + skip);
        this.updateMediaSessionPositionState();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details && details.seekTime !== undefined && !isNaN(details.seekTime)) {
          this.audio.currentTime = details.seekTime;
          this.updateMediaSessionPositionState();
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (typeof window.playPreviousTrack === 'function') window.playPreviousTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (typeof window.playNextTrack === 'function') window.playNextTrack();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.updatePlayPauseIcon();
        this.updateCardState();
        this.updateMediaSessionPlaybackState();
      });
    } catch (e) {
      console.warn('MediaSession setup failed:', e);
    }
  }

  updateMediaSessionPlaybackState() {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
      } catch (e) {}
    }
  }

  updateMediaSessionPositionState() {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        if (!isNaN(this.audio.duration) && this.audio.duration > 0) {
          navigator.mediaSession.setPositionState({
            duration: this.audio.duration,
            playbackRate: this.audio.playbackRate || 1.0,
            position: Math.min(this.audio.currentTime, this.audio.duration)
          });
        }
      } catch (e) {}
    }
  }

  /* ==========================================================================
     Picture-in-Picture (PiP) Floating Controller (Issue #88)
     ========================================================================== */

  renderPipCanvas() {
    if (!this.pipCtx) return;
    const ctx = this.pipCtx;
    const w = 512;
    const h = 512;

    // Dark sleek gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#121316');
    bgGrad.addColorStop(1, '#1e2029');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Accent gold border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    // Render Thumbnail or Musical Icon
    if (this.pipThumbnailImg && this.pipThumbnailImg.complete && this.pipThumbnailImg.naturalWidth > 0) {
      try {
        ctx.save();
        ctx.beginPath();
        ctx.arc(w / 2, 190, 110, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(this.pipThumbnailImg, w / 2 - 110, 80, 220, 220);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(w / 2, 190, 112, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.stroke();
      } catch (e) {
        this.renderPipFallbackIcon(ctx, w);
      }
    } else {
      this.renderPipFallbackIcon(ctx, w);
    }

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const title = this.currentTrack ? this.currentTrack.title : 'TuneFlow';
    const displayTitle = title.length > 28 ? title.slice(0, 26) + '...' : title;
    ctx.fillText(displayTitle, w / 2, 350);

    // Artist
    ctx.fillStyle = '#f59e0b';
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const artist = this.currentTrack ? (this.currentTrack.uploader || 'Bố Mẹ Hay Nghe') : 'SilverMelody';
    ctx.fillText(artist, w / 2, 390);

    // Status
    ctx.fillStyle = this.isPlaying ? '#10b981' : '#9ba1b0';
    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.fillText(this.isPlaying ? '▶ Đang phát' : '⏸ Đang tạm dừng', w / 2, 430);

    // Progress Bar Line
    if (this.audio && !isNaN(this.audio.duration) && this.audio.duration > 0) {
      const pct = Math.min(1, this.audio.currentTime / this.audio.duration);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(56, 460, 400, 8);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(56, 460, 400 * pct, 8);
    }
  }

  renderPipFallbackIcon(ctx, w) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = '100px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎶', w / 2, 220);
  }

  async togglePip() {
    if (!this.pipVideo) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        this.isPipActive = false;
        this.updatePipBtnState();
        return;
      }

      const canPip = ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) ||
        (this.pipVideo.webkitSupportsPresentationMode && this.pipVideo.webkitSupportsPresentationMode('picture-in-picture'));

      if (!canPip) {
        if (typeof window.showToast === 'function') {
          window.showToast('ℹ️ Thiết bị hoặc trình duyệt chưa hỗ trợ PiP cửa sổ nổi.', 'info');
        }
        return;
      }

      this.renderPipCanvas();

      if (!this.pipStream && this.pipCanvas && typeof this.pipCanvas.captureStream === 'function') {
        this.pipStream = this.pipCanvas.captureStream(10);
        this.pipVideo.srcObject = this.pipStream;
      }

      try {
        await this.pipVideo.play();
      } catch (e) {}

      if (this.pipVideo.requestPictureInPicture) {
        await this.pipVideo.requestPictureInPicture();
      } else if (this.pipVideo.webkitSetPresentationMode) {
        this.pipVideo.webkitSetPresentationMode('picture-in-picture');
      }

      this.isPipActive = true;
      this.updatePipBtnState();
      if (typeof window.showToast === 'function') {
        window.showToast('📺 Đã bật chế độ cửa sổ nổi (PiP)!', 'success');
      }
    } catch (err) {
      console.warn('Picture-in-Picture failed:', err);
      if (typeof window.showToast === 'function') {
        window.showToast('⚠️ Không thể bật PiP: ' + (err.message || 'Lỗi không xác định'), 'error');
      }
    }
  }

  updatePipBtnState() {
    if (this.btnPip) {
      this.btnPip.classList.toggle('pip-active', this.isPipActive);
      this.btnPip.title = this.isPipActive
        ? 'Chế độ cửa sổ nổi PiP: Đang BẬT (Bấm để tắt)'
        : 'Chế độ cửa sổ nổi (Picture-in-Picture) / PiP Mode';
    }
  }

  updatePlayPauseIcon() {
    if (this.btnPlayPause) {
      if (this.isLoading) {
        this.btnPlayPause.innerHTML = '⏳';
        this.btnPlayPause.title = 'Đang kết nối luồng nhạc...';
      } else {
        this.btnPlayPause.innerHTML = this.isPlaying ? '⏸️' : '▶️';
        this.btnPlayPause.title = this.isPlaying ? 'Tạm dừng nghe thử' : 'Tiếp tục nghe thử';
      }
    }
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

window.previewPlayer = new PreviewPlayer();
