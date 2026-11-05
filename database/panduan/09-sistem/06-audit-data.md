---
judul: Audit Data
ringkasan: Memeriksa kesesuaian simpanan, pinjaman tunai, KPR, dan Buku Besar, lalu memperbaiki temuannya satu per satu.
menu: /dashboard/settings/audit
---
Menu: **Sistem → Audit Data**. Halaman ini mencari data yang tidak cocok antara transaksi dan jurnal. Pemeriksaannya hanya membaca; data baru berubah bila Anda memakai **Buat jurnal susulan** atau **Batalkan transaksi**. Bawaannya izin menu ini diberikan ke grup admin dan bisa diatur di **Kelola Hak Akses**.

## Memakai halaman

1. Isi periode **Dari** dan **Sampai**, lalu **Tampilkan**. Bawaannya tahun berjalan. Tautan **Sejak 2018** memeriksa seluruh riwayat setelah pindah data; hasilnya lebih lama muncul.
2. Setiap pemeriksaan menampilkan jumlah temuan dan nilainya, atau **Bersih** bila tidak ada temuan.
3. Klik judul pemeriksaan untuk melihat rinciannya. Layar menampilkan 500 baris terbaru; **Ekspor** memuat sampai 5.000 baris. Klik nomor bukti untuk membuka asalnya.

## Memperbaiki hasil temuan

Audit Data hanya menunjukkan yang tidak cocok. Sebelum memperbaiki, pastikan dulu apa yang benar: transaksinya atau jurnalnya.

### Langkah kerja

1. Kerjakan **tahun berjalan dulu**, karena hanya tahun ini yang jurnalnya masih bisa dibuat dengan tanggal aslinya.
2. Tekan **Ekspor** dan pakai hasilnya sebagai daftar kerja, supaya setiap baris tercatat keputusannya.
3. Periksa baris satu per satu. Klik nomor bukti, lalu cocokkan dengan mutasi bank, potongan gaji, atau bukti kertas.
4. Pilih cara perbaikan dari tabel di bawah. Untuk tahun yang sudah ditutup, putuskan bersama akuntan.
5. Tekan **Tampilkan** lagi, lalu pastikan barisnya hilang. Baris yang memang tidak bisa hilang diberi catatan di daftar kerja.
6. Terakhir, tekan **Hitung perbandingan saldo** untuk melihat sisa selisihnya.

Pastikan aplikasi tidak sedang **Mode Uji**, karena dalam mode itu perbaikan tidak tersimpan.

### Empat cara perbaikan

| Cara | Dipakai bila | Tempat | Izin |
| --- | --- | --- | --- |
| **Jurnal susulan** | Transaksi benar terjadi, jurnalnya tidak ada, tahunnya masih terbuka | Ikon di baris temuan | **C** Jurnal Umum |
| **Batalkan transaksi** | Transaksi keliru atau tidak pernah terjadi | Bagian **Batalkan transaksi lewat nomor bukti** di halaman ini | **D** Audit Data |
| **Jurnal koreksi** | Tahunnya sudah ditutup, atau nilai jurnal yang salah | **Akuntansi → Jurnal Umum → Jurnal Baru** | **C** Jurnal Umum |
| **Dibiarkan dengan catatan** | Data lama yang sudah diperiksa akuntan, misalnya saldo awal pindah data | Daftar kerja | - |

### Cara perbaikan per temuan

| Temuan | Periksa dulu | Perbaikan |
| --- | --- | --- |
| **Simpanan tanpa jurnal** | Apakah uangnya ada di mutasi bank | Benar terjadi: jurnal susulan. Tidak pernah terjadi: batalkan. Baris akhir 2017 umumnya saldo awal: biarkan dengan catatan |
| **Nilai simpanan berbeda** | Mana yang benar, simpanan atau jurnal | Simpanan salah: batalkan, lalu input ulang dengan nilai benar. Jurnal salah: jurnal koreksi sebesar selisihnya |
| **Jurnal simpanan tanpa transaksi** | Apakah anggota benar menyetor | Benar: input simpanannya, lalu balik jurnal lamanya dengan jurnal koreksi supaya tidak tercatat dua kali. Tidak pernah terjadi: jurnal koreksi saja |
| **Pencairan tanpa jurnal** | Mutasi bank pencairan. Pinjaman 2017 umumnya saldo awal | Benar terjadi: jurnal susulan. Tidak pernah terjadi dan belum ada angsuran: batalkan |
| **Angsuran tanpa jurnal** | Mutasi bank atau potongan gaji bulan itu | Benar terjadi: jurnal susulan. Keliru: batalkan bila itu angsuran terakhir |
| **Nilai angsuran berbeda** | Pokok, jasa, adm, dan provisi di buku pinjaman dibanding jurnalnya | Buku salah dan angsuran terakhir: batalkan, lalu input ulang. Selain itu: jurnal koreksi sebesar selisihnya |
| **Hitungan cicilan berbeda** | Buka pinjamannya, bandingkan kolom Bayar dengan baris angsuran | Tidak ada jurnal yang perlu dibuat. Wajar bila pinjaman dilunasi lewat potongan atau ditutup: biarkan dengan catatan. Bila pinjaman masih berjalan dan salah, minta pengelola sistem memperbaiki datanya |
| **Cicilan selesai masih bersaldo** | Apakah pinjaman dilunasi langsung ke bank atau di-top-up | **Tutup Pinjaman** tidak bisa dipakai karena cicilannya sudah selesai. Bila piutang di neraca harus dikeluarkan: jurnal koreksi. Bila tidak: biarkan dengan catatan |
| **Pokok dibayar melebihi pinjaman** | Apakah ada angsuran dobel | Angsuran terakhir yang dobel: batalkan. Selain itu: jurnal koreksi, dan bila uangnya harus dikembalikan, catat pengembaliannya bersama akuntan |
| **Angsuran KPR tanpa jurnal** | Mutasi bank bulan itu | Sama dengan angsuran pinjaman tunai |
| **Nilai angsuran KPR berbeda** | Buku KPR dibanding jurnalnya | Sama dengan nilai angsuran pinjaman tunai |
| **Pokok KPR dibayar berlebih** | Apakah ada angsuran dobel | Sama dengan pokok pinjaman dibayar berlebih |

Bagian lain halaman ini diselesaikan seperti berikut.

- **Bukti tidak seimbang:** buka **Jurnal Bermasalah**. Jurnal `JU/` bisa diubah dari Jurnal Umum bila tahunnya masih terbuka. Selain itu, buat jurnal koreksi sebesar selisihnya.
- **Baris ke akun yang tidak ada di COA:** tambahkan akunnya di COA bila akun itu seharusnya ada. Bila kode akunnya salah, pindahkan nilainya dengan jurnal koreksi.
- **Saldo buku berbeda dengan Buku Besar:** selesaikan temuan lain dulu, karena selisihnya biasanya berasal dari temuan itu. Sisanya dibereskan dengan jurnal koreksi hanya bila akuntan setuju.

### Memakai jurnal susulan

Jendelanya menampilkan jurnal yang akan dibuat, dengan rumus dan akun yang sama dengan posting aslinya. Isi alasan minimal 10 karakter, misalnya hasil pencocokan mutasi bank, lalu simpan. Jurnal memakai nomor bukti dan tanggal transaksi aslinya, jadi temuan itu hilang dari daftar dan tercatat di Riwayat koreksi.

Jurnal susulan ditolak dalam keadaan berikut. Tahun tertutup baru ditolak saat menekan simpan.

| Penolakan | Yang dilakukan |
| --- | --- |
| Tahun sudah ditutup | Jurnal koreksi di periode berjalan |
| Akun kas tidak tercatat di transaksi, umumnya data lama | Tentukan akunnya dari mutasi bank, lalu jurnal koreksi |
| Bukti sudah punya jurnal | Tidak perlu tindakan, atau periksa di temuan nilai berbeda |
| Bukti sudah dibatalkan | Tidak perlu tindakan |

### Memakai pembatalan

Pembatalan tidak menghapus transaksi. Sistem membuat bukti pembalik bertanggal hari ini, jadi bisa dipakai untuk transaksi tahun lama. Bila transaksi asalnya berjurnal, jurnalnya ikut dibalik.

- Angsuran hanya bisa dibatalkan mulai dari yang terakhir. Pencairan harus sudah tidak punya angsuran.
- Transaksi dari Potongan Gaji tidak bisa dibatalkan satu per satu, dan bukti SHU dikoreksi lewat menu SHU atau jurnal.
- Pembatalan setoran ditolak bila saldo simpanan anggota tidak cukup.

### Memakai jurnal koreksi

1. Tentukan akun dan nilainya bersama akuntan.
2. Buat jurnal di **Jurnal Umum** dengan tanggal periode berjalan.
3. Tulis nomor bukti yang dikoreksi di **Keterangan Jurnal**, misalnya `Koreksi ANGS-CR-1026-173936`, dan isi **No. Reff** dengan nomor yang sama.

Jurnal koreksi memperbaiki Buku Besar, tetapi nomor buktinya berbeda. Karena itu temuan aslinya **tetap tampil** di Audit Data. Catat nomor `JU/` pengganti di daftar kerja supaya tidak dikoreksi dua kali.

## Daftar pemeriksaan

| Modul | Pemeriksaan | Artinya |
| --- | --- | --- |
| Simpanan | Transaksi tanpa jurnal | Saldo anggota terhitung, tetapi tidak masuk Buku Besar |
| Simpanan | Nilai berbeda dengan jurnal | Nilai transaksi tidak sama dengan total debit jurnal. Bukti SHU tidak diperiksa |
| Simpanan | Jurnal tanpa transaksi | Buku Besar terisi, tetapi saldo anggota tidak |
| Pinjaman Tunai | Pencairan tanpa jurnal | Pinjaman tidak punya jurnal pencairan |
| Pinjaman Tunai | Angsuran tanpa jurnal | Sisa pinjaman berkurang, tetapi Buku Besar tidak |
| Pinjaman Tunai | Nilai angsuran berbeda dengan jurnal | Pokok + jasa + adm + provisi tidak sama dengan total debit jurnal |
| Pinjaman Tunai | Hitungan cicilan berbeda dengan buku | Kolom Bayar tidak sama dengan jumlah baris angsuran. Sebagian wajar, misalnya pinjaman yang ditutup |
| Pinjaman Tunai | Cicilan selesai tetapi masih bersaldo | Saldo pokok masih lebih dari Rp 100 |
| Pinjaman Tunai | Pokok dibayar melebihi pinjaman | Pokok yang dibayar melebihi pokok pinjaman lebih dari Rp 100 |
| KPR | Angsuran tanpa jurnal, nilai berbeda, pokok dibayar berlebih | Sama seperti pinjaman tunai. Pencairan KPR memang tidak berjurnal |

Bagian **Buku Besar** menampilkan jumlah bukti tidak seimbang dan baris ke akun yang tidak ada di COA, dengan tautan ke **Jurnal Bermasalah**.

Bagian **Saldo buku dibandingkan Buku Besar** membandingkan saldo simpanan, pinjaman, dan KPR dengan saldo akunnya, posisi hari ini. Bagian ini dihitung saat Anda menekan **Hitung perbandingan saldo**, karena memeriksa semua pinjaman.

Bagian **Riwayat koreksi** menampilkan 100 koreksi terakhir, baik pembatalan maupun jurnal susulan: waktu, bukti, aksi, pembalik, alasan, dan operatornya.

> **Penting:** Temuan adalah bahan pemeriksaan, belum tentu kesalahan. Data akhir 2017 kemungkinan saldo awal saat pindah data, dan selisih bisa berasal dari jurnal manual. Telusuri bersama akuntan sebelum mengoreksi, dan jangan membuat jurnal untuk transaksi yang tidak bisa dibuktikan.
