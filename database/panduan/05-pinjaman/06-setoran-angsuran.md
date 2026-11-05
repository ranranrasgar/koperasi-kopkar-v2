---
judul: Setoran angsuran pinjaman dan KPR
ringkasan: Membayar angsuran berikutnya, mengubah jasa/adm/provisi, aturan jumlah KPR, pelunasan, dan jurnal angsuran.
menu: /dashboard/loans/payment
---
Menu: **Pinjaman → Setoran Angsuran**. Ada dua tab: **Pinjaman Tunai** dan **KPR**. Tab yang tampil mengikuti izin Anda.

## Membatalkan angsuran atau pencairan

Transaksi yang sudah diposting tidak bisa diubah atau dihapus. Operator berizin **Batalkan transaksi** (Kelola Hak Akses, baris Audit Data; awalnya hanya superadmin) bisa membatalkannya dengan alasan minimal 10 karakter:

- **Pinjaman tunai**: buka detail pinjaman. Ikon batal ada di baris **angsuran terakhir**; tombol **Batalkan Pencairan** ada bila belum ada angsuran.
- **KPR**: masukkan nomor buktinya di **Sistem → Audit Data**, bagian *Batalkan transaksi lewat nomor bukti*.

Sistem membuat pembalik `BTL...` bertanggal hari ini beserta jurnal kebalikannya. Baris asal tetap terlihat di buku pinjaman dengan tanda *DIBATALKAN*.

- Angsuran hanya bisa dibatalkan dari yang terakhir. Jadwal dan hitungan cicilan kembali, jadi angsuran itu bisa dibayar lagi.
- Pencairan hanya bisa dibatalkan bila belum ada angsuran. Pinjamannya tetap ada di Daftar Pinjaman dengan sisa 0 dan tampil sebagai lunas; detailnya menampilkan keterangan pembatalan.
- Ditolak untuk angsuran dari Potongan Gaji yang diposting di web, pinjaman yang sedang ditutup tanpa jurnal, serta pencairan yang masih ada di periode Potongan Gaji belum selesai atau masih punya titipan.
- Titipan yang sudah **POSTING** tidak kembali otomatis saat angsurannya dibatalkan.
- Pembatalan tidak bisa diurungkan, dan tercatat di **Audit Data**, bagian Riwayat koreksi.

## Angsuran pinjaman tunai

1. Pilih **Anggota**. Daftar **Pinjaman** berisi pinjaman yang masih berjalan, dengan format *nomor | jenis | pokok | sudah dibayar/lama*.
2. Pilih pinjaman. Sistem menampilkan **Angsuran ke-n dari lama** beserta pokok, jasa, adm, provisi, dan total.
3. Isi **Tanggal Bayar** dan **Diterima di Kas/Bank**, lalu **Simpan**.

### Aturan angsuran tunai

- Pembayaran selalu untuk **angsuran berikutnya** secara berurutan. Satu kali simpan = satu angsuran.
- **Pokok selalu sesuai jadwal** dan tidak bisa diubah.
- Centang **Ubah jasa/adm/provisi** bila ada keputusan khusus, misalnya adm dibebaskan. Isi nilai baru di kotak yang muncul.
- Pembayaran sebagian atau pelunasan beberapa angsuran sekaligus belum tersedia; catat angsuran satu per satu.
- Setelah angsuran terakhir, pinjaman berstatus lunas dan tidak muncul lagi di daftar. Mencoba membayar lagi menghasilkan *Pinjaman ... sudah lunas*.

### Yang dibuat sistem

| Data | Isi |
| --- | --- |
| Nomor bukti | `ANGS-CR-mmyy-urut` |
| Rincian | Baris *Setoran ke n* berisi pokok, jasa, adm, provisi, dan sisa pokok/jasa |
| Jadwal tagih | Baris angsuran ke-n ditandai terbayar (nomor bukti, tanggal bayar) |
| Jurnal | **Debit** kas/bank sebesar total; **Kredit** piutang (pokok), pendapatan jasa, adm, dan provisi |

Contoh angsuran ke-1 pinjaman C01 Rp 6.000.000:

| Akun | Debit | Kredit |
| --- | --- | --- |
| Kas/bank penerima | 650.000 | |
| Piutang pinjaman (pokok) | | 500.000 |
| Pendapatan jasa | | 90.000 |
| Pendapatan adm | | 60.000 |

## Angsuran KPR

1. Pilih **Anggota**, lalu **KPR** yang masih berjalan.
2. **Jumlah (Rp)**: kosongkan untuk memakai angsuran per bulan (atau sisa pokok bila lebih kecil). Isi bila anggota membayar jumlah lain.
3. Isi **Tanggal Bayar** dan **Diterima di Kas/Bank**, lalu **Simpan**.

### Aturan angsuran KPR

- Jumlah harus lebih dari nol dan **tidak boleh melebihi sisa pokok** (*Jumlah ... melebihi sisa pokok ...*).
- Bila jumlah dikosongkan, **angsuran terakhir** otomatis mengambil sisa pokok persis sehingga KPR pas lunas.
- Nomor bukti `ANGS-KPR-mmyy-urut`. Jurnal: **Debit** kas/bank, **Kredit** akun titipan KPR.

## Mengirim ulang informasi kredit

Di tab **KPR**, di bawah ringkasan KPR yang dipilih ada tautan **Kirim info ke anggota**: mengirim ulang notifikasi dan email berisi ringkasan serta PDF jadwal angsuran ke anggota pemilik KPR itu. Untuk pinjaman tunai, tombolnya ada di halaman detail pinjaman.

## Mencetak kwitansi

Setelah transaksi tersimpan, tombol **Cetak Kwitansi** muncul di kotak hasil. Jendela cetak terbuka dengan pilihan kertas **Continuous 9,5 x 5,5 in** atau **A4/2**; pilih yang sama di pengaturan printer, lalu tekan **Cetak**. Tampilannya hitam polos supaya tajam di printer dot matrix seperti LX-300 dan Epson 2210.

Cetak ulang angsuran pinjaman tunai: buka detail pinjaman, tab **Riwayat Pembayaran**, lalu tekan ikon printer di baris angsurannya.

Dalam Mode Uji transaksi tidak tersimpan, jadi tombol ini tidak muncul.
