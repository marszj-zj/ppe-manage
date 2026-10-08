// ============================================================
// 配置文件 - 请填入你的 Supabase 信息
// ============================================================
// 获取方式：Supabase Dashboard → Project Settings → API
//   URL: Project URL
//   anonKey: public anon key
// ============================================================

window.APP_CONFIG = {
  // ===== 必须修改 =====
  SUPABASE_URL: 'https://djsygsmzeheeorcforyv.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqc3lnc216ZWhlZW9yY2Zvcnl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2Nzc4NzgsImV4cCI6MjEwNjI1Mzg3OH0.BiKdtexqZ6htZrHwg2CGX0JDJ1nQHgkj0DAZUaYmyy4',

  // ===== 同源反向代理开关 =====
  // true：走 Cloudflare Pages Functions 代理（/sb/*），国内访问更稳定
  // 回滚方式：改为 false 即恢复直连 Supabase
  USE_PROXY: true,
  SUPABASE_PROXY_PATH: '/sb',

  // ===== 系统名称 =====
  APP_NAME: '劳动防护用品领用登记',

  // ===== 默认管理员（首次登录后请修改密码）=====
  DEFAULT_ADMIN: { username: 'admin', password: 'admin123' }
};
