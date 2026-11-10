# Pustaka pihak ketiga

Berkas di folder ini disalin apa adanya dari paket npm resmi, supaya halaman tidak memuat skrip dari CDN.

| Berkas | Paket npm | Versi |
|---|---|---|
| firebase-app-compat.js, firebase-auth-compat.js, firebase-firestore-compat.js | firebase | 10.12.2 |
| jspdf.umd.min.js | jspdf | 4.2.1 |
| jspdf.plugin.autotable.min.js | jspdf-autotable | 5.0.9 |
| exceljs.min.js | exceljs | 4.4.0 |

Checksum SHA-256 ada di `SHA256SUMS`. Untuk memperbarui, pasang versi baru lewat npm, salin berkasnya, lalu jalankan `sha256sum *.js > SHA256SUMS`.
