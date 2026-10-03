const CACHE_NAME = "codelearn-v2";
const PRECACHE_URLS = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Network-first for navigation and scripts (stale code = broken app),
  // cache-first only for fonts/images where staleness is harmless.
  const url = new URL(event.request.url);
  const cacheFirst =
    event.request.mode !== "navigate" &&
    /\.(png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf)$/i.test(url.pathname);

  if (event.request.mode === "navigate" || !cacheFirst) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((cached) => cached || caches.match("/index.html"))
      )
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
