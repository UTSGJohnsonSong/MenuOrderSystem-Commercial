const CACHE = "chishenmeya-v3";

const PRECACHE = [
  "/",
  "/shiji",
  "/chufang",
  "/header-bg.png",
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
          caches.open(CACHE).then(c => c.put(request, clone));
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
          caches.open(CACHE).then(c => c.put(request, clone));
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
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      });
      return hit || networkFetch;
    })
  );
});
