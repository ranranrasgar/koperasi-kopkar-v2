---
judul: Database, keamanan, dan mode uji
ringkasan: Cara data disimpan, bagaimana login dan hak akses bekerja, perlindungan transaksi, dan pemisahan data uji dari data asli.
---
Hanya untuk **superadmin dan grup admin**.

## Database

- **PostgreSQL 14**. Aplikasi desktop lama memakai MySQL; datanya dimigrasi ke PostgreSQL dengan nama tabel yang sama supaya laporan bisa dibandingkan satu per satu dengan desktop.
- Semua foto, gambar himbauan, dan logo disimpan **di database** (bukan di folder), jadi satu cadangan sudah mencakup semuanya.
- Pencatatan keuangan memakai **jurnal berpasangan** (debit dan kredit harus seimbang). Setiap transaksi (setoran, pencairan, angsuran, potongan gaji, SHU) diposting ke jurnal dalam **satu transaksi database**: bila satu langkah gagal, seluruhnya dibatalkan, tidak ada data setengah jadi.
- Nomor bukti dibuat dengan **kunci database** supaya dua operator yang menyimpan bersamaan tidak mendapat nomor yang sama.

## Login dan hak akses

| | Operator (admin) | Anggota (PWA) |
| --- | --- | --- |
| Akun | Tabel operator, dikelompokkan dalam **grup** | Akun aplikasi (`app_user`) yang tertaut ke anggota |
| Password | Disimpan sebagai hash **scrypt** berbintik garam, tidak pernah dalam bentuk asli | Sama |
| Sesi | Cookie bertanda tangan (HMAC SHA-256), tidak memakai JWT pihak ketiga | Cookie bertanda tangan terpisah |
| Masuk | Nama operator dan password; password awal wajib diganti | Username dan password, atau Google |
| Hak | Per **grup** dan per **menu**, mengikuti nama menu aplikasi desktop; dibaca setiap permintaan sehingga perubahan berlaku tanpa login ulang | Anggota hanya melihat datanya sendiri |

Aturan penting: grup **superadmin** otomatis berhak atas semua menu. Hak dicek di **server** pada setiap halaman dan setiap aksi, bukan hanya dengan menyembunyikan tombol. Akun anggota yang sudah tertaut ke data anggota hanya boleh dihapus superadmin atau grup admin.

## Perlindungan lain

- Semua nilai yang dimasukkan ke database memakai **parameter** (bukan teks yang disambung), sehingga aman dari injeksi SQL.
- Teks yang tampil di email dilepas dari karakter HTML berbahaya, dan tema warna divalidasi ketat sebelum dipakai.
- Pendaftaran akun anggota butuh **email terverifikasi** dan **persetujuan admin**; kode verifikasi dibatasi masa berlaku dan jumlah percobaan.
- Notifikasi push dan email dari server uji **dimatikan** supaya data uji tidak sampai ke anggota sungguhan (lihat artikel mode uji).

## Mode uji dan server uji

- **Mode Uji** (saklar di Sistem & Pengaturan): transaksi dijalankan penuh lalu **dibatalkan** sebelum tersimpan, aman untuk latihan di data asli.
- **Server uji** (port 3101 dan 3201): memakai **salinan database** (`kopkar_mjs_2000_uji`, dibuat dengan `npm run uji:reset`) dan transaksi benar-benar tersimpan di salinan itu. Email dan push ke anggota tidak dikirim kecuali alamat uji yang didaftarkan lewat `EMAIL_UJI_KE`.

## Cadangan dan pemulihan

Menu **Backup & Restore** (dan perintah `npm run backup`) membuat cadangan seluruh database dengan `pg_dump`, bisa diunduh dan dipulihkan dengan `pg_restore`. Simpan salinan di **luar server**. Skrip pembaruan membuat cadangan otomatis sebelum mengubah skema.
