---
judul: Kasir kantin (POS)
ringkasan: Membuka sesi kasir, menjual dengan keyboard atau klik, bayar tunai, cetak struk, menahan transaksi, dan menutup sesi dengan hitung uang laci.
menu: /dashboard/kantin/kasir
---
Menu: **Unit Usaha → Kasir Kantin**. Kasir hanya melihat kantin tempat ia ditugaskan; bila lebih dari satu, pilih kantinnya dulu.

## Buka sesi

Setiap kasir membuka sesinya sendiri. Hitung uang modal di laci, ketik nilainya, lalu **Enter**. Selama sesi terbuka, semua penjualan tunai kasir itu dihitung ke laci.

## Menjual

1. Tambahkan produk dengan salah satu cara:
   - klik kartu produk (atau baris di tampilan tabel);
   - ketik nama atau kode di kotak cari lalu **Enter** (produk teratas yang cocok masuk keranjang);
   - pindai barcode: pemindai mengetik kode lalu Enter, produknya langsung masuk.
2. Atur jumlah dengan tombol **+** / **−** di baris keranjang, atau keyboard (lihat tabel). Stok produk yang dikelola stoknya tidak bisa melebihi sisa.
3. Pembeli (opsional untuk tunai): **F2**, cari anggota atau pindai QR dari HP anggota. Tanpa pembeli, nota tercatat sebagai **Pembeli umum**.
4. Diskon nota (opsional): **F3**, isi rupiah atau pilih 5% / 10%.
5. **F8 Bayar Tunai**: uang diterima terisi sebesar total (uang pas) dan sudah tersorot, jadi cukup ketik nominal yang diterima, atau pilih tombol pecahan. Kembalian tampil besar. **Enter** menyimpan.

Setelah tersimpan, nomor nota (KTN-...) dan kembalian tampil di pojok kanan bawah, struk tercetak bila **Cetak struk otomatis** dicentang, dan keranjang kosong lagi.

## Tombol keyboard

| Tombol | Fungsi |
| --- | --- |
| F1 | Ke kotak cari |
| F2 | Pilih pembeli (anggota atau QR) |
| F3 | Diskon nota |
| F4 | Ganti tampilan kartu bergambar / tabel |
| F7 | Tahan transaksi; saat keranjang kosong, panggil transaksi terakhir yang ditahan |
| F8 | Bayar tunai |
| Enter | Tambah produk dari kotak cari; simpan di layar bayar |
| ↑ ↓ | Pilih baris keranjang |
| + / − | Tambah / kurangi jumlah baris terpilih |
| Del | Hapus baris terpilih |
| Esc | Tutup dialog atau kosongkan kotak cari |
| Ctrl+P | Cetak ulang struk terakhir |

**+**, **−**, dan **Del** bekerja saat kotak cari kosong. F9 dan F10 (bayar dengan Simpanan Sukarela lewat QR) belum aktif.

## Struk

Struk dicetak lewat dialog cetak browser, lebar 72 mm (printer termal 58/80 mm). Atur printer termal sebagai printer bawaan di komputer kasir; di Chrome dapat dijalankan dengan pilihan cetak tanpa dialog (*kiosk printing*) supaya struk langsung keluar.

## Tutup sesi

Tekan **Tutup sesi** di kanan atas. Layar menampilkan modal awal, penjualan tunai, dan uang yang **seharusnya** ada di laci. Hitung uang fisik, ketik nilainya, beri catatan bila ada selisih, lalu **Tutup sesi**.

- Kantin **milik koperasi**: selisih dijurnal ke akun **Selisih Kas Kantin** (kurang: debit Selisih, kredit Kas Kantin; lebih: sebaliknya).
- Kantin **tenant**: uang laci milik tenant; selisih hanya dicatat.

Setor uang kantin milik koperasi ke kas induk lewat **Bank Book** (Kas Induk debit, Kas Kantin kredit).

## Jurnal penjualan tunai

| Model | Jurnal |
| --- | --- |
| Milik koperasi | Kas Kantin debit / Penjualan kredit sebesar total; HPP debit / Persediaan kredit sebesar harga pokok barang |
| Tenant bagi hasil | Piutang Tenant debit / Pendapatan Bagi Hasil kredit sebesar persen kontrak; uang tunainya dipegang tenant |
| Tenant sewa | Tanpa jurnal |
