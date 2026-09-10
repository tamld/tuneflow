/**
 * TuneFlow Admin Control Panel Controller (Issue #71)
 * Manages family accounts, guest quotas, and homelab runtime operations
 */
class AdminPanel {
  constructor() {
    this.modal = document.getElementById('modal-admin-panel');
    this.btnClose = document.getElementById('btn-close-admin-modal');
    this.btnLogout = document.getElementById('btn-admin-logout');

    // Tabs
    this.tabButtons = document.querySelectorAll('.admin-tab-btn');
    this.tabContents = {
      accounts: document.getElementById('admin-tab-accounts'),
      sessions: document.getElementById('admin-tab-sessions'),
      guests: document.getElementById('admin-tab-guests'),
      system: document.getElementById('admin-tab-system')
    };

    // Account Elements
    this.userListBody = document.getElementById('admin-user-list-body');
    this.formCreateUser = document.getElementById('form-admin-create-user');
    this.inputNewUsername = document.getElementById('input-admin-new-username');
    this.inputNewPassword = document.getElementById('input-admin-new-password');
    this.selectNewRole = document.getElementById('select-admin-new-role');
    this.accountMsg = document.getElementById('admin-account-msg');

    // Session Elements (Issue #84)
    this.sessionListBody = document.getElementById('admin-session-list-body');
    this.sessionTotalCount = document.getElementById('admin-session-total-count');
    this.sessionMsg = document.getElementById('admin-session-msg');
    this.btnKickUsers = document.getElementById('btn-admin-kick-users');
    this.btnKickGuests = document.getElementById('btn-admin-kick-guests');
    this.btnKickOthers = document.getElementById('btn-admin-kick-others');
    this.btnKickAll = document.getElementById('btn-admin-kick-all');

    // Guest Elements
    this.guestListBody = document.getElementById('admin-guest-list-body');
    this.guestTotalCount = document.getElementById('admin-guest-total-count');

    // System Elements
    this.sysNodeVer = document.getElementById('admin-sys-node');
    this.sysPlatform = document.getElementById('admin-sys-platform');
    this.sysUptime = document.getElementById('admin-sys-uptime');
    this.sysMemory = document.getElementById('admin-sys-memory');
    this.sysStorage = document.getElementById('admin-sys-storage');
    this.sysYtdlpVer = document.getElementById('admin-sys-ytdlp');
    this.btnUpdateYtdlp = document.getElementById('btn-admin-update-ytdlp');
    this.ytdlpUpdateMsg = document.getElementById('admin-ytdlp-update-msg');

    this.bindEvents();
  }

  bindEvents() {
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => this.close());
    }

    if (this.btnLogout) {
      this.btnLogout.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản Quản trị không?')) {
          this.close();
          if (window.authController && typeof window.authController.logout === 'function') {
            window.authController.logout();
          }
        }
      });
    }

    // Modal background click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }

    // Tab switching
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabKey = btn.getAttribute('data-tab');
        this.switchTab(tabKey);
      });
    });

    // Create User Form
    if (this.formCreateUser) {
      this.formCreateUser.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCreateUser();
      });
    }

    // Update yt-dlp binary button
    if (this.btnUpdateYtdlp) {
      this.btnUpdateYtdlp.addEventListener('click', async () => {
        await this.handleUpdateYtdlp();
      });
    }

    // Session Kick-Out Action Buttons (Issue #84)
    if (this.btnKickUsers) {
      this.btnKickUsers.addEventListener('click', async () => {
        await this.handleRevokeGroup('users', 'Đăng xuất tất cả tài khoản User');
      });
    }

    if (this.btnKickGuests) {
      this.btnKickGuests.addEventListener('click', async () => {
        await this.handleRevokeGroup('guests', 'Đăng xuất toàn bộ Khách vãng lai');
      });
    }

    if (this.btnKickOthers) {
      this.btnKickOthers.addEventListener('click', async () => {
        await this.handleRevokeGroup('all_except_me', 'Giữ tôi và đăng xuất tất cả các phiên khác');
      });
    }

    if (this.btnKickAll) {
      this.btnKickAll.addEventListener('click', async () => {
        await this.handleRevokeAll();
      });
    }

    // Handle popstate for /admin route deep linking
    window.addEventListener('popstate', () => {
      if (typeof window !== 'undefined' && (window.location.pathname === '/admin' || window.location.hash === '#admin')) {
        if (window.tuneFlowAuth && window.tuneFlowAuth.role === 'admin') {
          this.open(false);
        }
      } else {
        this.close(false);
      }
    });
  }

  open(syncUrl = true) { // open()
    if (!this.modal) return;
    this.modal.style.display = 'flex';
    this.switchTab('accounts');
    if (syncUrl && typeof window !== 'undefined' && window.location.pathname !== '/admin') {
      window.history.pushState({ modal: 'admin' }, '', '/admin');
    }
  }

  close(syncUrl = true) { // close()
    if (!this.modal) return;
    this.modal.style.display = 'none';
    if (this.accountMsg) this.accountMsg.style.display = 'none';
    if (this.sessionMsg) this.sessionMsg.style.display = 'none';
    if (this.ytdlpUpdateMsg) this.ytdlpUpdateMsg.style.display = 'none';
    if (syncUrl && typeof window !== 'undefined' && window.location.pathname === '/admin') {
      window.history.pushState(null, '', '/');
    }
  }

  switchTab(tabKey) {
    this.tabButtons.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabKey);
    });

    Object.keys(this.tabContents).forEach(key => {
      if (this.tabContents[key]) {
        this.tabContents[key].style.display = key === tabKey ? 'block' : 'none';
      }
    });

    if (tabKey === 'accounts') this.loadUsers();
    if (tabKey === 'sessions') this.loadSessions();
    if (tabKey === 'guests') this.loadGuests();
    if (tabKey === 'system') this.loadSystemStatus();
  }

  // --- Account Management ---
  async loadUsers() {
    if (!this.userListBody) return;
    this.userListBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 16px; color: var(--text-secondary);">⏳ Đang tải danh sách tài khoản...</td></tr>';

    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const users = await res.json();

      if (!Array.isArray(users) || users.length === 0) {
        this.userListBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 16px; color: var(--text-secondary);">Chưa có tài khoản nào</td></tr>';
        return;
      }

      const currentUserId = window.authController && window.authController.user ? window.authController.user.id : null;

      this.userListBody.innerHTML = users.map(u => {
        const isCurrent = currentUserId === u.id;
        const roleBadge = u.role === 'admin' 
          ? '<span style="background: rgba(245, 158, 11, 0.2); color: var(--accent-gold); padding: 2px 8px; border-radius: 4px; font-weight: 700;">👑 Quản trị</span>'
          : '<span style="background: rgba(72, 187, 120, 0.2); color: #48bb78; padding: 2px 8px; border-radius: 4px; font-weight: 600;">👤 Gia Đình</span>';
        
        const createdStr = u.created_at ? new Date(u.created_at).toLocaleDateString('vi-VN') : 'Không rõ';
        const resetBtn = `<button class="btn-reset-user-password secondary-btn" data-id="${u.id}" data-name="${this.escapeHtml(u.username)}" style="padding: 4px 8px; font-size: 12px; margin-right: 6px;">🔑 Đổi MK</button>`;
        const actionHtml = isCurrent
          ? `${resetBtn} <span style="font-size: 12px; color: var(--text-secondary);">(Đang dùng)</span>`
          : `${resetBtn} <button class="btn-delete-user secondary-btn" data-id="${u.id}" data-name="${this.escapeHtml(u.username)}" style="padding: 4px 10px; font-size: 13px; color: #e53e3e; border-color: rgba(229, 62, 62, 0.4);">🗑️ Xóa</button>`;

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px 12px; font-weight: 600;">#${u.id}</td>
            <td style="padding: 10px 12px; font-weight: 600; color: var(--text-primary);">${this.escapeHtml(u.username)}</td>
            <td style="padding: 10px 12px;">${roleBadge}</td>
            <td style="padding: 10px 12px; font-size: 13px; color: var(--text-secondary);">${createdStr}</td>
            <td style="padding: 10px 12px; text-align: right;">${actionHtml}</td>
          </tr>
        `;
      }).join('');

      this.userListBody.querySelectorAll('.btn-reset-user-password').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          const newPass = typeof window.prompt === 'function' ? window.prompt(`Nhập mật khẩu mới cho tài khoản "${name}" (tối thiểu 4 ký tự):`) : null;
          if (newPass && newPass.trim().length >= 4) {
            await this.handleResetUserPassword(id, name, newPass.trim());
          } else if (newPass !== null) {
            alert('Mật khẩu phải có ít nhất 4 ký tự!');
          }
        });
      });

      this.userListBody.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const name = btn.getAttribute('data-name');
          if (confirm(`Bạn có chắc muốn xóa tài khoản "${name}" không?`)) {
            await this.handleDeleteUser(id);
          }
        });
      });
    } catch (err) {
      this.userListBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 16px; color: #e53e3e;">❌ Lỗi đọc danh sách: ${err.message}</td></tr>`;
    }
  }

  async handleCreateUser() {
    const username = this.inputNewUsername.value.trim();
    const password = this.inputNewPassword.value.trim();
    const role = this.selectNewRole.value;

    if (!username || !password) {
      this.showAccountMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu', true);
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        this.showAccountMsg(data.message || 'Lỗi khi tạo tài khoản', true);
        return;
      }

      this.showAccountMsg(`🎉 Đã tạo thành công tài khoản "${username}"!`, false);
      this.inputNewUsername.value = '';
      this.inputNewPassword.value = '';
      if (typeof window.showToast === 'function') {
        window.showToast(`🎉 Đã thêm tài khoản "${username}" (${role})`, 'success');
      }
      await this.loadUsers();
    } catch (err) {
      this.showAccountMsg(`Lỗi kết nối: ${err.message}`, true);
    }
  }

  async handleDeleteUser(id) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.message || 'Không thể xóa tài khoản này');
        return;
      }
      if (typeof window.showToast === 'function') {
        window.showToast('🗑️ Đã xóa tài khoản thành công', 'info');
      }
      await this.loadUsers();
    } catch (err) {
      alert(`Lỗi khi xóa: ${err.message}`);
    }
  }

  async handleResetUserPassword(id, name, newPassword) {
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.message || 'Không thể đặt lại mật khẩu');
        return;
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`🔑 Đã đổi mật khẩu cho "${name}" thành công`, 'success');
      } else {
        alert(data.message || `Đã đổi mật khẩu cho "${name}" thành công`);
      }
    } catch (err) {
      alert(`Lỗi khi đổi mật khẩu: ${err.message}`);
    }
  }

  showAccountMsg(text, isError) {
    if (!this.accountMsg) return;
    this.accountMsg.textContent = text;
    this.accountMsg.style.display = 'block';
    this.accountMsg.style.color = isError ? '#e53e3e' : '#48bb78';
    this.accountMsg.style.background = isError ? 'rgba(229, 62, 62, 0.1)' : 'rgba(72, 187, 120, 0.1)';
  }

  // --- Session & Device Management (Issue #84) ---
  async loadSessions() {
    if (!this.sessionListBody) return;
    this.sessionListBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 16px; color: var(--text-secondary);">⏳ Đang đọc danh sách phiên...</td></tr>';

    try {
      const res = await fetch('/api/admin/sessions');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const sessions = data.sessions || [];

      if (this.sessionTotalCount) {
        this.sessionTotalCount.textContent = sessions.length;
      }

      if (sessions.length === 0) {
        this.sessionListBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 16px; color: var(--text-secondary);">Không có phiên kết nối nào</td></tr>';
        return;
      }

      this.sessionListBody.innerHTML = sessions.map(s => {
        const isCurrent = Boolean(s.isCurrent);
        const roleBadge = s.role === 'admin'
          ? '<span style="background: rgba(245, 158, 11, 0.2); color: var(--accent-gold); padding: 2px 8px; border-radius: 4px; font-weight: 700;">👑 Quản trị</span>'
          : '<span style="background: rgba(72, 187, 120, 0.2); color: #48bb78; padding: 2px 8px; border-radius: 4px; font-weight: 600;">👤 Gia Đình</span>';

        const createdStr = s.createdAt ? new Date(s.createdAt).toLocaleString('vi-VN') : '—';
        const actionBtn = isCurrent
          ? '<span style="font-size: 12px; color: var(--accent-gold); font-weight: 600;">⭐ Phiên Này (Bạn)</span>'
          : `<button class="btn-revoke-session secondary-btn" data-token="${this.escapeHtml(s.token)}" data-user="${this.escapeHtml(s.username)}" style="padding: 4px 10px; font-size: 13px; color: #e53e3e; border-color: rgba(229, 62, 62, 0.4);">🚪 Đăng Xuất</button>`;

        return `
          <tr style="border-bottom: 1px solid var(--border-color); ${isCurrent ? 'background: rgba(245, 158, 11, 0.05);' : ''}">
            <td style="padding: 10px 12px; font-weight: 600; color: var(--text-primary);">
              ${this.escapeHtml(s.username)}
              ${isCurrent ? ' <span style="font-size: 11px; background: var(--accent-gold); color: #000; padding: 1px 6px; border-radius: 10px; font-weight: 700;">Tôi</span>' : ''}
            </td>
            <td style="padding: 10px 12px;">${roleBadge}</td>
            <td style="padding: 10px 12px; font-family: monospace; font-size: 13px; color: var(--text-secondary);">${this.escapeHtml(s.clientIp)}</td>
            <td style="padding: 10px 12px; font-size: 13px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(s.userAgent)}">${this.escapeHtml(s.userAgent)}</td>
            <td style="padding: 10px 12px; font-size: 13px; color: var(--text-secondary);">${createdStr}</td>
            <td style="padding: 10px 12px; text-align: right;">${actionBtn}</td>
          </tr>
        `;
      }).join('');

      this.sessionListBody.querySelectorAll('.btn-revoke-session').forEach(btn => {
        btn.addEventListener('click', async () => {
          const token = btn.getAttribute('data-token');
          const user = btn.getAttribute('data-user');
          if (confirm(`Bạn có chắc muốn thu hồi phiên đăng nhập của "${user}" không?`)) {
            await this.handleRevokeSession(token, user);
          }
        });
      });
    } catch (err) {
      this.sessionListBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 16px; color: #e53e3e;">❌ Lỗi: ${err.message}</td></tr>`;
    }
  }

  async handleRevokeSession(token, username) {
    try {
      const res = await fetch('/api/admin/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        this.showSessionMsg(data.message || 'Lỗi khi thu hồi phiên', true);
        return;
      }
      this.showSessionMsg(`Đã đăng xuất phiên của "${username}"`, false);
      if (typeof window.showToast === 'function') {
        window.showToast(`🚪 Đã đăng xuất phiên của "${username}"`, 'info');
      }
      await this.loadSessions();
    } catch (err) {
      this.showSessionMsg(`Lỗi kết nối: ${err.message}`, true);
    }
  }

  async handleRevokeGroup(group, desc) {
    if (!confirm(`Xác nhận: ${desc}?`)) return;
    try {
      const res = await fetch('/api/admin/sessions/revoke-group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, excludeCurrentSession: true })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        this.showSessionMsg(data.message || 'Lỗi khi đăng xuất nhóm', true);
        return;
      }
      this.showSessionMsg(`🎉 Đã xử lý thành công (${data.count || 0} phiên/lượt bị thu hồi)`, false);
      if (typeof window.showToast === 'function') {
        window.showToast(`🎉 ${desc} thành công`, 'success');
      }
      await this.loadSessions();
      if (typeof this.loadGuests === 'function') this.loadGuests();
    } catch (err) {
      this.showSessionMsg(`Lỗi kết nối: ${err.message}`, true);
    }
  }

  async handleRevokeAll() {
    if (!confirm('CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn ĐĂNG XUẤT TOÀN BỘ tất cả tài khoản và khách trên toàn hệ thống không?')) return;
    try {
      const res = await fetch('/api/admin/sessions/revoke-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludeCurrentSession: false })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        this.showSessionMsg(data.message || 'Lỗi khi xóa toàn bộ phiên', true);
        return;
      }
      alert('Đã xóa toàn bộ phiên. Hệ thống sẽ đăng xuất bạn về trang chủ.');
      this.close();
      if (window.authController && typeof window.authController.logout === 'function') {
        window.authController.logout();
      } else {
        window.location.reload();
      }
    } catch (err) {
      this.showSessionMsg(`Lỗi kết nối: ${err.message}`, true);
    }
  }

  showSessionMsg(text, isError) {
    if (!this.sessionMsg) return;
    this.sessionMsg.textContent = text;
    this.sessionMsg.style.display = 'block';
    this.sessionMsg.style.color = isError ? '#e53e3e' : '#48bb78';
    this.sessionMsg.style.background = isError ? 'rgba(229, 62, 62, 0.1)' : 'rgba(72, 187, 120, 0.1)';
  }

  // --- Guest Quota Management ---
  async loadGuests() {
    if (!this.guestListBody) return;
    this.guestListBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 16px; color: var(--text-secondary);">⏳ Đang đọc danh sách khách...</td></tr>';

    try {
      const res = await fetch('/api/admin/guests');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const guests = await res.json();

      if (!Array.isArray(guests) || guests.length === 0) {
        if (this.guestTotalCount) this.guestTotalCount.textContent = '0';
        this.guestListBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 16px; color: var(--text-secondary);">Chưa có phiên khách nào</td></tr>';
        return;
      }

      if (this.guestTotalCount) this.guestTotalCount.textContent = guests.length;

      this.guestListBody.innerHTML = guests.map(g => {
        const isCooldown = g.status === 'cooldown' || !g.can_listen;
        const statusBadge = isCooldown
          ? '<span style="background: rgba(229, 62, 62, 0.2); color: #e53e3e; padding: 2px 8px; border-radius: 4px; font-weight: 700;">⛔ Bị ngắt (Cooldown)</span>'
          : '<span style="background: rgba(72, 187, 120, 0.2); color: #48bb78; padding: 2px 8px; border-radius: 4px; font-weight: 600;">🟢 Hoạt động</span>';
        
        const listenMins = Math.floor((g.total_listen_sec || 0) / 60);
        const listenSecs = (g.total_listen_sec || 0) % 60;
        const listenTimeStr = `${listenMins}m ${listenSecs}s`;

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px 12px; font-family: monospace; font-size: 13px;">${this.escapeHtml(g.guest_id || '—')}</td>
            <td style="padding: 10px 12px; font-family: monospace; font-size: 13px;">${this.escapeHtml(g.client_ip || '—')}</td>
            <td style="padding: 10px 12px; font-weight: 600;">${listenTimeStr}</td>
            <td style="padding: 10px 12px;">${statusBadge}</td>
            <td style="padding: 10px 12px; text-align: right;">
              <button class="btn-reset-guest primary-btn" data-id="${this.escapeHtml(g.guest_id)}" data-ip="${this.escapeHtml(g.client_ip)}" style="padding: 4px 10px; font-size: 13px; border-radius: 6px;">⚡ Mở Khóa</button>
            </td>
          </tr>
        `;
      }).join('');

      this.guestListBody.querySelectorAll('.btn-reset-guest').forEach(btn => {
        btn.addEventListener('click', async () => {
          const guestId = btn.getAttribute('data-id');
          const clientIp = btn.getAttribute('data-ip');
          await this.handleResetGuest(guestId, clientIp);
        });
      });
    } catch (err) {
      this.guestListBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 16px; color: #e53e3e;">❌ Lỗi: ${err.message}</td></tr>`;
    }
  }

  async handleResetGuest(guestId, clientIp) {
    try {
      const res = await fetch('/api/admin/guests/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, clientIp })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert('Không thể mở khóa khách này');
        return;
      }
      if (typeof window.showToast === 'function') {
        window.showToast(`⚡ Đã mở khóa 30 phút nghe nhạc cho khách (${clientIp || guestId})!`, 'success');
      }
      await this.loadGuests();
    } catch (err) {
      alert(`Lỗi khi mở khóa: ${err.message}`);
    }
  }

  // --- System Homelab Operations ---
  async loadSystemStatus() {
    try {
      const res = await fetch('/api/system/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const sys = data.system || {};

      if (this.sysNodeVer) this.sysNodeVer.textContent = sys.nodeVersion || '—';
      if (this.sysPlatform) this.sysPlatform.textContent = `${sys.platform || ''} (${sys.arch || ''})`;
      
      if (this.sysUptime) {
        const sec = Math.floor(sys.uptime || 0);
        const hours = Math.floor(sec / 3600);
        const mins = Math.floor((sec % 3600) / 60);
        this.sysUptime.textContent = `${hours} giờ ${mins} phút`;
      }

      if (this.sysMemory && sys.memory) {
        this.sysMemory.textContent = `RSS: ${sys.memory.rssMb}MB | Heap: ${sys.memory.heapUsedMb}/${sys.memory.heapTotalMb}MB`;
      }

      if (this.sysStorage && sys.storage) {
        this.sysStorage.textContent = `${sys.storage.usedMb}MB / ${sys.storage.quotaMb}MB (${sys.storage.fileCount} tệp)`;
      }

      if (this.sysYtdlpVer) {
        this.sysYtdlpVer.textContent = sys.ytDlpVersion || 'Chưa nhận diện';
      }
    } catch (err) {
      console.warn('Lỗi đọc chẩn đoán hệ thống:', err);
    }
  }

  async handleUpdateYtdlp() {
    if (!this.btnUpdateYtdlp) return;
    const origText = this.btnUpdateYtdlp.innerHTML;
    this.btnUpdateYtdlp.disabled = true;
    this.btnUpdateYtdlp.innerHTML = '⏳ Đang kiểm tra & cập nhật...';
    if (this.ytdlpUpdateMsg) {
      this.ytdlpUpdateMsg.style.display = 'block';
      this.ytdlpUpdateMsg.style.color = 'var(--text-secondary)';
      this.ytdlpUpdateMsg.textContent = 'Đang gọi yt-dlp -U... Quá trình này mất vài giây.';
    }

    try {
      const res = await fetch('/api/system/update-ytdlp', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        if (this.ytdlpUpdateMsg) {
          this.ytdlpUpdateMsg.style.color = '#48bb78';
          this.ytdlpUpdateMsg.textContent = `🎉 Thành công! Phiên bản: ${data.oldVersion} → ${data.newVersion}`;
        }
        if (typeof window.showToast === 'function') {
          window.showToast(`🎉 Cập nhật yt-dlp thành công: ${data.newVersion}`, 'success');
        }
        await this.loadSystemStatus();
      } else {
        if (this.ytdlpUpdateMsg) {
          this.ytdlpUpdateMsg.style.color = '#e53e3e';
          this.ytdlpUpdateMsg.textContent = `⚠️ ${data.error || 'Cập nhật thất bại'}`;
        }
      }
    } catch (err) {
      if (this.ytdlpUpdateMsg) {
        this.ytdlpUpdateMsg.style.color = '#e53e3e';
        this.ytdlpUpdateMsg.textContent = `Lỗi mạng: ${err.message}`;
      }
    } finally {
      this.btnUpdateYtdlp.disabled = false;
      this.btnUpdateYtdlp.innerHTML = origText;
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate and expose globally
document.addEventListener('DOMContentLoaded', () => {
  window.adminPanel = new AdminPanel();
});
