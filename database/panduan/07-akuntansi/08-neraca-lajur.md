---
judul: Neraca lajur
ringkasan: Kertas kerja akuntansi satu lembar: neraca saldo, jurnal penyesuaian, saldo disesuaikan, laba rugi, dan neraca, beserta cara membacanya.
menu: /dashboard/accounting/worksheet
---
Menu **Akuntansi → Neraca Lajur** menampilkan kertas kerja akhir periode dalam satu tabel. Hak aksesnya sama dengan *Trial Balance* (Neraca Saldo). Pilih periode dengan **Dari** dan **Sampai** (bawaannya 1 Januari tahun ini sampai hari ini), lalu **Tampilkan**. Hasilnya bisa dicetak atau diekspor.

## Lima pasang kolom

Tiap akun yang punya saldo atau mutasi tampil satu baris, dengan kolom Debit dan Kredit pada masing-masing:

| Kolom | Isi |
| --- | --- |
| **Neraca Saldo** | Saldo akun **sebelum penyesuaian**: saldo awal periode (dari saldo pembuka tutup buku terakhir) ditambah mutasi semua jurnal **selain** jurnal penyesuaian |
| **Penyesuaian** | Jumlah debit dan kredit **jurnal penyesuaian** (status *Penyesuaian*) dalam periode, dicatat di menu Jurnal Penyesuaian atau jurnal umum yang ditandai |
| **Disesuaikan** | Neraca Saldo ditambah Penyesuaian |
| **Laba Rugi** | Akun pendapatan dan biaya dari kolom Disesuaikan |
| **Neraca** | Akun aktiva, hutang, dan modal dari kolom Disesuaikan |

Saldo ditulis di sisi **debit** bila positif dan di sisi **kredit** bila negatif. Angka penyesuaian diberi warna ungu supaya mudah dikenali.

## Laba (rugi) bersih

Baris **Laba bersih** (atau Rugi bersih) di bawah daftar akun ialah selisih kolom Laba Rugi: pendapatan (kredit) dikurangi biaya (debit). Nilainya ditambahkan ke sisi yang lebih kecil di kolom Laba Rugi dan ke sisi lawannya di kolom Neraca, sehingga **jumlah** tiap kolom Laba Rugi dan Neraca menjadi seimbang. Angkanya sama dengan *SHU Tahun Berjalan* di Neraca pada Laporan Keuangan.

## Yang perlu diperhatikan

- **Jurnal tutup buku (TBT) tidak dihitung** sebagai mutasi, supaya pendapatan dan biaya tampil utuh walaupun periode melewati 31 Desember.
- Akun yang saldonya ada tetapi **tidak ada di COA** ditandai *(tidak masuk laba rugi/neraca)*; saldonya hanya tampil di kolom Neraca Saldo dan Disesuaikan.
- Bila total debit dan kredit Neraca Saldo tidak sama, muncul peringatan kuning dengan tautan ke **Jurnal Bermasalah** (jurnal lama yang tidak seimbang di data). Selisih itu terbawa ke kolom berikutnya sampai jurnalnya diperbaiki.
- Bila belum ada jurnal penyesuaian pada periode, kolom Penyesuaian kosong dan Disesuaikan sama dengan Neraca Saldo.

## Alur penggunaan di akhir periode

1. Pastikan semua transaksi periode sudah tercatat.
2. Catat jurnal penyesuaian (penyusutan, beban dibayar di muka, dan sebagainya) di **Jurnal Penyesuaian**. Jurnal penyesuaian lama dari desktop bisa ditandai dari Jurnal Umum.
3. Buka **Neraca Lajur**, periksa kolom Penyesuaian dan Disesuaikan, lalu cetak sebagai kertas kerja.
4. Lanjutkan ke **Tutup Buku** bila periodenya akhir tahun.
