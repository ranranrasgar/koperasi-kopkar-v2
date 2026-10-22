---
judul: Tutup buku dan saldo awal tahun
ringkasan: Cara kerja jurnal tutup buku tahunan (TBT), bagaimana saldo awal tahun dihitung, dan status tutup buku di web.
menu: /dashboard/accounting/closing
---
## Apa yang dilakukan tutup buku

Tutup buku tahun Y membuat jurnal bernomor **TBT** dengan dua bagian:

1. **Penutupan rugi laba** bertanggal **31 Desember Y**: semua akun pendapatan dan biaya dinolkan, selisihnya dipindahkan ke pos SHU.
2. **Saldo pembuka** bertanggal **1 Januari Y+1**: mengulang saldo semua akun neraca sebagai saldo awal tahun berikutnya.

## Bagaimana laporan memakai TBT

Saldo sebuah akun pada tanggal D dihitung dari:

**saldo pembuka TBT terakhir (1 Januari) + semua jurnal lain sejak tanggal itu sampai D**.

Baris saldo pembuka tidak pernah dihitung sebagai mutasi. Model ini sudah dicocokkan dengan tutup buku desktop tahun 2024 dan 2025: saldo akhir setiap akun sama persis dengan saldo pembuka tahun berikutnya, termasuk Bank OCBC NISP **Rp 9.952.969.417,09** per 31 Desember 2025.

## Halaman Tutup Buku di web

**Akuntansi → Tutup Buku** menampilkan:

- **Pratinjau** tahun berjalan: akun pendapatan dan biaya yang akan ditutup, dan SHU berjalan sampai hari ini.
- **Riwayat Tutup Buku**: setiap jurnal TBT per tahun, bagian (penutupan rugi laba atau saldo pembuka), jumlah baris, total debit/kredit, dan operatornya.

> **Penting:** Halaman ini **belum memposting** tutup buku. Tutup buku tahunan tetap dilakukan di **aplikasi desktop** sampai posting otomatis dari web lulus uji kecocokan terhadap tutup buku 2024 dan 2025.

## Setelah tutup buku

Hindari mencatat atau mengubah transaksi bertanggal tahun yang sudah ditutup. Sistem tidak mengunci tanggal, tetapi transaksi seperti itu membuat saldo akhir tahun itu tidak lagi sama dengan saldo pembuka tahun berikutnya. Data sebelum 2024 sudah menunjukkan selisih karena hal ini.
