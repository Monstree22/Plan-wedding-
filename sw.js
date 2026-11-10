// Service worker minimal: hanya agar aplikasi bisa dipasang. Tidak mencegat permintaan
// dan tidak menyimpan cache, jadi koneksi Firestore tidak terganggu dan pembaruan
// dari Vercel selalu langsung terlihat.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
