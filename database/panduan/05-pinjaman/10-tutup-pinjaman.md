---
judul: Menutup pinjaman tanpa jurnal
ringkasan: Menandai pinjaman yang sudah selesai di luar koperasi sebagai lunas, tanpa setoran, tanpa jurnal, dan tanpa mengubah neraca. Alur, pengaruh ke neraca, dan cara membatalkannya.
menu: /dashboard/loans
---
> **Inti singkat:** Tutup Pinjaman hanya mengubah **status** pinjaman menjadi Lunas. Tidak ada uang masuk, **tidak ada jurnal**, dan **neraca tidak berubah**. Bila neraca perlu disesuaikan, akuntan membuat jurnal koreksi sendiri lewat Jurnal Umum.

## Kapan dipakai

Untuk pinjaman yang di sistem masih berjalan padahal sudah selesai **di luar koperasi**:

- Anggota melunasi pinjaman **langsung ke bank** (misalnya BRI), tidak lewat koperasi.
- Pinjaman ditutup karena **top-up** (diganti pinjaman baru).
- Data pinjaman **tertinggal saat migrasi** dari aplikasi lama.
- Pinjaman koperasi yang cicilannya sudah penuh, tetapi **sisa jasanya dibebaskan** pengurus. Tulis keputusan itu di alasan.

**Jangan dipakai** untuk menerima pelunasan. Uang yang benar-benar masuk ke koperasi dicatat lewat **Setoran Angsuran**, karena hanya cara itu yang membuat jurnal kas dan mengurangi piutang. Untuk pinjaman yang salah input, pakai **Batalkan Pencairan** atau **Batalkan Pinjaman** (lihat artikel *Membatalkan pinjaman, pencairan, dan angsuran*).

Tombol ini hanya untuk grup **superadmin** dan **admin**.

## Alur

1. Buka detail pinjaman lewat **Daftar Pinjaman** atau **Cari Pinjaman**.
2. Tekan **Tutup Pinjaman** di kanan atas.
3. Tulis alasannya, minimal 5 karakter, misalnya *Lunas langsung ke BRI tgl 5 Nov 2026, surat no. ...*, lalu tekan **OK**.
4. Sistem memeriksa:
   - Pinjaman yang sudah lunas ditolak.
   - Pinjaman yang ada di Potongan Gaji yang **sedang diposting** ditolak sampai periode itu selesai.
   - Pinjaman yang ada di Potongan Gaji **draf** tetap bisa ditutup; pesan sesudahnya menyebut periode yang perlu di-generate ulang.
5. Nilai lama disimpan di riwayat penutupan: jumlah cicilan sebelum ditutup, sisa saldo buku, alasan, operator, dan waktu. Inilah yang membuat penutupan bisa dibatalkan.
6. Jumlah cicilan terbayar disamakan dengan lama angsuran (misalnya 23 dari 59 menjadi 59 dari 59), sama dengan penutupan top-up di aplikasi desktop. Hanya itu yang diubah.

Pinjaman langsung berstatus **Lunas**, dan di halaman detail tampil siapa yang menutup, kapan, dan alasannya. Di Jadwal Angsuran, angsuran yang tidak pernah dibayar berstatus **Ditutup**, sedangkan yang sudah dibayar tetap **Terbayar**.

## Yang berubah dan yang tidak

| Berubah | Tidak berubah |
| --- | --- |
| Status menjadi Lunas di semua layar dan di aplikasi anggota | Jurnal umum dan buku besar |
| Tidak ikut Generate Potongan bulan berikutnya | **Neraca**: saldo akun piutang pinjaman tetap |
| Tidak tampil lagi di Kredit Macet | Laba rugi dan pendapatan jasa |
| Tidak lagi menghalangi anggota mengajukan pinjaman baru | Saldo akun kas dan bank |
| Angsuran yang belum dibayar berstatus Ditutup di jadwal | Riwayat pembayaran di buku pinjaman, SHU |

## Pengaruh ke neraca

Contoh (angka ilustrasi): pinjaman 100.000.000 sudah diangsur 23 kali dengan pokok 2.400.000 per bulan, jadi piutang di neraca tinggal 44.800.000.

| Yang terjadi | Piutang di neraca |
| --- | ---: |
| Sebelum ditutup | 44.800.000 |
| Tutup Pinjaman: **tidak ada jurnal** | — |
| Sesudah ditutup (status Lunas) | **44.800.000** |

Pinjaman sudah Lunas, tetapi neraca **masih mencatat piutang** 44.800.000 atas pinjaman itu. Selama tidak dikoreksi, saldo piutang di neraca lebih besar daripada sisa pinjaman yang masih berjalan.

### Jurnal koreksi oleh akuntan

Bila neraca perlu disesuaikan, akuntan membuat jurnal lewat **Akuntansi → Jurnal Umum**:

| Akun | Debit | Kredit |
| --- | ---: | ---: |
| Akun lawan sesuai kejadian | 44.800.000 | |
| Piutang Pinjaman (akun sesuai Jenis Kredit) | | 44.800.000 |

| Kejadian sebenarnya | Pilihan akun lawan (diputuskan akuntan) |
| --- | --- |
| Anggota melunasi langsung ke bank, dan koperasi juga mencatat utang ke bank itu | Utang ke bank yang bersangkutan |
| Pinjaman digantikan pinjaman baru (top-up) | Biasanya sudah tercatat saat pencairan pinjaman baru; periksa dulu agar tidak dobel |
| Sisa jasa atau pokok dibebaskan pengurus | Beban penghapusan piutang atau cadangan piutang tak tertagih |
| Data salah sejak migrasi | Koreksi saldo / ekuitas sesuai kebijakan akuntansi |

Jurnal koreksi **tidak dibuat otomatis** karena akun lawannya berbeda-beda tergantung kejadian. Beri tahu akuntan nomor pinjaman dan sisa saldo bukunya setiap kali menutup pinjaman.

## Potongan Gaji

- Bila pinjaman ada di periode **draf**, tutup dulu lalu **generate ulang** periode itu. Pesan setelah menutup menyebut periodenya.
- Bila pinjaman ada di periode yang **sedang diposting**, penutupan ditolak sampai periode itu selesai.

## Membatalkan penutupan

Bila keliru, buka lagi detail pinjaman dan tekan **Batalkan Penutupan**. Jumlah cicilan kembali seperti semula dan pinjaman kembali berjalan (ikut Potongan Gaji, tampil di Kredit Macet bila menunggak). Riwayat penutupan tetap tersimpan. Pembatalan penutupan juga tidak membuat jurnal; bila akuntan sudah membuat jurnal koreksi untuk pinjaman itu, jurnal tersebut harus dibalik terpisah lewat Jurnal Umum.

Selama pinjaman ditutup, angsuran dan pencairannya **tidak bisa dibatalkan**. Batalkan penutupannya dulu.

## Daftar periksa sebelum menutup

- Pinjaman benar sudah selesai di luar koperasi, dan ada buktinya (misalnya surat lunas dari bank).
- Tidak ada uang pelunasan yang masuk ke kas koperasi. Kalau ada, pakai Setoran Angsuran.
- Alasan ditulis jelas: apa yang terjadi, tanggal, dan nomor surat bila ada.
- Periode Potongan Gaji yang masih draf di-generate ulang sesudahnya.
- Akuntan diberi tahu nomor pinjaman dan sisa saldo bukunya.

Selama **Mode Uji**, penutupan dicoba lalu dibatalkan otomatis dan tidak tersimpan.
