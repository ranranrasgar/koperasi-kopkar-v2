---
judul: Mencatat pengambilan simpanan
ringkasan: Syarat pengambilan, pemeriksaan saldo, nomor bukti, dan jurnal pengambilan.
menu: /dashboard/savings/withdraw
---
Menu: **Simpanan → Pengambilan Simpanan**. Membutuhkan izin menu pencairan simpanan.

## Sebelum mencatat

- Pastikan anggota membawa bukti permintaan pengambilan sesuai kebijakan koperasi.
- Periksa saldo jenis simpanan yang akan diambil di panel informasi anggota.
- Untuk simpanan pokok, wajib, dan berjangka, pastikan ada dasar pengambilan (lihat *Aturan simpanan*).

## Langkah

1. Pilih **Anggota**, atau tekan ikon **QR** dan pindai QR dari HP anggota; anggota dan jenis simpanannya terisi otomatis. Tetap cocokkan identitas anggota sebelum menyerahkan uang.
2. Pilih **Jenis Simpanan** yang akan diambil.
3. Isi **Tanggal** dan **Jumlah (Rp)**.
4. Pilih **Kas/Bank** sumber uang keluar.
5. Isi **Keterangan** bila perlu, lalu **Simpan**.

## Pemeriksaan saldo

Sistem menolak pengambilan yang melebihi saldo jenis simpanan itu, dengan pesan seperti:

*Saldo Simpanan Sukarela 150.000 kurang dari pengambilan 200.000*

Saldo dihitung ulang pada saat penyimpanan, jadi transaksi lain yang baru saja tersimpan untuk anggota yang sama ikut diperhitungkan.

## Yang dibuat sistem

| Data | Isi |
| --- | --- |
| Nomor bukti | `SMPK-yymm-urut`, contoh `SMPK-2610-304583` |
| Buku simpanan | Satu baris pengambilan dengan saldo baru |
| Jurnal | **Debit** akun jenis simpanan, **Kredit** akun kas/bank |

Contoh pengambilan sukarela Rp 500.000:

| Akun | Debit | Kredit |
| --- | --- | --- |
| 2.1.00.20 Simpanan Sukarela | 500.000 | |
| 1.1.01.31 Kas Simp. Sukarela | | 500.000 |

## Mencetak kwitansi

Setelah transaksi tersimpan, tombol **Cetak Kwitansi** muncul di kotak hasil. Jendela cetak terbuka dengan pilihan kertas **Continuous 9,5 x 5,5 in** atau **A4/2**; pilih yang sama di pengaturan printer, lalu tekan **Cetak**. Tampilannya hitam polos supaya tajam di printer dot matrix seperti LX-300 dan Epson 2210.

Cetak ulang: buka **Buku Simpanan**, lalu tekan ikon printer di baris transaksinya.

Dalam Mode Uji transaksi tidak tersimpan, jadi tombol ini tidak muncul.
