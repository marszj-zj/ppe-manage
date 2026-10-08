// ============================================================
// Supabase 客户端初始化
// ============================================================

(function() {
  const cfg = window.APP_CONFIG;

  // 决定实际使用的 URL：
  // - 开启代理且页面通过 http(s) 访问：走同源 Pages Functions 代理
  // - file:// 本地打开或关闭代理：直连 Supabase
  let baseUrl = cfg.SUPABASE_URL;
  const isHttp = typeof window !== 'undefined' && window.location && /^https?:$/.test(window.location.protocol);
  if (cfg.USE_PROXY && isHttp) {
    baseUrl = window.location.origin + (cfg.SUPABASE_PROXY_PATH || '/sb');
  }

  window.supabase = supabase.createClient(baseUrl, cfg.SUPABASE_ANON_KEY);
  console.log('Supabase 客户端已初始化，接口地址：' + baseUrl);
})();
