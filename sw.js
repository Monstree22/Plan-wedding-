// Service worker minimal: hanya agar aplikasi bisa dipasang. Tidak menyimpan cache,
// jadi pembaruan dari Vercel selalu langsung terlihat.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => { e.respondWith(fetch(e.request)); });
