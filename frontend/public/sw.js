/* JalRakshak service worker — offline-first: caches the app shell, icons,
   hero media, and the latest risk-map dataset so GPS alerts still work with
   no internet. Sensor + risk + alert calls fall back to the cached payload. */

const CACHE = "jalrakshak-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

// Data endpoints snapshotted for offline risk classification.
const DATA_ENDPOINTS = [
  "/api/flood-zones",
  "/api/water-levels",
  "/api/weather",
  "/api/alerts",
  "/api/shelters",
  "/api/sirens",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, cacheName = CACHE) {
  const cache = await caches.open(cacheName);
  try {
    // Refresh cache in background for data endpoints (cache-first is too stale
    // for live risk) — but we never let a network error kill offline use.
    const live = await fetch(request);
    if (live && live.ok) cache.put(request, live.clone());
    return live;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error("offline");
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || (await fetchPromise);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Data endpoints: network-first so screens show fresh data, but fall back to
  // the last-synced copy when offline (risk engine runs locally on this).
  if (DATA_ENDPOINTS.includes(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Non-POST same-origin GETs: app shell + media get cache-first w/ update.
  if (request.method === "GET") {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});
