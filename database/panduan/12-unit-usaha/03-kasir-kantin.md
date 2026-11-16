---
judul: Kasir kantin (POS)
ringkasan: Membuka sesi kasir, menjual dengan keyboard atau klik, bayar tunai atau Simpanan Sukarela (QR), cetak struk, menahan transaksi, dan menutup sesi dengan hitung uang laci.
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

## Bayar dengan Simpanan Sukarela (F9)

1. Minta anggota membuka **Kantin → Bayar dengan QR** di aplikasi anggota. QR itu berlaku 60 detik dan hanya sekali pakai.
2. Tekan **F9** (atau tombol **F9 Sukarela**), lalu pindai QR di HP anggota dengan kamera atau alat pemindai USB.
3. Begitu QR terbaca, pembayaran langsung tersimpan: saldo Simpanan Sukarela anggota terpotong sebesar total, struk tercetak, dan HP anggota menampilkan *Pembayaran berhasil* serta menerima notifikasi.

Pembayaran ditolak bila QR sudah kedaluwarsa atau sudah dipakai, saldo tidak cukup, melebihi batas per transaksi atau per hari, atau sisa saldo kurang dari saldo minimal (diatur di Daftar Unit Usaha, tab Pembayaran). Pesan penolakan tampil di jendela pindai.

## Bayar dengan QR kantin (F10)

Cara kedua, untuk HP anggota yang tidak bisa menampilkan QR (layar retak, kamera kasir bermasalah):

1. Tekan **F10** (atau tombol **F10 Sukarela (QR kantin)**). Layar kasir menampilkan QR tagihan sebesar total keranjang, berlaku 3 menit.
2. Anggota membuka **Kantin → Pindai QR kantin** di aplikasi anggota, memeriksa rincian belanja, lalu memasukkan **PIN transaksi**.
3. Begitu disetujui, layar kasir otomatis menutup tagihan dan mencetak struk.

Esc atau menutup jendela membatalkan tagihan. Bila waktunya habis, tekan **Buat QR baru**. Bila harga produk berubah setelah QR ditampilkan, pembayaran ditolak dan QR perlu dibuat ulang.

Setelah tersimpan, nomor nota (KTN-...) dan kembalian tampil di pojok kanan bawah, struk tercetak bila **Cetak struk otomatis** dicentang, dan keranjang kosong lagi.

## Pesanan dari aplikasi anggota (F6)

Anggota bisa memesan dari aplikasi (menu Kantin). Layar kasir memeriksa pesanan baru tiap 15 detik: tombol **F6 Pesanan aplikasi** menjadi kuning dan berbunyi pendek bila ada pesanan baru. Tekan **F6** untuk melihat daftarnya (nama, barang, catatan, cara bayar).

- **Proses** lalu **Siap diambil**: anggota menerima notifikasi di HP.
- Pesanan **Simpanan Sukarela** sudah dibayar saat dipesan. Setelah diserahkan, tekan **Sudah diambil**.
- Pesanan **tunai**: saat anggota datang, tekan **Muat ke keranjang**, lalu **F8 Bayar Tunai** seperti biasa. Pesanan otomatis selesai setelah nota tersimpan. Pesanan tunai yang tidak diambil sampai batas waktunya (pengaturan kantin) batal otomatis.
- **Tolak** dengan alasan: pesanan Simpanan Sukarela dikembalikan (nota dibatalkan, saldo anggota kembali, stok kembali).

## Tombol keyboard

| Tombol | Fungsi |
| --- | --- |
| F1 | Ke kotak cari |
| F2 | Pilih pembeli (anggota atau QR) |
| F3 | Diskon nota |
| F4 | Ganti tampilan kartu bergambar / tabel |
| F6 | Pesanan dari aplikasi anggota |
| F7 | Tahan transaksi; saat keranjang kosong, panggil transaksi terakhir yang ditahan |
| F8 | Bayar tunai |
| F9 | Bayar Simpanan Sukarela: pindai QR bayar di HP anggota |
| F10 | Bayar Simpanan Sukarela: tampilkan QR tagihan untuk dipindai anggota |
| Enter | Tambah produk dari kotak cari; simpan di layar bayar |
| ↑ ↓ | Pilih baris keranjang |
| + / − | Tambah / kurangi jumlah baris terpilih |
| Del | Hapus baris terpilih |
| Esc | Tutup dialog atau kosongkan kotak cari |
| Ctrl+P | Cetak ulang struk terakhir |

**+**, **−**, dan **Del** bekerja saat kotak cari kosong.

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

## Jurnal bayar Simpanan Sukarela

Saldo anggota berkurang lewat satu baris pengambilan Simpanan Sukarela bernomor sama dengan nota. Jurnalnya:

| Model | Jurnal |
| --- | --- |
| Milik koperasi | Simpanan Sukarela debit / Penjualan kredit; HPP debit / Persediaan kredit |
| Tenant bagi hasil | Simpanan Sukarela debit / Utang ke Tenant kredit (total dikurangi bagi hasil) dan Pendapatan Bagi Hasil kredit |
| Tenant sewa | Simpanan Sukarela debit / Utang ke Tenant kredit |

Utang ke tenant dibayar saat **Penyelesaian Tenant**.
