# Pasang Rencana Nikah di Vercel (tanpa Claude)

Aplikasi ini situs statis. Data disimpan bersama di Firebase (Firestore) dan dilindungi login email dan kata sandi. Hanya dua akun kalian yang bisa masuk.

Kamu butuh akun Google (untuk Firebase), akun Vercel, dan repo GitHub ini. Semua ada paket gratisnya. Cek halaman harga masing-masing karena ketentuannya bisa berubah.

## 1. Buat proyek Firebase
1. Buka https://console.firebase.google.com lalu **Add project**. Beri nama bebas, Google Analytics boleh dimatikan.

## 2. Aktifkan database
1. Menu **Build > Firestore Database > Create database**.
2. Pilih lokasi terdekat (misalnya `asia-southeast2` Jakarta) dan mode **production**.

## 3. Aktifkan login dan buat dua akun
1. Menu **Build > Authentication > Get started**.
2. Tab **Sign-in method**, aktifkan **Email/Password**.
3. Tab **Users > Add user**, buat dua akun. Di kolom email, isi nama pengguna lalu `@wedding.planner`, misalnya `nama@wedding.planner` dan `nama2@wedding.planner`. Kata sandi minimal 6 karakter. Di layar masuk aplikasi, cukup ketik `rafi` atau `alya` (tanpa @).
4. Kalau ada pengaturan **User actions** di tab Settings, matikan pendaftaran sendiri (sign-up) supaya tidak ada akun baru.

## 4. Ambil konfigurasi web
1. Ikon roda gigi di samping Project Overview > **Project settings**.
2. Di bagian **Your apps**, klik ikon web `</>` lalu daftarkan aplikasi (hosting tidak perlu).
3. Salin `apiKey`, `authDomain`, `projectId`, dan `appId` ke file `firebase-config.js` di repo ini. Nilai ini bukan kata sandi.

## 5. Pasang aturan keamanan
1. Di **Firestore Database > Rules**, tempel isi file `firestore.rules`.
2. Ganti dua email di dalamnya dengan akun yang kamu buat di langkah 3 (misalnya `nama@wedding.planner`), lalu **Publish**.

Tanpa langkah ini data tidak terlindungi dengan benar, jadi jangan dilewati.

## 6. Deploy ke Vercel
1. Buka https://vercel.com > **Add New > Project** lalu pilih repo GitHub ini.
2. **Framework Preset**: Other. Kosongkan Build Command dan Output Directory.
3. Klik **Deploy**. Vercel memberi alamat seperti `nama-proyek.vercel.app`.
4. Vercel hanya memakai branch utama untuk alamat produksi. Kalau kode aplikasi masih ada di branch lain, gabungkan dulu ke branch utama, atau pakai alamat preview yang dibuat Vercel untuk branch itu.

## 7. Pakai
1. Buka alamat Vercel, masuk dengan nama pengguna dan kata sandi.
2. Di HP, buka menu browser lalu **Tambahkan ke layar utama** supaya terasa seperti aplikasi.
3. Di Ringkasan, isi Data pernikahan, lalu pakai template checklist dan budget.

## Catatan
- Data yang sudah kamu isi di versi Claude lama tidak pindah otomatis.
- Referensi memakai tautan saja, tidak ada unggah foto.
- Versi lama untuk Claude tersimpan di folder `legacy/`.
- Untuk menguji tanpa Firebase, buka `index.html`: akan muncul layar "Belum terhubung".
- Semua pustaka pihak ketiga ada di folder `vendor/` (lihat `vendor/README.md`), jadi halaman tidak memuat skrip dari CDN.

## Keamanan (kerjakan semua)

Keamanan data bergantung pada empat hal. Tiga di antaranya kamu atur sendiri di konsol Firebase dan Google.

1. **Aturan Firestore harus yang terbaru.** Tempel isi `firestore.rules` di Firestore > Rules, ganti dua email, lalu Publish. Aturan ini hanya mengizinkan dua akun kalian dan hanya pada koleksi milik aplikasi.
2. **Matikan pendaftaran sendiri.** Authentication > Settings > User actions, matikan **Enable create (sign-up)**. Kalau opsi itu tidak ada di layarmu, aturan nomor 1 tetap melindungi data.
3. **Batasi kunci API.** Di https://console.cloud.google.com > APIs & Services > Credentials, buka kunci "Browser key" proyek ini. Di **Application restrictions** pilih **Websites** dan isi alamat Vercel kamu (misalnya `https://planwedding-monskyy.vercel.app/*`). Di **API restrictions** pilih **Restrict key** lalu centang hanya Identity Toolkit API, Token Service API, dan Cloud Firestore API.
4. **Kata sandi dan akun.**
   - Pakai kata sandi yang panjang (12 karakter atau lebih) dan berbeda dari akun lain.
   - Aktifkan verifikasi 2 langkah di akun Google (Firebase), GitHub, dan Vercel. Siapa pun yang menguasai salah satunya bisa mengubah aplikasi atau datanya.
   - Tidak ada reset kata sandi lewat email. Kalau lupa, ubah lewat Authentication > Users di konsol.

Perlindungan lain sudah ada di kode: semua teks dari database di-escape sebelum ditampilkan, id dan angka dari database divalidasi, tautan hanya http atau https, dan `vercel.json` memasang kebijakan keamanan konten (CSP) serta header anti-iframe. Setelah deploy, cek bahwa login masih berjalan. Kalau layar Masuk tidak bisa dipakai setelah perubahan keamanan, hapus `vercel.json` sementara dan kabari pengelola kode.
