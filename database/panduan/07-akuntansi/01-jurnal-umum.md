---
judul: Jurnal umum
ringkasan: Membaca daftar jurnal, mencatat jurnal memorial di jendela, mengubah dan menghapus jurnal, mencetak voucher, dan aturan keseimbangan debit kredit.
menu: /dashboard/accounting/journal
---
**Akuntansi → Jurnal Umum** berisi **semua** baris jurnal: yang dibuat otomatis oleh transaksi (simpanan, pinjaman, angsuran) maupun jurnal memorial yang dicatat manual.

## Membaca daftar jurnal

- Baris dikelompokkan **per nomor bukti**, dengan **debit lebih dulu** lalu kredit lawannya.
- Saring **Sumber** (Simpanan, Pencairan Pinjaman, Angsuran Pinjaman, Angsuran KPR, dan lain-lain), periode **Dari / Sampai**, atau cari nomor bukti, kode akun, atau keterangan.
- Urutan bawaan adalah tanggal terbaru lebih dulu. Halaman memakai lebar yang sama dengan daftar lain, lengkap dengan baris per halaman dan **Cetak** serta **Ekspor**.

## Aksi per baris

Di sisi kanan tiap baris ada ikon:

| Ikon | Fungsi | Untuk bukti |
| --- | --- | --- |
| Printer | **Cetak voucher** | Semua bukti |
| Pensil | **Ubah** | Semua jenis bukti, kecuali jurnal tutup buku `TBT/` |
| Tempat sampah | **Hapus baris ini** | Semua jenis bukti, kecuali jurnal tutup buku `TBT/` |
| Mata | Detail baris | Semua |

**Voucher** adalah dokumen cetak satu bukti: kop koperasi, nomor bukti, tanggal, keterangan, rincian akun (kode, nama, keterangan, debit, kredit), total, dan tiga kolom tanda tangan (Dibuat, Diperiksa, Disetujui). Ukurannya otomatis muat di kertas A4.

> **Penting:** Bukti dari transaksi lain (simpanan, pinjaman, angsuran, SHU) kini bisa diubah atau dihapus dari sini, tetapi **hanya jurnalnya yang berubah**; saldo simpanan atau sisa pinjaman asalnya tidak ikut berubah dan bisa tidak sinkron dengan buku besar. Dialog dan form ubah memberi peringatan untuk bukti seperti ini. Untuk membatalkan transaksinya dengan benar, pakai Audit Data → Batalkan Transaksi. Jurnal tutup buku `TBT/` tetap terkunci; batalkan lewat menu Tutup Buku & SHU. Periode yang sudah ditutup ditolak.

Tanda *Reconcile* yang tampak pada baris kas/bank bukan rekonsiliasi bank: aplikasi desktop menandainya otomatis saat Bank Book disimpan, dan tanda itu **tidak menguncinya**.

## Mencatat jurnal memorial

Pakai jurnal memorial untuk transaksi yang tidak punya form sendiri, misalnya biaya operasional, penyusutan, atau koreksi.

1. Tekan **Jurnal Baru**; form terbuka di jendela (hanya tertutup lewat tombol X).
2. Isi **Tanggal** dan **Keterangan Jurnal** (wajib). **No. Bukti** tampil otomatis mengikuti tanggal; nomor finalnya diberikan saat disimpan, jadi bisa berbeda bila ada jurnal lain yang tersimpan lebih dulu. **No. Reff** bawaan sama dengan No. Bukti dan boleh diganti, misalnya dengan nomor nota atau faktur.
3. Isi baris: pilih **Akun** (ketik kode atau nama untuk mencari), lalu isi **Debit** atau **Kredit**. Isian uang diformat ribuan otomatis. Keterangan baris terisi otomatis dengan nama akun dan boleh diganti; bila dikosongkan memakai keterangan jurnal.
4. Tambah baris sesuai kebutuhan; hapus baris dengan ikon tempat sampah.
5. Tunggu sampai penanda **Seimbang** muncul, lalu tekan **Simpan Jurnal**.

## Jenis jurnal: umum dan penyesuaian

Kolom **Jenis** memberi lencana *Penyesuaian* pada jurnal penyesuaian, dan filter **Jenis** memisahkannya. Ikon **timbangan** di baris jurnal `JU/` menandai jurnal lama sebagai penyesuaian (atau mengembalikannya). Jurnal penyesuaian baru dicatat di menu *Jurnal Penyesuaian* (lihat panduannya).

## Mengubah jurnal umum

Tekan ikon pensil pada baris jurnal `JU/`. Isinya dimuat ke form yang sama; ubah akun, nominal, atau keterangan lalu **Simpan Perubahan**. **Nomor bukti dan tanggal tidak bisa diubah** (tanggal bagian dari nomor): untuk pindah tanggal, hapus jurnal lalu buat yang baru.

## Menghapus baris jurnal

Ikon tempat sampah menghapus **satu baris**, misalnya baris kosong bernilai nol dengan kode akun `0`. Bukti harus tetap seimbang, jadi baris bernilai yang membuat bukti tidak seimbang tidak bisa dihapus sendiri. Dalam kasus itu sistem menawarkan menghapus **seluruh bukti**. Bukti di tahun yang sudah ditutup atau bukti Bank Book yang sudah direkonsiliasi ditolak.

Baris kosong juga bisa dihapus dari **Akuntansi → Jurnal Bermasalah**: ikon di baris bernilai nol, atau tombol **Hapus ... baris kosong** untuk semuanya sekaligus. Tombol sekaligus butuh izin hapus di Jurnal Umum dan Bank Book. Baris berisi di bukti yang sama tidak berubah, dan bukti yang terkunci dilewati.

### Aksi langsung di Jurnal Bermasalah

Tiap bukti di **Jurnal Bermasalah** punya kolom **Aksi**: ikon **pensil** mengubah jurnalnya dan ikon **tempat sampah** menghapus seluruh bukti jurnal, tanpa membuka Jurnal Umum dulu. Untuk bukti dari transaksi lain (nomor berawalan `SMPK-`/`SMPM-` simpanan, `ANGS-CR-` angsuran pinjaman, `ANGS-KPR-` angsuran KPR, atau nomor pinjaman) ada ikon **kaca pembesar**: modal info yang membaca master transaksinya (anggota, jenis, tanggal, jumlah, akun kas, operator) sebagai info saja.

Dari modal itu, operator yang berizin **hapus di Batal Transaksi** bisa menghapus **transaksi beserta seluruh jurnalnya** (alasan minimal 10 karakter). Aturannya: simpanan boleh dihapus selama saldo tidak menjadi negatif; angsuran hanya yang terakhir (cicilan dan jadwal tagih kembali, jadi bisa dibayar lagi); transaksi dari Potongan Gaji, pinjaman yang sedang ditutup, dan periode yang sudah ditutup ditolak. Pencairan pinjaman hanya ditampilkan; batalkan lewat Audit Data. Salinan transaksi dan jurnalnya yang dihapus tercatat di riwayat koreksi Audit Data (aksi *Hapus*). Jurnal tutup buku `TBT/` tidak punya aksi di sini.

Pilihan **Akun** di Jurnal Umum, Jurnal Penyesuaian, dan Bank Book hanya memuat akun detail. Akun induk seperti *AKTIVA LANCAR* atau *BEBAN USAHA* tidak tampil supaya tidak salah pilih. Jurnal lama yang terlanjur memakai akun induk tetap bisa dibuka dan diubah.

## Aturan jurnal

| Aturan | Pesan bila dilanggar |
| --- | --- |
| Minimal dua baris yang berisi nilai | *Jurnal minimal dua baris berisi nilai* |
| Satu baris hanya debit **atau** kredit | *Baris 2: isi debit atau kredit, bukan keduanya* |
| Nilai berupa angka | *Baris 1: nilai harus angka* |
| Total debit = total kredit | *Jurnal ... tidak seimbang: debit ... kredit ...* |
| Keterangan jurnal wajib | *Keterangan jurnal wajib diisi* |
| Akun harus ada di COA | *Akun ... tidak ada di perkiraan* |
| Akun harus akun detail, bukan akun induk | *Akun ... adalah akun induk; pilih akun detail di bawahnya* |

Nomor jurnal dibuat otomatis: `JU/yymmdd/n`, contoh `JU/261022/1205`.

> **Tips:** Untuk membetulkan jurnal yang sudah dipakai laporan periode lampau, lebih aman membuat **jurnal koreksi** (kebalikan) dengan keterangan yang menyebut nomor jurnal yang dikoreksi, terutama untuk tahun yang sudah ditutup buku.
