---
judul: Menutup pinjaman tanpa jurnal
ringkasan: Menandai pinjaman yang sudah selesai di luar koperasi sebagai lunas, tanpa setoran, tanpa jurnal, dan tanpa mengubah neraca.
menu: /dashboard/loans
---
Dipakai untuk pinjaman yang di sistem masih berjalan padahal sudah selesai, misalnya dilunasi langsung ke bank, ditutup karena top-up, atau datanya tertinggal saat migrasi.

Tombol ini hanya untuk grup **superadmin** dan **admin**.

## Cara menutup

1. Buka detail pinjaman lewat **Daftar Pinjaman** atau **Cari Pinjaman**.
2. Tekan **Tutup Pinjaman** di kanan atas.
3. Tulis alasannya, misalnya *Lunas langsung ke BRI*, lalu tekan **OK**.

Pinjaman langsung berstatus **Lunas**, dan di halaman detail tampil siapa yang menutup, kapan, dan alasannya. Di Jadwal Angsuran, angsuran yang tidak pernah dibayar berstatus **Ditutup**, sedangkan yang sudah dibayar tetap **Terbayar**.

## Yang berubah dan yang tidak

| Berubah | Tidak berubah |
| --- | --- |
| Status menjadi Lunas di semua layar dan di aplikasi anggota | Jurnal, neraca, dan laporan keuangan |
| Tidak ikut Generate Potongan bulan berikutnya | Riwayat pembayaran di buku pinjaman |
| Tidak tampil lagi di Kredit Macet | Saldo akun kas dan bank |

Karena tidak ada jurnal, akun piutang di neraca **tetap memuat** sisa pinjaman yang ditutup. Bila akuntan menyimpulkan neraca perlu dikoreksi, buat lewat **Jurnal Umum**.

## Potongan Gaji

- Bila pinjaman ada di periode **draf**, tutup dulu lalu **generate ulang** periode itu. Pesan setelah menutup menyebut periodenya.
- Bila pinjaman ada di periode yang **sedang diposting**, penutupan ditolak sampai periode itu selesai.

## Membatalkan

Bila keliru, buka lagi detail pinjaman dan tekan **Batalkan Penutupan**. Jumlah cicilan kembali seperti semula dan pinjaman kembali berjalan. Riwayat penutupan tetap tersimpan.

Selama **Mode Uji**, penutupan dicoba lalu dibatalkan otomatis dan tidak tersimpan.
