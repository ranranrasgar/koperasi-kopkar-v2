---
judul: Neraca saldo (trial balance)
ringkasan: Saldo awal, mutasi, dan saldo akhir setiap akun; cara membaca peringatan selisih.
menu: /dashboard/accounting/trial-balance
---
**Akuntansi → Trial Balance** (satu susunan halaman dengan laporan lain: **Cetak** dan **Ekspor** di kanan atas, filter periode di satu baris) menampilkan setiap akun yang punya saldo atau mutasi pada periode yang dipilih, dengan enam kolom angka:

| Kolom | Arti |
| --- | --- |
| Saldo Awal Debit / Kredit | Saldo pada tanggal **Dari** |
| Mutasi Debit / Kredit | Jumlah jurnal pada periode itu |
| Saldo Akhir Debit / Kredit | Saldo pada tanggal **Sampai** |

Saldo ditampilkan di sisi yang sesuai: saldo positif di kolom Debit, saldo negatif di kolom Kredit. Baris **Total** di bawah tabel menjumlahkan setiap kolom.

## Peringatan selisih

Dalam pembukuan yang seimbang, total saldo akhir debit sama dengan total saldo akhir kredit. Bila tidak sama, muncul peringatan kuning *Total debit dan kredit saldo akhir berselisih ...*.

Selisih itu berasal dari **data lama** yang tidak seimbang, bukan dari perhitungan laporan. Contoh yang diketahui: beberapa bukti dari aplikasi desktop tahun 2025-2026 punya baris debit dengan kode akun `0` (tidak ada di COA), dan sisa pembulatan sekitar Rp 3.468 dari jurnal sebelum 2019. Akun `0` tampil sebagai *(akun tidak ada di COA)* supaya mudah ditelusuri.

## Melihat jurnal penyebab selisih

Klik keterangan selisih (di Neraca saldo, atau di Neraca pada Laporan Keuangan) untuk membuka halaman **Jurnal Bermasalah** (`Akuntansi → Jurnal Umum → tidak seimbang`). Halaman ini memakai cakupan yang sama dengan laporan, yaitu saldo pembuka tutup buku terakhir ditambah jurnal sesudahnya, per tanggal yang dipilih. Isinya dua daftar:

| Daftar | Isi |
| --- | --- |
| **Bukti tidak seimbang** | Bukti yang total debit dan kreditnya berbeda, dengan tanggal, keterangan, debit, kredit, dan **selisih**. Bukti yang juga memakai akun tidak ada di COA diberi tanda |
| **Baris ke akun yang tidak ada di COA** | Baris jurnal dengan kode akun yang tidak terdaftar (misalnya `0`); saldonya tidak masuk neraca |

Klik **nomor bukti** untuk membuka jurnalnya di Jurnal Umum, lalu perbaiki lewat **Edit** atau hapus bukti yang keliru (lihat panduan Jurnal Umum). Jumlah selisih semua bukti sama dengan selisih di laporan, jadi laporan seimbang kembali setelah bukti-bukti itu diperbaiki. Data bisa diekspor lewat tombol Ekspor.

> **Catatan:** Semua transaksi dari web selalu seimbang, karena mesin posting menolak jurnal yang debit dan kreditnya berbeda.
