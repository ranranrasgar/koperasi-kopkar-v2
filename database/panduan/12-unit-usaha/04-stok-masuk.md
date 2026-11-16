---
judul: Stok masuk dan kartu stok
ringkasan: Mencatat barang datang untuk produk berstok, harga pokok rata-rata, jurnal persediaan, dan membaca kartu stok.
menu: /dashboard/kantin/stok
---
Menu: **Unit Usaha → Stok Masuk**. Hanya **pengelola** kantin (dan admin) yang bisa mencatat stok masuk; kasir hanya melihat kartu stok.

## Mencatat barang datang

1. Isi **Tanggal** dan **Keterangan** (pemasok, nomor nota).
2. Kantin milik koperasi: pilih **Dibayar dari / dicatat ke**, yaitu akun kas atau bank yang dipakai membayar, atau **Hutang Rekanan dan Vendor** bila dibayar belakangan.
3. Pilih produk di **+ Tambah produk**. Hanya produk aktif dengan **Kelola stok** yang tampil.
4. Isi **Jumlah** dan **Harga beli / satuan** (bawaannya harga beli di data produk). Subtotal dan total dihitung otomatis.
5. **Simpan stok masuk**.

## Yang terjadi

- Stok produk bertambah.
- **HPP rata-rata** dihitung ulang: (stok lama × HPP lama + jumlah masuk × harga beli) ÷ stok baru. HPP inilah yang dipakai saat produk terjual.
- Kantin milik koperasi: jurnal **KTB-...** Persediaan Kantin debit / akun pembayaran kredit.
- Kantin tenant: barang milik tenant, jadi tidak ada jurnal koperasi; stok tetap dicatat supaya kasir tahu sisa barang.

## Produk tanpa kelola stok

Bahan masakan (beras, sayur, lauk) untuk produk tanpa kelola stok dicatat lewat **Bank Book**: Persediaan Kantin debit, akun kas kredit. Saat produk terjual, HPP-nya (harga beli di data produk) mengurangi akun Persediaan yang sama.

## Kartu stok

Bagian bawah halaman menampilkan 100 mutasi terakhir: stok masuk (hijau), terjual (merah), dan pengembalian karena nota dibatalkan, lengkap dengan nomor bukti, harga, sisa stok, dan operatornya.
