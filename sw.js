// Service worker: keeps the app shell available offline.
// Data itself is cached separately by the app in localStorage.
const CACHE = "ptl-shell-v1";
const SHELL = [
  "./", "./index.html", "./config.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // cache each item independently so one failure doesn't abort the install
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

// Network-first for the shell (so updates land), cache as fallback offline.
// Supabase API traffic is never cached — stale data would be worse than none.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    } catch (err) {
      const hit = await caches.match(req);
      return hit || caches.match("./index.html");
    }
  })());
});
