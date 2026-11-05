---
judul: Audit Data
ringkasan: Memeriksa kesesuaian simpanan, pinjaman tunai, KPR, dan Buku Besar. Hanya membaca, tidak mengubah data.
menu: /dashboard/settings/audit
---
Menu: **Sistem → Audit Data**. Halaman ini mencari data yang tidak cocok antara transaksi dan jurnal. Tidak ada tombol yang mengubah data. Bawaannya izin menu ini diberikan ke grup admin dan bisa diatur di **Kelola Hak Akses**.

## Memakai halaman

1. Isi periode **Dari** dan **Sampai**, lalu **Tampilkan**. Bawaannya tahun berjalan. Tautan **Sejak 2018** memeriksa seluruh riwayat setelah pindah data; hasilnya lebih lama muncul.
2. Setiap pemeriksaan menampilkan jumlah temuan dan nilainya, atau **Bersih** bila tidak ada temuan.
3. Klik judul pemeriksaan untuk melihat rinciannya. Layar menampilkan 500 baris terbaru; **Ekspor** memuat sampai 5.000 baris. Klik nomor bukti untuk membuka asalnya.

## Daftar pemeriksaan

| Modul | Pemeriksaan | Artinya |
| --- | --- | --- |
| Simpanan | Transaksi tanpa jurnal | Saldo anggota terhitung, tetapi tidak masuk Buku Besar |
| Simpanan | Nilai berbeda dengan jurnal | Nilai transaksi tidak sama dengan total debit jurnal. Bukti SHU tidak diperiksa |
| Simpanan | Jurnal tanpa transaksi | Buku Besar terisi, tetapi saldo anggota tidak |
| Pinjaman Tunai | Pencairan tanpa jurnal | Pinjaman tidak punya jurnal pencairan |
| Pinjaman Tunai | Angsuran tanpa jurnal | Sisa pinjaman berkurang, tetapi Buku Besar tidak |
| Pinjaman Tunai | Nilai angsuran berbeda dengan jurnal | Pokok + jasa + adm + provisi tidak sama dengan total debit jurnal |
| Pinjaman Tunai | Hitungan cicilan berbeda dengan buku | Kolom Bayar tidak sama dengan jumlah baris angsuran. Sebagian wajar, misalnya pinjaman yang ditutup |
| Pinjaman Tunai | Cicilan selesai tetapi masih bersaldo | Saldo pokok masih lebih dari Rp 100 |
| Pinjaman Tunai | Pokok dibayar melebihi pinjaman | Pokok yang dibayar melebihi pokok pinjaman lebih dari Rp 100 |
| KPR | Angsuran tanpa jurnal, nilai berbeda, pokok dibayar berlebih | Sama seperti pinjaman tunai. Pencairan KPR memang tidak berjurnal |

Bagian **Buku Besar** menampilkan jumlah bukti tidak seimbang dan baris ke akun yang tidak ada di COA, dengan tautan ke **Jurnal Bermasalah**.

Bagian **Saldo buku dibandingkan Buku Besar** membandingkan saldo simpanan, pinjaman, dan KPR dengan saldo akunnya, posisi hari ini.

Bagian **Riwayat koreksi** menampilkan 100 pembatalan terakhir: waktu, bukti, pembalik, alasan, dan operatornya.

> **Penting:** Temuan adalah bahan pemeriksaan, belum tentu kesalahan. Data akhir 2017 kemungkinan saldo awal saat pindah data, dan selisih bisa berasal dari jurnal manual. Telusuri bersama akuntan sebelum mengoreksi. Koreksi dilakukan lewat pembatalan transaksi atau jurnal, bukan dari halaman ini.
