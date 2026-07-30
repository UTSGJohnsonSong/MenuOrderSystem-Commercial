/* 改这个版本号是让客户端丢弃旧缓存的唯一手段：activate 里会删掉所有别的 key。
 * 图片走 cache-first 且不 revalidate，所以只要有文件名不变、内容变了的静态资源
 * （例如 public/library/ 下的菜品图重新导出），就必须在这里 +1，
 * 否则已经打开过的用户会永远看到旧图。
 * v4（2026-07-30）：导入 177 张菜品库配图，其中 19 张修正了透明底被压成黑底的问题。 */
const CACHE = "chishenmeya-v4";

/* 只放"每个用户一定会用到、且小"的东西。
 * 曾经这里有 /header-bg.png（2.33MB），但全站没有任何页面渲染它——
 * 它只出现在 manifest.json 的 PWA 安装截图里。CACHE 版本号一变，
 * activate 会清空重新 addAll，等于强迫每个用户（包括老用户回访）
 * 下载 2.33MB 他永远看不到的图。服务器上行只有 4 Mbps，这一张就要独占约 5 秒。
 * 文件本身留着，manifest 的引用不动，只是不再预缓存。 */
const PRECACHE = [
  "/",
  "/shiji",
  "/chufang",
  "/manifest.json",
];

/* ── Install: precache shell ── */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

/* ── Activate: evict old caches ── */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch: smart routing ── */
self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API 一律直连不缓存（登录态/多租户数据，缓存会串数据）。
  // 唯一例外：/api/uploads/ 下的菜品图片是不可变文件，走图片缓存策略。
  const isUploadedImage = url.pathname.startsWith("/api/uploads/");
  if (url.pathname.startsWith("/api/") && !isUploadedImage) return;

  // _next/static: immutable, cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone)).catch(() => {});
        }
        return res;
      }))
    );
    return;
  }

  // Images: cache-first, fall back to network + cache
  if (request.destination === "image" || isUploadedImage) {
    event.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => new Response("", { status: 404 })))
    );
    return;
  }

  // HTML navigation: network-first, fall back to cached root
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then(hit => hit || caches.match("/"))
      )
    );
    return;
  }

  // Everything else: stale-while-revalidate
  event.respondWith(
    caches.match(request).then(hit => {
      const networkFetch = fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone)).catch(() => {});
        }
        return res;
      });
      return hit || networkFetch;
    })
  );
});
