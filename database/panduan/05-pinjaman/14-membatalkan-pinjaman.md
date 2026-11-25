---
judul: Membatalkan pinjaman, pencairan, dan angsuran
ringkasan: Alur, syarat, dan pengaruh ke jurnal dari Batalkan angsuran, Batalkan Pencairan, Batalkan Pinjaman, dan Batalkan KPR, beserta bedanya dengan Tutup Pinjaman.
menu: /dashboard/loans
---
Transaksi pinjaman yang sudah diposting **tidak pernah dihapus atau diubah**. Untuk membatalkannya, sistem membuat **transaksi pembalik** bertanggal hari pembatalan, lengkap dengan jurnal kebalikannya. Transaksi asal tetap tersimpan dengan tanda **DIBATALKAN**, sehingga saldo dan laporan periode lama tetap utuh dan jejaknya bisa diperiksa.

Tempat pembatalan pinjaman:

| Tombol | Tempat | Untuk |
| --- | --- | --- |
| **Ikon batal** di baris angsuran | Detail pinjaman, tab Jadwal Angsuran | Membatalkan **angsuran terakhir** saja |
| **Batalkan Pencairan** | Detail pinjaman, kanan atas | Pinjaman yang **belum punya angsuran** |
| **Batalkan Pinjaman** | Detail pinjaman, kanan atas | Pinjaman yang **sudah punya angsuran**: semua angsuran lalu pencairannya dibatalkan sekaligus |
| **Batalkan KPR** | Detail KPR, kanan atas | KPR yang belum punya angsuran |
| **Batalkan transaksi lewat nomor bukti** | Sistem → Audit Data | Angsuran terakhir atau pencairan, termasuk KPR, lewat nomor buktinya |

## Siapa yang bisa

Operator berizin **D** pada baris Audit Data (Batal Transaksi) di **Kelola Hak Akses**. Awalnya hanya superadmin. Operator tanpa izin ini tidak melihat tombol dan ikon batal.

## Alur pembatalan

1. Buka detail pinjaman.
2. Tekan tombol atau ikon batal yang sesuai.
3. Tulis **alasan**, minimal 10 karakter. Contoh: *Salah input nominal, seharusnya 1.500.000*. Alasan ini tersimpan permanen.
4. Tekan tombol merah **Batalkan**, lalu jawab **Ya** di dialog konfirmasi. Dialog ini mengingatkan bahwa pembatalan **tidak bisa diurungkan**.
5. Sistem memeriksa syaratnya (lihat bagian berikut). Bila ada yang tidak terpenuhi, muncul pesan penyebabnya dan **tidak ada data yang berubah**.
6. Bila lolos, sistem:
   - menandai transaksi asal **DIBATALKAN**,
   - membuat bukti pembalik bertanggal **hari ini**,
   - membalik jurnal asal baris per baris (akun kas/bank sama dengan transaksi asal),
   - mencatat pembatalan di **Audit Data → Riwayat koreksi** (waktu, bukti, alasan, operator).
7. Halaman diperbarui dan pesan hasil menyebutkan nomor bukti pembaliknya.

Di **Mode Uji**, pembatalan dijalankan lalu langsung di-rollback, jadi tidak tersimpan.

## Nomor bukti pembalik

| Awalan | Membatalkan |
| --- | --- |
| BTLA | Angsuran pinjaman tunai |
| BTLC | Pencairan pinjaman tunai |
| BTLKA | Angsuran KPR |
| BTLKC | Pencairan KPR |

Contoh: `BTLA-2611-152340` adalah pembalik angsuran yang dibuat November 2026.

## 1. Membatalkan angsuran terakhir

**Syarat:**

- Hanya angsuran **terakhir** yang bisa dibatalkan, supaya urutan cicilan tetap utuh. Untuk membatalkan angsuran ke-5 dari 7, batalkan dulu ke-7, lalu ke-6, lalu ke-5.
- Angsuran yang berasal dari **Potongan Gaji** tidak bisa dibatalkan satu per satu.
- Pinjaman yang sedang **ditutup** harus dibatalkan penutupannya dulu.

**Hasilnya:**

- Penghitung cicilan mundur satu, dan angsuran itu kembali **belum dibayar** di jadwal, jadi bisa dibayar ulang lewat Setoran Angsuran.
- Di Riwayat Pembayaran, baris asal dan pembaliknya tampil berdampingan dan saling meniadakan.
- Titipan yang sudah **POSTING** tidak kembali otomatis.

**Jurnal** (contoh angsuran 2.500.000 = pokok 2.400.000 + jasa 100.000):

| Jurnal | Akun | Debit | Kredit |
| --- | --- | ---: | ---: |
| Angsuran asal | Kas / Bank | 2.500.000 | |
| | Piutang Pinjaman | | 2.400.000 |
| | Pendapatan Jasa Pinjaman | | 100.000 |
| **Pembalik (BTLA)** | Piutang Pinjaman | 2.400.000 | |
| | Pendapatan Jasa Pinjaman | 100.000 | |
| | Kas / Bank | | 2.500.000 |

Artinya: piutang kembali naik, pendapatan jasa berkurang, dan kas berkurang. Bila uangnya memang tidak pernah diterima (salah input), kas di buku kembali benar. Adm dan provisi, bila ada, ikut dibalik.

## 2. Batalkan Pencairan

Tombol ini muncul bila pinjaman **belum punya angsuran**.

**Syarat:**

- Belum ada angsuran sama sekali.
- Pinjaman tidak sedang ditutup.
- Pinjaman tidak ada di periode **Potongan Gaji** yang belum diposting. Generate ulang atau selesaikan periode itu dulu.
- Tidak ada **titipan angsuran** yang belum diposting.

**Hasilnya:**

- Pinjaman tetap ada di Daftar Pinjaman dengan sisa 0 dan berstatus **Lunas**. Detailnya menampilkan keterangan pembatalan.
- Pinjaman tidak ikut Generate Potongan, tidak tampil di Kredit Macet, dan aplikasi anggota menganggapnya selesai.

**Jurnal** (contoh pencairan 100.000.000):

| Jurnal | Akun | Debit | Kredit |
| --- | --- | ---: | ---: |
| Pencairan asal | Piutang Pinjaman | 100.000.000 | |
| | Kas / Bank | | 100.000.000 |
| **Pembalik (BTLC)** | Kas / Bank | 100.000.000 | |
| | Piutang Pinjaman | | 100.000.000 |

Artinya: piutang hilang dari neraca dan kas kembali. Pastikan uangnya memang tidak jadi keluar, atau sudah dikembalikan anggota ke rekening yang sama.

## 3. Batalkan Pinjaman (sudah ada angsuran)

Untuk pinjaman yang salah input, atau anggota membatalkan pinjaman dan mengembalikan uangnya, padahal sudah ada angsuran.

**Alurnya otomatis:** semua angsuran dibatalkan dari yang terakhir sampai yang pertama, lalu pencairannya, semuanya dengan alasan yang sama. Semua langkah berjalan dalam satu kesatuan: **bila satu langkah saja ditolak** (misalnya ada angsuran dari Potongan Gaji), **tidak ada yang diubah**, dan pesannya menyebut penyebabnya.

**Syarat:** gabungan syarat pembatalan angsuran dan pencairan di atas. Yang paling sering menghalangi adalah angsuran yang berasal dari Potongan Gaji.

**Pengaruh ke kas.** Contoh pinjaman 100.000.000 yang sudah 3 kali diangsur 2.500.000 (pokok 2.400.000 + jasa 100.000):

| Langkah | Kas / Bank | Piutang | Pendapatan Jasa |
| --- | ---: | ---: | ---: |
| 3 × pembalik angsuran (BTLA) | −7.500.000 | +7.200.000 | −300.000 |
| Pembalik pencairan (BTLC) | +100.000.000 | −100.000.000 | |
| **Bersih** | **+92.500.000** | Piutang pinjaman ini nol | Jasa 300.000 batal |

Artinya, buku menganggap anggota mengembalikan **92.500.000** ke koperasi: pokok 100.000.000 dikurangi angsuran yang sudah dibayarnya 7.500.000. Pastikan uang yang benar-benar diterima sama dengan angka bersih ini. Bila kesepakatannya berbeda (misalnya jasa yang sudah dibayar tidak dikembalikan), selisihnya dicatat akuntan lewat Jurnal Umum.

**Jangan** mencatat pengembalian pinjaman sebagai angsuran berjasa 0. Pinjaman akan tampil di aplikasi anggota seperti dibayar berkali-kali, dan jasanya tercatat tidak ditagih. Bila sudah terlanjur, pakai Batalkan Pinjaman.

## 4. Batalkan KPR

Di detail KPR, tombol **Batalkan KPR** muncul bila KPR belum punya angsuran. Detail KPR tidak punya ikon batal per angsuran: angsuran KPR terakhir dibatalkan lewat **Sistem → Audit Data**, bagian *Batalkan transaksi lewat nomor bukti*, dengan aturan yang sama (hanya yang terakhir, bukan dari Potongan Gaji). Pencairan KPR tidak berjurnal, jadi pembatalannya hanya membalik buku KPR. Angsuran KPR yang berjurnal dibalik jurnalnya seperti angsuran pinjaman tunai.

## Batal vs Tutup Pinjaman

| | Batalkan (Pencairan / Pinjaman / angsuran) | Tutup Pinjaman |
| --- | --- | --- |
| Untuk | Transaksi yang **salah** atau **dibatalkan** | Pinjaman yang **sudah selesai di luar koperasi** |
| Jurnal | **Ada**, jurnal pembalik bertanggal hari ini | **Tidak ada** |
| Neraca | Piutang dan kas ikut terkoreksi | Tidak berubah; piutang tetap |
| Buku pinjaman | Ada baris pembalik | Tidak berubah |
| Bisa diurungkan | **Tidak** | Ya, lewat Batalkan Penutupan |
| Alasan | Minimal 10 karakter | Minimal 5 karakter |
| Yang berhak | Izin D Batal Transaksi | Superadmin dan admin |

## Bila keliru membatalkan

Pembatalan tidak bisa diurungkan. Bila transaksinya ternyata benar, **input ulang** transaksi itu: Pencairan Pinjaman Tunai untuk pencairan, Setoran Angsuran untuk angsuran. Pinjaman yang diinput ulang mendapat nomor baru.

## Mengecek hasilnya

- **Detail pinjaman**: baris DIBATALKAN dan pembaliknya di Riwayat Pembayaran.
- **Buku Pinjaman**: status **Dibatalkan** dan **Pembalik**.
- **Jurnal Umum**: cari nomor bukti asal atau pembaliknya. Kedua jurnal terkunci dan tidak bisa diubah dari sana.
- **Audit Data → Riwayat koreksi**: siapa, kapan, dan alasannya.
