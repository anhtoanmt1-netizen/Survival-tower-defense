// Service worker của bản Web/PWA. __BUILD_ID__ và __PRECACHE__ được thay lúc build (tools: vite.config.js) → mỗi bản build có cache riêng, cache cũ tự bị xóa.
const BUILD = '__BUILD_ID__', CACHE = 'std-' + BUILD, PRECACHE = '__PRECACHE__';
const list = Array.isArray(PRECACHE) ? PRECACHE : [];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(list.map((u) => new Request(u, { cache: 'reload' })))).catch(() => {})); });
self.addEventListener('activate', (e) => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith('std-') && k !== CACHE) await caches.delete(k); await self.clients.claim(); })()); });
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('/sw.js')) return; // WebSocket/API/ngoài miền: để trình duyệt xử lý
  if (req.mode === 'navigate') { // trang: ưu tiên mạng (luôn nhận bản mới), mất mạng thì dùng bản đã lưu
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./', cp)); return r; }).catch(() => caches.match('./').then((r) => r || caches.match(req)))); return; }
  // tài nguyên (đã băm tên hoặc ảnh/sprite): ưu tiên cache, thiếu thì tải và lưu
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); } return r; })));
});
