/**
 * In-App Preview Audio Player for TuneFlow (SilverMelody UX)
 * Features: Volume cycle, Repeat mode, Sleep timer, MediaSession API, Continuous playback
 */
class PreviewPlayer {
  constructor() {
    this.audio = new Audio();
    this.currentTrack = null;
    this.isPlaying = false;

    // Audio Control State
    this.volumeLevels = [1.0, 0.6, 0.3];
    this.volumeIcons = ['🔊', '🔉', '🔈'];
    this.volumeIndex = 0;
    this.isLooping = false;
    this.sleepTimerId = null;
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

    this.audio.addEventListener('timeupdate', () => {
      if (!isNaN(this.audio.duration)) {
        const pct = (this.audio.currentTime / this.audio.duration) * 100;
        if (this.progressBar) this.progressBar.value = pct || 0;
        if (this.timeCurrent) this.timeCurrent.textContent = this.formatTime(this.audio.currentTime);
        if (this.timeTotal) this.timeTotal.textContent = this.formatTime(this.audio.duration);
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
   */
  initWebAudio() {
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
    this.initWebAudio();
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
    this.initWebAudio();
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
      this.togglePlay();
      return;
    }

    this.currentTrack = track;
    if (this.playerContainer) this.playerContainer.classList.add('visible');
    if (this.trackTitle) this.trackTitle.textContent = `${track.title} - ${track.uploader || ''}`;
    if (this.trackStatus) this.trackStatus.textContent = 'Đang kết nối luồng nhạc...';

    // Highlight playing card on UI & reset other cards
    this.resetAllCards();
    this.highlightCard(track.id, true);

    // Load stream from backend preview route
    this.audio.src = `/api/preview/${track.id}`;
    this.audio.load();

    this.audio.play().then(() => {
      this.isPlaying = true;
      this.initWebAudio();
      this.startVisualizer();
      if (this.trackStatus) this.trackStatus.textContent = '🟢 Đang nghe thử trực tiếp...';
      this.updatePlayPauseIcon();
      this.updateCardState();
      this.setupMediaSession(track);
    }).catch((err) => {
      if (err && err.name === 'AbortError') {
        return;
      }
      this.isPlaying = false;
      this.stopVisualizer();
      if (this.trackStatus) this.trackStatus.textContent = 'Bấm nút Play để bắt đầu nghe thử';
      this.updatePlayPauseIcon();
      this.updateCardState();
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
        this.initWebAudio();
        this.startVisualizer();
      }).catch(() => {});
      this.isPlaying = true;
      if (this.trackStatus) this.trackStatus.textContent = '🟢 Đang nghe thử trực tiếp...';
    }
    this.updatePlayPauseIcon();
    this.updateCardState();
  }

  resetAllCards() {
    document.querySelectorAll('.song-card').forEach(card => {
      card.classList.remove('playing');
      const btn = card.querySelector('.btn-preview');
      if (btn) btn.innerHTML = '▶️ Nghe Thử Trước';
      const icon = card.querySelector('.play-icon-overlay');
      if (icon) icon.textContent = '▶';
    });
    document.querySelectorAll('.playlist-item-row').forEach(row => {
      row.classList.remove('playing');
      const btn = row.querySelector('.btn-preview');
      if (btn) btn.innerHTML = '▶️ Nghe';
      const icon = row.querySelector('.playlist-play-icon-overlay');
      if (icon) icon.textContent = '▶';
    });
  }

  highlightCard(trackId, isPlaying) {
    const card = document.getElementById(`card-${trackId}`);
    if (card) {
      card.classList.toggle('playing', isPlaying);
      const btn = card.querySelector('.btn-preview');
      if (btn) btn.innerHTML = isPlaying ? '⏸️ Tạm Dừng' : '▶️ Tiếp Tục Nghe';
      const icon = card.querySelector('.play-icon-overlay');
      if (icon) icon.textContent = isPlaying ? '⏸' : '▶';
    }

    const plRow = document.getElementById(`playlist-row-${trackId}`);
    if (plRow) {
      plRow.classList.toggle('playing', isPlaying);
      const btn = plRow.querySelector('.btn-preview');
      if (btn) btn.innerHTML = isPlaying ? '⏸️ Dừng' : '▶️ Nghe';
      const icon = plRow.querySelector('.playlist-play-icon-overlay');
      if (icon) icon.textContent = isPlaying ? '⏸' : '▶';
    }
  }

  updateCardState() {
    if (!this.currentTrack) return;
    this.highlightCard(this.currentTrack.id, this.isPlaying);
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

  cycleSleepTimer() {
    const sleepOptions = [0, 15, 30, 60];
    const currentIdx = sleepOptions.indexOf(this.sleepMinutes);
    const nextIdx = (currentIdx + 1) % sleepOptions.length;
    this.sleepMinutes = sleepOptions[nextIdx];

    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }

    if (this.sleepMinutes > 0) {
      this.sleepTimerId = setTimeout(() => {
        if (this.isPlaying) {
          this.audio.pause();
          this.isPlaying = false;
          this.updatePlayPauseIcon();
          if (this.trackStatus) this.trackStatus.textContent = '😴 Đã tắt nhạc theo hẹn giờ';
          if (typeof window.showToast === 'function') {
            window.showToast('😴 Hẹn giờ tắt nhạc: Chúc Bố Mẹ ngủ ngon!', 'success');
          }
        }
        this.sleepMinutes = 0;
        this.updateSleepBtn();
      }, this.sleepMinutes * 60 * 1000);

      if (this.btnSleep) this.btnSleep.classList.add('active');
      if (typeof window.showToast === 'function') {
        window.showToast(`⏱️ Đã hẹn giờ tự động tắt nhạc sau ${this.sleepMinutes} phút`, 'info');
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
      this.btnSleep.textContent = `⏱️ ${this.sleepMinutes}m`;
      this.btnSleep.title = `Hẹn giờ tắt nhạc: còn ${this.sleepMinutes} phút (Bấm để đổi)`;
    } else {
      this.btnSleep.textContent = '⏱️';
      this.btnSleep.title = 'Hẹn giờ tắt nhạc: Đang tắt (Bấm để bật 15p, 30p, 60p)';
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
          { src: track.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ] : []
      });

      navigator.mediaSession.setActionHandler('play', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlay());
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 10);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (typeof window.playPreviousTrack === 'function') window.playPreviousTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (typeof window.playNextTrack === 'function') window.playNextTrack();
      });
    } catch (e) {}
  }

  updatePlayPauseIcon() {
    if (this.btnPlayPause) {
      this.btnPlayPause.innerHTML = this.isPlaying ? '⏸️' : '▶️';
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
