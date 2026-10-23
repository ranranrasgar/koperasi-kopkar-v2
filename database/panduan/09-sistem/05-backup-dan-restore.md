---
judul: Backup dan restore database
ringkasan: Membuat cadangan seluruh data koperasi (termasuk foto dan gambar), menyimpannya di luar server, memeriksa keutuhannya, dan memulihkannya.
menu: /dashboard/settings/backup
---
Menu **Sistem & Pengaturan → Backup & Restore** membuat cadangan seluruh database: anggota, simpanan, pinjaman, jurnal, akun aplikasi anggota, operator, pengaturan, panduan, dan **media** (foto anggota, gambar himbauan/promo/notifikasi, logo). Semua media aplikasi disimpan di database, jadi satu cadangan sudah mencakup semuanya.

Menu ini hanya untuk **superadmin**, kecuali diberikan ke grup lain lewat Kelola Hak Akses (izin *Backup & Restore (web)*).

## Membuat cadangan

1. Tekan **Buat cadangan sekarang**. Aplikasi boleh tetap dipakai selama proses berjalan; cadangan diambil dari satu titik waktu, jadi isinya tetap serasi.
2. Tunggu sampai muncul *Cadangan selesai dibuat* (biasanya kurang dari satu menit). Jangan tutup halaman.
3. Cadangan baru tampil di daftar beserta tanggal, ukuran, dan jumlah berkasnya.

Centang **Tanpa media** bila hanya perlu data (cadangan lebih kecil; foto dan gambar tidak ikut).

> **Ukuran**: cadangan dikompres. Database berukuran 1,5 GB menjadi sekitar 40 MB. Berkas yang lebih besar dari 500 MB dipotong menjadi beberapa bagian supaya mudah disalin.

## Menyimpan cadangan di luar server

Cadangan yang hanya ada di server ikut hilang bila server rusak. Secara berkala:

1. Tekan **Unduh** pada cadangan, lalu unduh **semua** berkas yang tampil (data.dump, media.dump, dan manifest.json, atau semua potongannya) ke **satu folder** di komputer atau disk luar. Jangan ganti nama berkasnya.
2. Simpan juga berkas pengaturan server (`.env.local`) di tempat terpisah yang aman. Berkas itu berisi password dan tidak ikut cadangan.

## Memeriksa cadangan

**Periksa** mencocokkan setiap berkas dengan sidik SHA-256 yang dicatat saat cadangan dibuat. Hasil *lengkap dan utuh* berarti cadangan bisa dipulihkan. Berkas yang terpotong saat disalin atau rusak langsung ketahuan, dan pemulihan tidak akan dijalankan dengan berkas seperti itu.

## Memulihkan (restore)

> **Penting:** Pulihkan **mengganti seluruh isi database** dengan isi cadangan. Semua transaksi setelah waktu cadangan **hilang**. Buat cadangan terbaru dulu bila ragu, dan minta semua pengguna keluar.

1. Tekan **Pulihkan** pada cadangan yang dipilih.
2. Baca peringatannya, lalu ketik nama database persis seperti yang ditampilkan.
3. Tekan **Pulihkan** dan tunggu sampai selesai (beberapa menit).

Cara kerjanya aman: isi cadangan dimasukkan ke database sementara dulu, jumlah baris setiap tabel dicocokkan dengan catatan cadangan, baru database lama diganti. Bila ada yang gagal di tengah jalan, database lama **tidak berubah**.

Pemulihan ditolak bila ruang disk server tidak cukup (butuh kira-kira ukuran database ditambah 1 GB). Kosongkan ruang disk atau minta petugas teknis memulihkan lewat perintah server.

## Isi berkas cadangan

| Berkas | Isi |
| --- | --- |
| `data.dump` (atau `data.dump.001`, `.002`, ... bila dipotong) | Seluruh data dan struktur tabel, terkompresi |
| `media.dump` | Foto profil anggota dan gambar himbauan/promo/notifikasi (tidak ada bila dibuat "Tanpa media") |
| `manifest.json` (hasil unduhan bernama `...-manifest.json`) | Catatan cadangan: waktu, nama database, versi PostgreSQL, jumlah baris setiap tabel, ukuran dan sidik SHA-256 setiap berkas |

Ketiganya diperlukan untuk memulihkan. Jangan ganti nama berkasnya.

## Memindahkan data ke server lain (kantor ke VPS, atau sebaliknya)

1. Di server **asal**, buat cadangan lalu **Unduh** semua berkasnya ke satu folder di komputer.
2. Di server **tujuan**, buka Backup & Restore, pada **Unggah cadangan dari komputer** pilih **semua** berkas tadi sekaligus (tahan Ctrl untuk memilih beberapa berkas).
3. Periksa daftar berkas yang tampil: semua harus bertanda ✓. Tekan **Unggah**. Berkas dikirim sedikit demi sedikit dengan bilah kemajuan; jangan tutup halaman.
4. Setelah selesai, server memeriksa SHA-256 semua berkas. Bila cocok, cadangan muncul di daftar (disorot) dan jendela **Pulihkan** langsung terbuka.
5. Ketik nama database server tujuan, lalu **Pulihkan**.

> **Penting:** PostgreSQL server tujuan harus versi yang **sama atau lebih baru** dari server asal. Cadangan dari server dengan PostgreSQL lebih baru tidak bisa dipulihkan ke server yang lebih lama.

Setelah memulihkan, akun operator dan password ikut kembali seperti saat cadangan dibuat. Bila Anda keluar otomatis, masuk lagi dengan password yang berlaku di cadangan itu.

Bila unggahan lewat browser tidak memungkinkan (berkas sangat besar atau koneksi lambat), petugas teknis bisa menyalin folder cadangan ke folder cadangan server lalu memakai perintah `npm run restore` (langkahnya di `database/postgres/README.md`).

## Menghapus cadangan lama

Tekan ikon tempat sampah untuk menghapus cadangan dari server. Hapus cadangan lama bila ruang disk menipis, tetapi simpan beberapa yang terbaru (misalnya cadangan harian 7 hari terakhir dan cadangan akhir bulan).
