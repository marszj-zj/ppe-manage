// ============================================================
// 认证模块 - PBKDF2加盐哈希 + 登录失败锁定
// ============================================================

window.Auth = {
  PBKDF2_ITERATIONS: 100000,
  MAX_FAIL_COUNT: 5,
  LOCK_MINUTES: 10,

  // 生成随机盐（16字节，返回hex字符串）
  generateSalt() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // hex字符串转Uint8Array
  hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  },

  // PBKDF2 加盐哈希
  async hashPassword(password, saltHex) {
    const encoder = new TextEncoder();
    const salt = this.hexToBytes(saltHex);
    const keyMaterial = await crypto.subtle.importKey(
      'raw', encoder.encode(password),
      { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const hashBuffer = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: this.PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 旧版SHA-256哈希（兼容已有用户，验证后自动升级）
  async hashPasswordOld(password) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // 检查账户锁定状态
  checkLock(user) {
    if (user.lock_until) {
      const lockUntil = new Date(user.lock_until).getTime();
      const now = Date.now();
      if (lockUntil > now) {
        const remainMin = Math.ceil((lockUntil - now) / 60000);
        return { locked: true, remainMin };
      }
    }
    return { locked: false };
  },

  // 记录登录失败
  async recordLoginFail(userId) {
    try {
      const { data: user } = await window.supabase.from('users').select('login_fail_count').eq('id', userId).single();
      const failCount = (user?.login_fail_count || 0) + 1;
      const update = { login_fail_count: failCount };
      if (failCount >= this.MAX_FAIL_COUNT) {
        update.lock_until = new Date(Date.now() + this.LOCK_MINUTES * 60000).toISOString();
      }
      await window.supabase.from('users').update(update).eq('id', userId);
      return { failCount, locked: failCount >= this.MAX_FAIL_COUNT };
    } catch (e) {
      console.warn('记录登录失败失败', e);
      return { failCount: 0, locked: false };
    }
  },

  // 重置登录失败次数
  async resetLoginFail(userId) {
    try {
      await window.supabase.from('users').update({ login_fail_count: 0, lock_until: null }).eq('id', userId);
    } catch (e) {
      console.warn('重置登录失败次数失败', e);
    }
  },

  // 带重试的用户查询（网络波动时自动重试，不把网络错误误判为密码错误）
  async queryUserWithRetry(username, maxRetries = 2) {
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await window.supabase
          .from('users').select('*').eq('username', username).eq('status', 'active').maybeSingle();
        if (!error) return { data, networkError: false };
        lastError = error;
      } catch (e) {
        lastError = e;
      }
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 800 + attempt * 400));
      }
    }
    return { data: null, networkError: true, error: lastError };
  },

  // 登录
  async login(username, password) {
    // 查询用户（带重试，区分网络错误）
    const { data: user, networkError } = await this.queryUserWithRetry(username);

    if (networkError) {
      return { success: false, message: '网络连接超时，请检查网络后点击重试', networkError: true };
    }
    if (!user) {
      return { success: false, message: '用户名或密码错误' };
    }

    // 检查是否被锁定
    const lockStatus = this.checkLock(user);
    if (lockStatus.locked) {
      return { success: false, message: `账户已锁定，请${lockStatus.remainMin}分钟后再试` };
    }

    // 验证密码
    let passwordValid = false;
    if (user.salt) {
      // 新用户：PBKDF2加盐验证
      const hashed = await this.hashPassword(password, user.salt);
      passwordValid = (hashed === user.password);
    } else {
      // 旧用户：SHA-256验证（兼容）
      const hashed = await this.hashPasswordOld(password);
      passwordValid = (hashed === user.password);
    }

    if (!passwordValid) {
      const result = await this.recordLoginFail(user.id);
      if (result.locked) {
        return { success: false, message: `连续失败${this.MAX_FAIL_COUNT}次，账户已锁定${this.LOCK_MINUTES}分钟` };
      }
      const remain = this.MAX_FAIL_COUNT - result.failCount;
      return { success: false, message: `用户名或密码错误，还可尝试${remain}次` };
    }

    // 登录成功：旧用户自动升级密码哈希为PBKDF2+盐（后台执行，不阻塞登录）
    if (!user.salt) {
      const newSalt = this.generateSalt();
      this.hashPassword(password, newSalt).then(newHash => {
        window.supabase.from('users').update({ salt: newSalt, password: newHash }).eq('id', user.id)
          .catch(e => console.warn('密码哈希升级失败', e));
      }).catch(() => {});
      user.salt = newSalt;
    }

    // 存入 localStorage
    const loginUser = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      line_id: user.line_id,
      team_id: user.team_id
    };

    // 检测是否是默认密码（admin123），本地计算不额外请求
    const defaultHash = await this.hashPassword('admin123', user.salt);
    loginUser.mustChangePassword = (user.password === defaultHash);

    localStorage.setItem('ppe_user', JSON.stringify(loginUser));

    // 非关键操作后台执行：重置失败次数 + 写登录日志（不阻塞页面跳转）
    this.resetLoginFail(user.id).catch(e => console.warn('重置失败次数异常', e));
    this.logAction(loginUser, 'login', 'users', user.id, '登录系统').catch(e => console.warn('写登录日志异常', e));

    return { success: true, user: loginUser };
  },

  // 登出
  logout() {
    const user = this.getCurrentUser();
    if (user) {
      this.logAction(user, 'logout', 'users', user.id, '退出系统');
    }
    localStorage.removeItem('ppe_user');
    window.location.href = 'index.html';
  },

  // 获取当前用户
  getCurrentUser() {
    const raw = localStorage.getItem('ppe_user');
    return raw ? JSON.parse(raw) : null;
  },

  // 检查登录状态，未登录跳转
  requireLogin(allowedRoles) {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      alert('无权限访问此页面');
      this.redirectByRole(user.role);
      return null;
    }
    return user;
  },

  // 根据角色跳转
  redirectByRole(role) {
    switch (role) {
      case 'admin': window.location.href = 'admin.html'; break;
      case 'line_leader': window.location.href = 'line-leader.html'; break;
      case 'team_leader': window.location.href = 'team-leader.html'; break;
      default: window.location.href = 'index.html';
    }
  },

  // 记录操作日志
  async logAction(user, action, refType, refId, detail) {
    try {
      await window.supabase.from('operation_logs').insert({
        operator_id: user ? user.id : null,
        operator_name: user ? user.name : '系统',
        role: user ? user.role : null,
        action, ref_type: refType, ref_id: refId, detail
      });
    } catch (e) {
      console.warn('日志记录失败', e);
    }
  },

  // 修改密码
  async changePassword(userId, oldPassword, newPassword) {
    // 查询用户获取salt
    const { data: user } = await window.supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return { success: false, message: '用户不存在' };

    // 验证原密码
    let oldValid = false;
    if (user.salt) {
      const oldHash = await this.hashPassword(oldPassword, user.salt);
      oldValid = (oldHash === user.password);
    } else {
      const oldHash = await this.hashPasswordOld(oldPassword);
      oldValid = (oldHash === user.password);
    }
    if (!oldValid) return { success: false, message: '原密码错误' };

    // 生成新盐和新哈希
    const newSalt = this.generateSalt();
    const newHash = await this.hashPassword(newPassword, newSalt);
    await window.supabase.from('users').update({ salt: newSalt, password: newHash }).eq('id', userId);

    // 更新本地用户标记
    const u = this.getCurrentUser();
    if (u) { u.mustChangePassword = false; localStorage.setItem('ppe_user', JSON.stringify(u)); }
    return { success: true };
  },

  // 弹出修改密码弹窗
  showChangePasswordModal(force = false) {
    const user = this.getCurrentUser();
    if (!user) return;
    const title = force ? '首次登录，请修改密码' : '修改密码';
    const html = `
      <div id="pwdModal" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:999;display:flex;align-items:center;justify-content:center;padding:16px;">
        <div class="card" style="max-width:380px;width:100%;">
          <h3>${title}</h3>
          ${force ? '<p style="font-size:13px;color:#e53935;margin-bottom:12px;">为了安全，请先修改默认密码</p>' : ''}
          <div class="form-group"><label>原密码</label><input type="password" id="pwdOld"></div>
          <div class="form-group"><label>新密码</label><input type="password" id="pwdNew" placeholder="至少6位"></div>
          <div class="form-group"><label>确认新密码</label><input type="password" id="pwdNew2"></div>
          <div class="btn-group" style="margin-top:12px;">
            ${force ? '' : '<button class="btn btn-default" onclick="Auth.closePwdModal()">取消</button>'}
            <button class="btn btn-primary" onclick="Auth.submitPwdChange(${force})">确认修改</button>
          </div>
        </div>
      </div>`;
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);
  },

  closePwdModal() {
    const m = document.getElementById('pwdModal');
    if (m) m.parentElement.remove();
  },

  async submitPwdChange(force) {
    const oldPwd = document.getElementById('pwdOld').value;
    const newPwd = document.getElementById('pwdNew').value;
    const newPwd2 = document.getElementById('pwdNew2').value;
    if (!oldPwd || !newPwd) { alert('请填写完整'); return; }
    if (newPwd.length < 6) { alert('新密码至少6位'); return; }
    if (newPwd !== newPwd2) { alert('两次新密码不一致'); return; }
    const user = this.getCurrentUser();
    const result = await this.changePassword(user.id, oldPwd, newPwd);
    if (result.success) {
      alert('密码修改成功');
      this.closePwdModal();
      await this.logAction(user, 'change_password', 'users', user.id, '修改密码');
    } else {
      alert(result.message);
    }
  },

  // 检测是否需要强制改密
  checkForceChangePassword() {
    const user = this.getCurrentUser();
    if (user && user.mustChangePassword) {
      this.showChangePasswordModal(true);
    }
  }
};
