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
3. Tab **Users > Add user**, buat dua akun. Di kolom email, isi nama pengguna lalu `@rencana.nikah`, misalnya `rafi@rencana.nikah` dan `alya@rencana.nikah`. Kata sandi minimal 6 karakter. Di layar masuk aplikasi, cukup ketik `rafi` atau `alya` (tanpa @).
4. Kalau ada pengaturan **User actions** di tab Settings, matikan pendaftaran sendiri (sign-up) supaya tidak ada akun baru.

## 4. Ambil konfigurasi web
1. Ikon roda gigi di samping Project Overview > **Project settings**.
2. Di bagian **Your apps**, klik ikon web `</>` lalu daftarkan aplikasi (hosting tidak perlu).
3. Salin `apiKey`, `authDomain`, `projectId`, dan `appId` ke file `firebase-config.js` di repo ini. Nilai ini bukan kata sandi.

## 5. Pasang aturan keamanan
1. Di **Firestore Database > Rules**, tempel isi file `firestore.rules`.
2. Ganti dua email di dalamnya dengan akun yang kamu buat di langkah 3 (misalnya `rafi@rencana.nikah`), lalu **Publish**.

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
