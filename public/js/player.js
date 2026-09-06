/**
 * In-App Preview Audio Player for TuneFlow (SilverMelody UX)
 */
class PreviewPlayer {
  constructor() {
    this.audio = new Audio();
    this.currentTrack = null;
    this.isPlaying = false;

    // DOM Elements
    this.playerContainer = document.getElementById('bottom-player');
    this.trackTitle = document.getElementById('player-track-title');
    this.trackStatus = document.getElementById('player-track-status');
    this.btnPlayPause = document.getElementById('btn-player-play-pause');
    this.progressBar = document.getElementById('player-progress');
    this.timeCurrent = document.getElementById('player-time-current');
    this.timeTotal = document.getElementById('player-time-total');

    this.bindEvents();
  }

  bindEvents() {
    this.btnPlayPause.addEventListener('click', () => this.togglePlay());

    this.audio.addEventListener('timeupdate', () => {
      if (!isNaN(this.audio.duration)) {
        const pct = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressBar.value = pct || 0;
        this.timeCurrent.textContent = this.formatTime(this.audio.currentTime);
        this.timeTotal.textContent = this.formatTime(this.audio.duration);
      }
    });

    this.progressBar.addEventListener('input', () => {
      if (!isNaN(this.audio.duration)) {
        this.audio.currentTime = (this.progressBar.value / 100) * this.audio.duration;
      }
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.updatePlayPauseIcon();
      this.trackStatus.textContent = 'Đã nghe hết bài';
    });

    this.audio.addEventListener('error', () => {
      this.isPlaying = false;
      this.updatePlayPauseIcon();
      this.trackStatus.textContent = 'Dạ bài này đang bị giới hạn, Ba Mẹ thử chọn bài khác nhé!';
    });
  }

  playTrack(track) {
    this.currentTrack = track;
    this.playerContainer.classList.add('visible');
    this.trackTitle.textContent = `${track.title} - ${track.uploader || ''}`;
    this.trackStatus.textContent = 'Đang kết nối luồng nhạc...';

    // Highlight playing card on UI
    document.querySelectorAll('.song-card').forEach(card => card.classList.remove('playing'));
    const activeCard = document.getElementById(`card-${track.id}`);
    if (activeCard) activeCard.classList.add('playing');

    // Load stream from backend preview route
    this.audio.src = `/api/preview/${track.id}`;
    this.audio.load();

    this.audio.play().then(() => {
      this.isPlaying = true;
      this.trackStatus.textContent = '🟢 Đang nghe thử trực tiếp...';
      this.updatePlayPauseIcon();
    }).catch(() => {
      this.isPlaying = false;
      this.trackStatus.textContent = 'Bấm nút Play để bắt đầu nghe thử';
      this.updatePlayPauseIcon();
    });
  }

  togglePlay() {
    if (!this.audio.src) return;
    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      this.trackStatus.textContent = 'Tạm dừng nghe thử';
    } else {
      this.audio.play();
      this.isPlaying = true;
      this.trackStatus.textContent = '🟢 Đang nghe thử trực tiếp...';
    }
    this.updatePlayPauseIcon();
  }

  updatePlayPauseIcon() {
    this.btnPlayPause.innerHTML = this.isPlaying ? '⏸️' : '▶️';
  }

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

window.previewPlayer = new PreviewPlayer();
