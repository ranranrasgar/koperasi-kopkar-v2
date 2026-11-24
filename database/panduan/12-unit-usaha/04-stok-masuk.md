---
judul: Stok masuk, opname, barang rusak, dan kartu stok
ringkasan: Mencatat barang datang, riwayat dan hapus stok masuk yang salah input, stok opname, barang rusak, peringatan stok menipis, dan kartu stok per produk.
menu: /dashboard/kantin/stok
---
Menu: **Unit Usaha → Stok Kantin**. Hanya **pengelola** kantin (dan admin) yang bisa mencatat stok masuk; kasir hanya melihat kartu stok.

Halaman dibagi empat tab: **Stok Masuk**, **Riwayat Stok Masuk**, **Opname & Rusak**, dan **Kartu Stok**.

## Mencatat barang datang

1. Buka tab **Stok Masuk**, isi **Tanggal** dan **Keterangan** (pemasok, nomor nota).
2. Kantin milik koperasi: pilih **Dibayar dari / dicatat ke**, yaitu akun kas atau bank yang dipakai membayar, atau **Hutang Rekanan dan Vendor** bila dibayar belakangan.
3. Pilih produk di **+ Tambah produk**. Hanya produk aktif dengan **Kelola stok** yang tampil.
4. Isi **Jumlah** dan **Harga beli / satuan** (bawaannya harga beli di data produk). Subtotal dan total dihitung otomatis.
5. **Simpan stok masuk**.

## Yang terjadi

- Stok produk bertambah.
- **HPP rata-rata** dihitung ulang: (stok lama × HPP lama + jumlah masuk × harga beli) ÷ stok baru. HPP inilah yang dipakai saat produk terjual.
- Kantin milik koperasi: jurnal **KTB-...** Persediaan Kantin debit / akun pembayaran kredit.
- Kantin tenant: barang milik tenant, jadi tidak ada jurnal koperasi; stok tetap dicatat supaya kasir tahu sisa barang.

## Riwayat dan hapus stok masuk

Tab **Riwayat Stok Masuk** menampilkan satu baris per bukti **KTB-...**: tanggal, keterangan, akun pembayaran, jumlah produk, total, dan operator. Klik baris untuk melihat rincian produknya. Saring dengan **Dari/Sampai** (bawaannya awal bulan sampai hari ini), **Produk**, dan **Cari** nomor bukti atau keterangan; jumlah baris per halaman bisa diatur.

Ikon **hapus** (tempat sampah) untuk stok masuk yang **salah input atau hanya uji**. Hapus bersifat permanen, tanpa jurnal balik:
- Baris kartu stok bukti itu dan jurnal KTB-nya dihapus.
- Stok produk dikurangi kembali dan HPP rata-rata dikembalikan seperti sebelum stok masuk itu.

Hapus hanya bisa bila produknya **belum punya mutasi lain sesudah bukti itu** (penjualan, opname, barang rusak, atau stok masuk berikutnya); ikonnya abu-abu bila tidak bisa. Kalau barangnya sudah terjual, betulkan dengan opname. Tahun yang sudah tutup buku juga tidak bisa dihapus. Untuk mengubah isi stok masuk, hapus lalu input ulang.

## Produk tanpa kelola stok

Bahan masakan (beras, sayur, lauk) untuk produk tanpa kelola stok dicatat lewat **Bank Book**: Persediaan Kantin debit, akun kas kredit. Saat produk terjual, HPP-nya (harga beli di data produk) mengurangi akun Persediaan yang sama.

## Stok menipis

Di atas halaman tampil daftar produk yang stoknya habis atau sudah mencapai **stok minimal** (diatur di Produk Kantin).

## Stok opname

Untuk mencocokkan stok sistem dengan hasil hitung fisik, misalnya akhir minggu atau akhir bulan.

1. Di tab **Opname & Rusak**, pilih **Stok opname**.
2. Isi **Stok fisik** untuk produk yang dihitung. Produk yang dikosongkan tidak berubah. Selisih dan nilainya (selisih × HPP rata-rata) langsung tampil.
3. **Simpan opname**. Stok menjadi sama dengan stok fisik; nomor bukti KTO-...

Kantin milik koperasi menjurnal nilainya ke akun **Selisih Persediaan Kantin** (dibuat otomatis): stok kurang = Selisih debit / Persediaan kredit; stok lebih = sebaliknya.

## Barang rusak

Untuk barang yang dibuang karena rusak, kedaluwarsa, atau hilang: pilih **Barang rusak**, isi jumlahnya dan **keterangan** (wajib), lalu simpan. Kantin milik koperasi menjurnal **Beban Barang Rusak Kantin** debit / Persediaan kredit senilai HPP rata-rata. Kantin tenant hanya mengubah stok, tanpa jurnal.

## Kartu stok

Tab **Kartu Stok** menampilkan semua mutasi: stok masuk (hijau), terjual (merah), pengembalian karena nota dibatalkan, opname, dan barang rusak, lengkap dengan nomor bukti, harga, sisa stok, dan operatornya. Saring dengan periode, **Produk** (untuk kartu stok satu produk), **Jenis**, dan kata kunci; daftarnya per halaman.
