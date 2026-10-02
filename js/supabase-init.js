// ============================================================
// Supabase 客户端初始化
// ============================================================

(function() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;
  window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase 客户端已初始化');
})();
