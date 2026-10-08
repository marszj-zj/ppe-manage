// ============================================================
// Supabase 反向代理（Cloudflare Pages Functions）
// 把同源 /sb/* 请求转发到 Supabase 源站，
// 避免国内直连新加坡节点公网网络时好时坏的问题。
// 链路：用户 -> CF 边缘（与页面同域，页面能开就能通）-> CF 骨干网 -> Supabase
// ============================================================

const SUPABASE_HOST = 'djsygsmzeheeorcforyv.supabase.co';

// 转发时需要剔除的请求头（host 指向源站，content-length 由 fetch 按实际 body 重算）
const STRIP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
]);

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 构造目标 URL：替换域名为 Supabase，去掉 /sb 路径前缀
  const targetUrl = new URL(url.toString());
  targetUrl.protocol = 'https:';
  targetUrl.host = SUPABASE_HOST;
  targetUrl.pathname = url.pathname.replace(/^\/sb(?=\/|$)/, '') || '/';

  // 透传请求头（apikey / Authorization / Content-Type / Prefer / Range 等）
  const forwardHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      forwardHeaders.append(key, value);
    }
  }

  const init = {
    method: request.method,
    headers: forwardHeaders,
    redirect: 'follow',
  };

  // 透传请求体（GET / HEAD 无 body）
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl.toString(), init);
  } catch (e) {
    return new Response(JSON.stringify({
      error: 'upstream_fetch_failed',
      message: '代理转发失败：' + ((e && e.message) || 'unknown')
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  // 透传响应（状态码 + 响应头 + body 流）
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set('via', 'cf-pages-supabase-proxy');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
