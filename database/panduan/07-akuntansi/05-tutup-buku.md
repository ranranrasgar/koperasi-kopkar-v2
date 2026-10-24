---
judul: Tutup buku dan saldo awal tahun
ringkasan: Cara kerja jurnal tutup buku tahunan (TBT), bagaimana saldo awal tahun dihitung, dan cara memproses tutup buku dari web.
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

**Akuntansi → Tutup Buku** punya tiga bagian:

- **Pratinjau** tahun yang dipilih: pendapatan sebelum pajak, pajak (persen dari Pengaturan Perusahaan), laba ditahan setelah pajak, dan nominal tiap pos SHU.
- **Proses tutup buku**: memposting jurnal TBT persis seperti desktop. Hanya untuk **superadmin atau admin**, dan hanya untuk tahun sebelum tahun berjalan.
- **Riwayat Tutup Buku**: setiap jurnal TBT per tahun, bagian, jumlah baris, total debit/kredit, dan operatornya.

Urutan prosesnya:

1. Akun pendapatan dan biaya tahun itu dinolkan pada 31 Desember.
2. Laba dikreditkan ke **Laba Ditahan**; pajak (laba dikali persen pajak) dipindahkan ke **Hutang Pajak**.
3. Laba setelah pajak dibagi ke pos-pos SHU menurut persen di pos SHU; semua nilai dibulatkan 2 desimal.
4. Saldo semua akun neraca menjadi saldo awal pada 1 Januari tahun berikutnya.

Memproses ulang tahun yang sudah ditutup mengganti jurnal lamanya. Proses ulang **ditolak** bila SHU anggota tahun itu sudah ada yang dicairkan, atau bila tahun sesudahnya sudah ditutup buku.

> **Catatan:** Jurnal tutup buku desktop 2025 tidak seimbang sekitar Rp 3.468 karena jurnal lama di data. Seperti desktop, tutup buku web memindahkan saldo apa adanya, jadi selisih lama ikut terbawa; selisihnya ditampilkan di hasil proses.

## Setelah tutup buku

Hindari mencatat atau mengubah transaksi bertanggal tahun yang sudah ditutup. Sistem tidak mengunci tanggal, tetapi transaksi seperti itu membuat saldo akhir tahun itu tidak lagi sama dengan saldo pembuka tahun berikutnya. Data sebelum 2024 sudah menunjukkan selisih karena hal ini.
