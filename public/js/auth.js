// TuneFlow Authentication, RBAC & 30-min Guest Quota Management (Issue #52)
class TuneFlowAuth {
  constructor() {
    this.token = localStorage.getItem('tuneflow_token') || null;
    this.user = null;
    this.role = 'guest';
    this.guest = null;
    this.heartbeatTimer = null;
    this.postLoginRedirect = null;

    // Generate or retrieve persistent Guest ID
    this.guestId = localStorage.getItem('tuneflow_guest_id');
    if (!this.guestId) {
      this.guestId = 'guest_' + Math.random().toString(36).substring(2, 12);
      localStorage.setItem('tuneflow_guest_id', this.guestId);
    }

    // Lightweight client fingerprint
    this.fingerprint = localStorage.getItem('tuneflow_fingerprint');
    if (!this.fingerprint) {
      const screenRes = typeof window !== 'undefined' && window.screen ? `${window.screen.width}x${window.screen.height}` : '';
      const raw = [
        navigator.userAgent || '',
        screenRes,
        Intl.DateTimeFormat().resolvedOptions().timeZone || ''
      ].join('_').replace(/[^a-zA-Z0-9_]/g, '');
      this.fingerprint = 'fp_' + raw.substring(0, 32);
      localStorage.setItem('tuneflow_fingerprint', this.fingerprint);
    }

    this.setupFetchInterceptor();
    this.initDOM();
    this.bindEvents();
    this.fetchMe();
    this.startHeartbeatLoop();
  }

  getAuthHeaders() {
    const headers = {
      'x-guest-id': this.guestId,
      'x-fingerprint': this.fingerprint
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  setupFetchInterceptor() {
    const originalFetch = window.fetch;
    const self = this;
    window.fetch = function (input, init = {}) {
      const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (url.startsWith('/api') || url.includes('/api/')) {
        init.headers = Object.assign({}, self.getAuthHeaders(), init.headers || {});
      }
      return originalFetch.call(this, input, init);
    };
  }

  initDOM() {
    this.btnAuthStatus = document.getElementById('btn-auth-status');
    this.authStatusIcon = document.getElementById('auth-status-icon');
    this.authStatusText = document.getElementById('auth-status-text');

    this.btnAdminTrigger = document.getElementById('btn-admin-panel-trigger');
    this.adminTriggerIcon = document.getElementById('admin-trigger-icon');
    this.adminTriggerText = document.getElementById('admin-trigger-text');
    this.authLoginSubtitle = document.getElementById('auth-login-subtitle');

    this.modalLogin = document.getElementById('modal-auth-login');
    this.formLogin = document.getElementById('form-auth-login');
    this.inputUsername = document.getElementById('input-auth-username');
    this.inputPassword = document.getElementById('input-auth-password');
    this.errorMsg = document.getElementById('auth-error-msg');
    this.btnCloseLogin = document.getElementById('btn-close-auth-modal');
    this.btnCancelLogin = document.getElementById('btn-cancel-auth');

    this.modalCooldown = document.getElementById('modal-guest-cooldown');
    this.cooldownTimerText = document.getElementById('cooldown-timer-text');
    this.btnGuestOpenLogin = document.getElementById('btn-guest-open-login');
    this.btnGuestCloseCooldown = document.getElementById('btn-guest-close-cooldown');

    // Change Password Elements (Issue #81)
    this.btnChangePasswordTrigger = document.getElementById('btn-change-password-trigger');
    this.modalChangePassword = document.getElementById('modal-auth-change-password');
    this.formChangePassword = document.getElementById('form-auth-change-password');
    this.inputOldPassword = document.getElementById('input-change-old-password');
    this.inputNewPassword = document.getElementById('input-change-new-password');
    this.inputConfirmPassword = document.getElementById('input-change-confirm-password');
    this.changePasswordMsg = document.getElementById('change-password-msg');
    this.btnCloseChangePassword = document.getElementById('btn-close-change-password-modal');
    this.btnCancelChangePassword = document.getElementById('btn-cancel-change-password');
  }

  bindEvents() {
    if (this.btnAdminTrigger) {
      this.btnAdminTrigger.addEventListener('click', () => {
        if (this.role === 'admin') {
          if (window.adminPanel) {
            window.adminPanel.open();
          }
        } else {
          this.openLoginModal('admin');
        }
      });
    }

    if (this.btnAuthStatus) {
      this.btnAuthStatus.addEventListener('click', () => {
        if (this.role === 'admin') {
          if (window.adminPanel) {
            window.adminPanel.open();
          }
        } else if (this.role === 'user') {
          if (confirm(`Bạn đang đăng nhập với tài khoản: ${this.user.username}.\nBạn có muốn đăng xuất không?`)) {
            this.logout();
          }
        } else {
          this.openLoginModal();
        }
      });
    }

    if (this.btnCloseLogin) this.btnCloseLogin.addEventListener('click', () => this.closeLoginModal());
    if (this.btnCancelLogin) this.btnCancelLogin.addEventListener('click', () => this.closeLoginModal());

    if (this.formLogin) {
      this.formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin();
      });
    }

    if (this.btnGuestOpenLogin) {
      this.btnGuestOpenLogin.addEventListener('click', () => {
        this.closeCooldownModal();
        this.openLoginModal();
      });
    }

    if (this.btnGuestCloseCooldown) {
      this.btnGuestCloseCooldown.addEventListener('click', () => {
        this.closeCooldownModal();
      });
    }

    if (this.btnChangePasswordTrigger) {
      this.btnChangePasswordTrigger.addEventListener('click', () => {
        this.openChangePasswordModal();
      });
    }

    if (this.btnCloseChangePassword) {
      this.btnCloseChangePassword.addEventListener('click', () => this.closeChangePasswordModal());
    }

    if (this.btnCancelChangePassword) {
      this.btnCancelChangePassword.addEventListener('click', () => this.closeChangePasswordModal());
    }

    if (this.formChangePassword) {
      this.formChangePassword.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleChangePassword();
      });
    }
  }

  async fetchMe() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (data.authenticated) {
        this.role = data.user.role;
        this.user = data.user;
        this.guest = null;
        this.updateBadgeLoggedIn();
      } else {
        this.role = 'guest';
        this.user = null;
        this.guest = data.guest;
        this.updateBadgeGuest();
      }

      this.checkRouteAndOpen();
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
        window.dispatchEvent(new window.CustomEvent('tuneflow:auth_change', {
          detail: { authenticated: Boolean(this.user), user: this.user, role: this.role }
        }));
      }
    } catch (e) {
      console.warn('Lỗi khi kiểm tra phiên đăng nhập:', e);
    }
  }

  checkRouteAndOpen() {
    const isPathAdmin = typeof window !== 'undefined' && (window.location.pathname === '/admin' || window.location.hash === '#admin');
    if (!isPathAdmin) return;
    if (this.role === 'admin') {
      if (window.adminPanel) {
        window.adminPanel.open();
      }
    } else {
      this.openLoginModal('admin');
    }
  }

  updateBadgeLoggedIn() {
    if (!this.authStatusIcon || !this.authStatusText) return;
    if (this.role === 'admin') {
      this.authStatusIcon.textContent = '👑';
      this.authStatusText.textContent = `Quản trị (${this.user.username})`;
      this.btnAuthStatus.title = `Tài khoản Quản trị: ${this.user.username} (Bấm để mở Bảng Quản Trị)`;
    } else {
      this.authStatusIcon.textContent = '👤';
      this.authStatusText.textContent = `Gia Đình (${this.user.username})`;
      this.btnAuthStatus.title = `Tài khoản Gia Đình: ${this.user.username} (Bấm để đăng xuất)`;
    }
    if (this.btnChangePasswordTrigger) {
      this.btnChangePasswordTrigger.style.display = 'inline-flex';
    }
    this.updateAdminTriggerBtn();
  }

  updateBadgeGuest() {
    if (!this.authStatusIcon || !this.authStatusText) return;
    if (this.btnChangePasswordTrigger) {
      this.btnChangePasswordTrigger.style.display = 'none';
    }
    this.authStatusIcon.textContent = '⏱️';

    if (!this.guest) {
      this.authStatusText.textContent = 'Khách: 30:00';
      this.updateAdminTriggerBtn();
      return;
    }

    if (this.guest.status === 'cooldown' || !this.guest.can_listen) {
      this.authStatusText.textContent = 'Khách: Đã ngắt';
      this.btnAuthStatus.title = 'Hết 30 phút nghe thử - Bấm để đăng nhập';
    } else {
      const remainingSec = this.guest.remaining_sec || 0;
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      const pad = (n) => (n < 10 ? '0' : '') + n;
      this.authStatusText.textContent = `Khách: ${pad(mins)}:${pad(secs)}`;
      this.btnAuthStatus.title = `Khách vãng lai: còn ${pad(mins)}:${pad(secs)} nghe thử (Bấm để đăng nhập)`;
    }
    this.updateAdminTriggerBtn();
  }

  updateAdminTriggerBtn() {
    if (!this.btnAdminTrigger) return;
    if (this.role === 'admin') {
      if (this.adminTriggerIcon) this.adminTriggerIcon.textContent = '👑';
      if (this.adminTriggerText) this.adminTriggerText.textContent = 'Quản Trị';
      this.btnAdminTrigger.classList.add('admin-active');
      this.btnAdminTrigger.title = 'Bảng Điều Khiển Quản Trị Hệ Thống (Bấm để mở)';
    } else {
      if (this.adminTriggerIcon) this.adminTriggerIcon.textContent = '🔐';
      if (this.adminTriggerText) this.adminTriggerText.textContent = 'Quản Trị';
      this.btnAdminTrigger.classList.remove('admin-active');
      this.btnAdminTrigger.title = 'Đăng nhập Quản Trị Viên (Bấm để mở đăng nhập)';
    }
  }

  openLoginModal(target = null) {
    if (target === 'admin') {
      this.postLoginRedirect = '/admin';
      if (this.authLoginSubtitle) {
        this.authLoginSubtitle.innerHTML = 'Đăng nhập tài khoản <strong>Quản trị</strong> để quản lý thành viên và hệ thống.';
      }
    } else {
      if (this.authLoginSubtitle) {
        this.authLoginSubtitle.innerHTML = 'Đăng nhập tài khoản <strong>Gia Đình</strong> hoặc <strong>Quản Trị</strong> để thưởng thức âm nhạc không giới hạn thời gian và tải bài hát tốc độ cao.';
      }
    }
    if (this.modalLogin) {
      this.modalLogin.style.display = 'flex';
      if (this.inputUsername) this.inputUsername.focus();
      if (this.errorMsg) this.errorMsg.style.display = 'none';
    }
  }

  closeLoginModal() {
    if (this.modalLogin) {
      this.modalLogin.style.display = 'none';
    }
  }

  openCooldownModal(remainingSec = 3600) {
    if (this.modalCooldown) {
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      const pad = (n) => (n < 10 ? '0' : '') + n;
      if (this.cooldownTimerText) {
        this.cooldownTimerText.textContent = `${pad(mins)}:${pad(secs)}`;
      }
      this.modalCooldown.style.display = 'flex';
    }
  }

  closeCooldownModal() {
    if (this.modalCooldown) {
      this.modalCooldown.style.display = 'none';
    }
  }

  openChangePasswordModal() {
    if (!this.modalChangePassword) return;
    this.modalChangePassword.style.display = 'flex';
    if (this.inputOldPassword) this.inputOldPassword.value = '';
    if (this.inputNewPassword) this.inputNewPassword.value = '';
    if (this.inputConfirmPassword) this.inputConfirmPassword.value = '';
    if (this.changePasswordMsg) this.changePasswordMsg.style.display = 'none';
    if (this.inputOldPassword) this.inputOldPassword.focus();
  }

  closeChangePasswordModal() {
    if (!this.modalChangePassword) return;
    this.modalChangePassword.style.display = 'none';
  }

  showChangePasswordMsg(text, isError) {
    if (!this.changePasswordMsg) return;
    this.changePasswordMsg.textContent = text;
    this.changePasswordMsg.style.display = 'block';
    this.changePasswordMsg.style.color = isError ? '#e53e3e' : '#48bb78';
    this.changePasswordMsg.style.background = isError ? 'rgba(229, 62, 62, 0.1)' : 'rgba(72, 187, 120, 0.1)';
  }

  async handleChangePassword() {
    const oldPassword = this.inputOldPassword ? this.inputOldPassword.value.trim() : '';
    const newPassword = this.inputNewPassword ? this.inputNewPassword.value.trim() : '';
    const confirmPassword = this.inputConfirmPassword ? this.inputConfirmPassword.value.trim() : '';

    if (!oldPassword || !newPassword) {
      this.showChangePasswordMsg('Vui lòng nhập đầy đủ thông tin', true);
      return;
    }

    if (newPassword.length < 4) {
      this.showChangePasswordMsg('Mật khẩu mới phải có ít nhất 4 ký tự', true);
      return;
    }

    if (newPassword !== confirmPassword) {
      this.showChangePasswordMsg('Xác nhận mật khẩu mới không khớp', true);
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        this.showChangePasswordMsg(data.message || 'Không thể đổi mật khẩu', true);
        return;
      }
      this.showChangePasswordMsg('🎉 Đổi mật khẩu thành công!', false);
      if (typeof window.showToast === 'function') {
        window.showToast('🎉 Đổi mật khẩu thành công', 'success');
      }
      setTimeout(() => {
        this.closeChangePasswordModal();
      }, 1000);
    } catch (err) {
      this.showChangePasswordMsg(`Lỗi kết nối: ${err.message}`, true);
    }
  }

  async handleLogin() {
    const username = this.inputUsername.value.trim();
    const password = this.inputPassword.value;
    if (!username || !password) return;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!data.ok) {
        if (this.errorMsg) {
          this.errorMsg.textContent = data.message || 'Đăng nhập không thành công';
          this.errorMsg.style.display = 'block';
        }
        return;
      }

      this.token = data.token;
      localStorage.setItem('tuneflow_token', data.token);
      this.user = data.user;
      this.role = data.user.role;
      this.closeLoginModal();
      this.updateBadgeLoggedIn();

      if (this.role === 'admin' && (this.postLoginRedirect === '/admin' || (typeof window !== 'undefined' && (window.location.pathname === '/admin' || window.location.hash === '#admin')))) {
        this.postLoginRedirect = null;
        if (window.adminPanel) {
          window.adminPanel.open();
        }
      }

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof window.CustomEvent === 'function') {
        window.dispatchEvent(new window.CustomEvent('tuneflow:auth_change', {
          detail: { authenticated: true, user: this.user, role: this.role }
        }));
      }

      if (typeof window.showToast === 'function') {
        window.showToast(`🎉 Chào mừng ${data.user.username} đã đăng nhập!`, 'success');
      }
    } catch (e) {
      if (this.errorMsg) {
        this.errorMsg.textContent = 'Lỗi kết nối máy chủ: ' + e.message;
        this.errorMsg.style.display = 'block';
      }
    }
  }

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_e) {}

    localStorage.removeItem('tuneflow_token');
    this.token = null;
    this.user = null;
    this.role = 'guest';
    await this.fetchMe();

    if (typeof window.showToast === 'function') {
      window.showToast('👋 Đã đăng xuất khỏi tài khoản', 'info');
    }
  }

  startHeartbeatLoop() {
    // Send 15s heartbeat when player is actively playing
    setInterval(async () => {
      if (this.role !== 'guest') return;
      if (!window.previewPlayer || !window.previewPlayer.isPlaying) return;

      try {
        const res = await fetch('/api/auth/guest-heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ durationSec: 15 })
        });
        const data = await res.json();

        if (data.ok && data.guest) {
          this.guest = data.guest;
          this.updateBadgeGuest();

          if (!data.guest.can_listen || data.guest.status === 'cooldown') {
            // Cut off stream immediately
            if (window.previewPlayer && typeof window.previewPlayer.togglePlay === 'function') {
              window.previewPlayer.audio.pause();
              window.previewPlayer.isPlaying = false;
              window.previewPlayer.updatePlayPauseIcon();
            }
            this.openCooldownModal(Math.max(0, Math.ceil((data.guest.cooldown_until - Date.now()) / 1000)));
          }
        }
      } catch (_e) {}
    }, 15000);
  }
}

window.tuneFlowAuth = new TuneFlowAuth();
window.authController = window.tuneFlowAuth;
