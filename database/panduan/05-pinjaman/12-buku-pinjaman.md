---
judul: Buku Pinjaman
ringkasan: Mencari bukti pembayaran angsuran pinjaman tunai dan KPR anggota, sisa pokoknya, status jurnal, dan cetak ulang kwitansi.
menu: /dashboard/loans/ledger
---
Menu: **Angsuran & Pemantauan → Buku Pinjaman**. Fungsinya seperti **Buku Simpanan**, untuk mengecek bukti pembayaran angsuran anggota. Halaman ini hanya untuk melihat; pembayaran dicatat di **Setoran Angsuran**.

## Mencari bukti

1. Ketik nomor bukti, nomor pinjaman, kode anggota, KPK, atau nama.
2. Saring dengan **Grup**, **Jenis**, **Dari Tanggal**, dan **Sampai Tanggal** bila perlu.
3. Baris di bawah judul halaman menjumlahkan seluruh hasil saringan.

Bawaannya terbaru dulu. **Cetak** dan **Ekspor** memuat seluruh hasil saringan. Tombol **Kolom** menampilkan kolom tambahan: Kode Agt, KPK, Grup, Adm, Provisi, Kas/Bank, dan Keterangan.

## Kolom

| Kolom | Arti |
| --- | --- |
| Ke | Angsuran ke berapa. Nilai 0 berarti baris pembatalan |
| Total Bayar | Pokok + jasa + adm + provisi |
| Sisa Pokok | Sisa pinjaman setelah pembayaran ini, dihitung dari seluruh riwayat pinjaman |
| Jurnal | **Belum** berarti bukti ini tidak punya jurnal. Perbaikannya ada di panduan **Audit Data** |
| Status | **Dibatalkan** untuk angsuran yang dibatalkan, **Pembalik** untuk bukti pembatalannya |

Klik **No. Pinjaman** untuk membuka detail pinjaman atau KPR. Ikon printer mencetak ulang kwitansi; baris pembatalan tidak punya kwitansi.

## Hak akses

Izinnya baris **Buku Pinjaman** di Kelola Hak Akses. Baris yang tampil mengikuti grup pinjaman yang ditangani operator: operator yang hanya menangani KPR hanya melihat bukti KPR.

Pinjaman yang ditutup tanpa jurnal dan pencairan tidak tampil di sini, karena keduanya bukan pembayaran.
