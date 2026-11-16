---
judul: Produk kantin, harga, dan margin
ringkasan: Menambah produk kantin dengan harga beli, harga jual, satuan, kategori, gambar, dan pengaturan stok; margin dihitung otomatis.
menu: /dashboard/kantin/produk
---
Menu: **Unit Usaha → Produk Kantin**. Petugas hanya melihat kantin tempat ia ditugaskan; bila lebih dari satu, pilih kantinnya di deretan tombol di atas tabel. Hanya **pengelola** (dan admin) yang bisa menambah atau mengubah produk.

## Menambah produk

1. Tekan **Tambah produk**.
2. Isi **Nama produk**. **Kode** boleh dikosongkan: sistem memberi nomor P0001, P0002, dan seterusnya per kantin.
3. **Barcode** diisi bila produk dijual dengan pemindai di kasir. Kode dan barcode tidak boleh sama dengan produk lain di kantin yang sama.
4. **Kategori**: ketik kategori baru atau pilih yang sudah ada (Makanan, Minuman, Snack, ...). Kategori baru dibuat otomatis.
5. **Satuan**: porsi, pcs, gelas, botol, bungkus, atau ketik sendiri.
6. **Harga beli** (modal per satuan) dan **Harga jual**. Margin langsung tampil: rupiah, persen dari harga jual, dan markup dari harga beli. Kotak margin menjadi merah bila harga jual tidak lebih besar dari harga beli.
7. **Kelola stok**: centang untuk barang yang dihitung jumlahnya (minuman botol, snack). Isi **Stok minimal** sebagai batas peringatan. Produk tanpa kelola stok (masakan harian) selalu tersedia.
8. **Tampil di aplikasi anggota** dan **Aktif**. Produk nonaktif tidak bisa dijual dan tersembunyi dari daftar (centang **Tampilkan nonaktif** untuk melihatnya).
9. Pilih **Gambar** bila ada; gambar dikecilkan otomatis sebelum diunggah. Lalu **Simpan**.

## Harga dan HPP

- Setiap perubahan harga beli atau harga jual dicatat (siapa, kapan, dari berapa ke berapa).
- Produk tanpa kelola stok memakai harga beli sebagai HPP saat dijual.
- Produk berstok memakai HPP rata-rata dari stok masuk. Kelola stok tidak bisa dimatikan selama stoknya belum nol.

## Stok

Stok tidak diketik di form produk. Stok hanya berubah lewat stok masuk, penjualan, dan opname, supaya selalu cocok dengan akun Persediaan. Barang datang dicatat di menu **Stok Masuk**. Angka stok yang mencapai stok minimal ditandai kuning di daftar.
