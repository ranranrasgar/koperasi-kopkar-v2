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
| Pensil | **Ubah** | Hanya jurnal umum `JU/` |
| Tempat sampah | **Hapus** | Jurnal umum `JU/` dan bukti Bank Book `BB/` |
| Mata | Detail baris | Semua |

**Voucher** adalah dokumen cetak satu bukti: kop koperasi, nomor bukti, tanggal, keterangan, rincian akun (kode, nama, keterangan, debit, kredit), total, dan tiga kolom tanda tangan (Dibuat, Diperiksa, Disetujui). Ukurannya otomatis muat di kertas A4.

> **Penting:** Bukti yang dibuat oleh transaksi lain (simpanan, pinjaman, angsuran, SHU, tutup buku) **tidak bisa diubah atau dihapus dari sini**, supaya buku pembantunya (saldo simpanan, sisa pinjaman) tidak tidak sinkron. Ubah atau batalkan dari asal transaksinya. Server menolak dengan pesan alasannya.

Tanda *Reconcile* yang tampak pada baris kas/bank bukan rekonsiliasi bank: aplikasi desktop menandainya otomatis saat Bank Book disimpan, dan tanda itu **tidak menguncinya**.

## Mencatat jurnal memorial

Pakai jurnal memorial untuk transaksi yang tidak punya form sendiri, misalnya biaya operasional, penyusutan, atau koreksi.

1. Tekan **Jurnal Baru**; form terbuka di jendela (hanya tertutup lewat tombol X).
2. Isi **Tanggal** dan **Keterangan Jurnal** (wajib).
3. Isi baris: pilih **Akun** (ketik kode atau nama untuk mencari), lalu isi **Debit** atau **Kredit**. Isian uang diformat ribuan otomatis. Keterangan baris boleh diisi; bila kosong memakai keterangan jurnal.
4. Tambah baris sesuai kebutuhan; hapus baris dengan ikon tempat sampah.
5. Tunggu sampai penanda **Seimbang** muncul, lalu tekan **Simpan Jurnal**.

## Jenis jurnal: umum dan penyesuaian

Kolom **Jenis** memberi lencana *Penyesuaian* pada jurnal penyesuaian, dan filter **Jenis** memisahkannya. Ikon **timbangan** di baris jurnal `JU/` menandai jurnal lama sebagai penyesuaian (atau mengembalikannya). Jurnal penyesuaian baru dicatat di menu *Jurnal Penyesuaian* (lihat panduannya).

## Mengubah jurnal umum

Tekan ikon pensil pada baris jurnal `JU/`. Isinya dimuat ke form yang sama; ubah akun, nominal, atau keterangan lalu **Simpan Perubahan**. **Nomor bukti dan tanggal tidak bisa diubah** (tanggal bagian dari nomor): untuk pindah tanggal, hapus jurnal lalu buat yang baru.

## Aturan jurnal

| Aturan | Pesan bila dilanggar |
| --- | --- |
| Minimal dua baris yang berisi nilai | *Jurnal minimal dua baris berisi nilai* |
| Satu baris hanya debit **atau** kredit | *Baris 2: isi debit atau kredit, bukan keduanya* |
| Nilai berupa angka | *Baris 1: nilai harus angka* |
| Total debit = total kredit | *Jurnal ... tidak seimbang: debit ... kredit ...* |
| Keterangan jurnal wajib | *Keterangan jurnal wajib diisi* |
| Akun harus ada di COA | *Akun ... tidak ada di perkiraan* |

Nomor jurnal dibuat otomatis: `JU/yymmdd/n`, contoh `JU/261022/1205`.

> **Tips:** Untuk membetulkan jurnal yang sudah dipakai laporan periode lampau, lebih aman membuat **jurnal koreksi** (kebalikan) dengan keterangan yang menyebut nomor jurnal yang dikoreksi, terutama untuk tahun yang sudah ditutup buku.
