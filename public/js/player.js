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
      this.updatePlayPauseIcon();
      this.updateCardState();
      this.trackStatus.textContent = 'Dạ bài này đang bị giới hạn, Bố Mẹ thử chọn bài khác nhé!';
    });
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
      if (this.trackStatus) this.trackStatus.textContent = '🟢 Đang nghe thử trực tiếp...';
      this.updatePlayPauseIcon();
      this.updateCardState();
      this.setupMediaSession(track);
    }).catch((err) => {
      if (err && err.name === 'AbortError') {
        return;
      }
      this.isPlaying = false;
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
      if (this.trackStatus) this.trackStatus.textContent = 'Tạm dừng nghe thử';
    } else {
      if (this.audio.ended) {
        this.audio.currentTime = 0;
      }
      this.audio.play();
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
