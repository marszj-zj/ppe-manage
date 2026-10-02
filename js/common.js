// ============================================================
// 通用工具函数
// ============================================================

window.Common = {
  // 生成单号
  genNo(prefix) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${y}${m}${d}${rand}`;
  },

  // 格式化日期
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  },

  // 格式化日期时间
  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return `${this.formatDate(d)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  },

  // 获取当前月份字符串 YYYY-MM
  currentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  },

  // 获取下个月字符串
  nextMonth() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  },

  // 显示消息
  toast(message, type = 'info') {
    const existing = document.getElementById('toast-container');
    if (!existing) {
      const container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3';
    toast.style.cssText = `background:${bgColor};color:#fff;padding:12px 24px;border-radius:6px;margin-bottom:8px;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-size:14px;`;
    toast.textContent = message;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  // 确认对话框
  confirm(message) {
    return window.confirm(message);
  },

  // 显示加载
  showLoading(text = '加载中...') {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loading-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9998;';
      overlay.innerHTML = `<div style="background:#fff;padding:20px 40px;border-radius:8px;font-size:16px;">${text}</div>`;
      document.body.appendChild(overlay);
    }
  },

  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
  },

  // 转义 HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  // 用工性质中文
  workerTypeText(type) {
    return type === 'formal' ? '正式工' : type === 'labor' ? '劳务工' : '';
  },

  // 状态中文
  statusText(status) {
    const map = {
      draft: '编辑中', submitted: '待管理员签', admin_signed: '在途待签收',
      done: '已完成', cancelled: '已撤回',
      pending: '待确认', approved: '已确认', rejected: '已驳回',
      applied: '待入库', stocked: '已入库',
      team_signed: '班组长已签'
    };
    return map[status] || status;
  },

  // 下载文本文件
  downloadText(filename, content, mime = 'text/plain') {
    const blob = new Blob([content], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // 导出 CSV
  exportCSV(filename, headers, rows) {
    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    this.downloadText(filename, '\uFEFF' + csv, 'text/csv');
  },

  // 打印 HTML
  printHTML(html) {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>打印</title>
      <style>body{font-family:"Microsoft YaHei",sans-serif;padding:20px;}
      table{border-collapse:collapse;width:100%;margin:10px 0;}
      th,td{border:1px solid #333;padding:6px 10px;text-align:center;font-size:14px;}
      th{background:#f0f0f0;}
      h2,h3{text-align:center;}
      .sign-row{margin-top:30px;display:flex;justify-content:space-between;}
      @media print{.no-print{display:none;}}</style></head><body>${html}
      <div class="no-print" style="text-align:center;margin-top:20px;">
      <button onclick="window.print()" style="padding:8px 24px;font-size:16px;">打印</button></div>
      </body></html>`);
    win.document.close();
  }
};
