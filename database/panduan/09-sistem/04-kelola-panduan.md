---
judul: Mengelola Pusat Panduan
ringkasan: Menambah, mengubah, menyembunyikan, dan menghapus artikel serta kategori panduan, termasuk cara menulis format teks.
menu: /dashboard/panduan/kelola
---
Menu **Sistem & Pengaturan → Kelola Panduan** tersedia untuk superadmin, atau grup lain yang diberi izin *Kelola Panduan (web)* di Kelola Hak Akses.

## Artikel

1. Tekan **Artikel Baru**, atau **Ubah** pada artikel yang ada.
2. Isi:
   - **Kategori** dan **Judul** (wajib).
   - **Slug**: alamat artikel, dibuat otomatis dari judul. Huruf kecil, angka, dan strip; harus unik.
   - **Ringkasan**: satu-dua kalimat yang tampil di daftar dan hasil pencarian.
   - **Halaman terkait**: halaman aplikasi yang dijelaskan artikel ini. Tombol **?** di halaman itu akan membuka artikel ini.
   - **Urutan**: angka kecil tampil lebih dulu dalam kategorinya.
   - **Terbit**: hapus centang untuk menyembunyikan artikel dari pembaca tanpa menghapusnya.
3. Tulis **Isi** dan periksa tab **Pratinjau**, lalu **Simpan**.

Setiap penyimpanan mencatat waktu dan nama operator yang mengubah; keduanya tampil di bagian atas artikel.

## Kategori

Tambah, ganti nama, ubah ikon dan urutan kategori di bagian **Kategori**. Kategori yang masih berisi artikel tidak bisa dihapus; pindahkan atau hapus artikelnya lebih dulu.

## Format teks isi

| Tulis | Hasil |
| --- | --- |
| `## Judul bagian` | Judul bagian (masuk daftar isi artikel) |
| `**tebal**` dan `*miring*` | **tebal** dan *miring* |
| `- butir` atau `1. butir` | Daftar berbutir atau bernomor |
| `` `kode` `` | Teks kode, misalnya nomor akun |
| `> **Penting:** ...` | Kotak peringatan merah |
| `> **Catatan:** ...` atau `> **Tips:** ...` | Kotak catatan biru |
| Baris tabel dengan `|` | Tabel (baris kedua berisi `| --- | --- |`) |
| `[teks](/dashboard/loans)` | Tautan ke halaman aplikasi |

## Mengembalikan isi bawaan

Isi panduan awal tersimpan di repositori (`database/panduan`). Perintah `npm run panduan:pasang` hanya **menambahkan** artikel bawaan yang belum ada, jadi suntingan Anda aman. Perintah `npm run panduan:pasang -- --timpa` mengembalikan **semua** panduan ke isi bawaan dan menghapus suntingan serta artikel buatan sendiri; jalankan hanya bila benar-benar diperlukan.
