---
judul: Bank Book (kas dan bank)
ringkasan: Rekening koran harian per akun kas atau bank, entri uang masuk dan keluar dengan keyboard, ubah, hapus, dan cetak voucher bukti BB.
menu: /dashboard/accounting/bank-book
---
**Akuntansi → Bank Book** adalah pengganti layar *Bank & Cash Book* desktop. Halaman ini mencatat transaksi kas dan bank yang tidak punya form sendiri (biaya, penerimaan lain, setoran ke bank) dan menampilkan saldo harian tiap akun kas atau bank.

## Membaca halaman

- **Daftar akun di sisi kiri**: semua akun kas dan bank (akun COA berketerangan GC atau BANK) beserta saldonya. Klik satu akun untuk membukanya.
- **Bulan dan Tahun** di atas menentukan periode; **Tampilkan** memuatnya. Kartu menampilkan saldo awal, total debit, total kredit, dan saldo akhir bulan itu.
- **Rekening koran harian**: satu baris per tanggal (tanggal naik) berisi saldo awal, debit, kredit, dan saldo akhir, lengkap dengan bilah halaman dan baris per halaman.
- **Klik tanggal** untuk membuka **jendela bukti hari itu**: daftar bukti dengan nomor, keterangan, akun lawan, debit, dan kredit. Dari sini Anda bisa mencetak voucher, mengubah, atau menghapus bukti, dan ada tautan ke **Buku Besar** akun itu pada tanggal yang sama.

Saldo memakai aturan saldo awal yang sama dengan Buku Besar, jadi angkanya selalu cocok dengan laporan lain.

## Mencatat bukti baru

1. Pilih akun kas/bank di sisi kiri, lalu tekan **Entri Baru**.
2. Akun kas/bank di bagian atas form **terkunci** sesuai pilihan Anda. Isi **Tanggal** dan **Keterangan**.
3. Di tabel, isi baris **akun lawan**: pilih **Akun** (bisa dicari), keterangan baris (boleh kosong), dan **Debit** atau **Kredit**. **Tidak ada pilihan uang masuk atau keluar**: sisi kas/bank dihitung otomatis dari selisih.
   - **Kredit** lebih besar dari debit = **uang masuk** (kas/bank didebit).
   - **Debit** lebih besar dari kredit = **uang keluar** (kas/bank dikredit).
4. Teks di bawah tabel menyebut hasilnya (misalnya *Uang keluar Rp 250.000 dari Bank BRI*). Tekan **Simpan Bukti** atau **Ctrl+S**.

Nomor bukti dibuat otomatis: `BB/yymmdd/NNN`, urut per hari, contoh `BB/261022/003`.

### Isian cepat dengan keyboard

| Tombol | Fungsi |
| --- | --- |
| Enter | Pindah isian: keterangan jurnal → akun → keterangan baris → Debit → Kredit → baris berikutnya |
| Enter di baris terakhir | Menambah baris baru otomatis (hanya bila akun baris itu sudah dipilih) |
| Enter setelah Debit terisi | Langsung ke baris berikutnya (Kredit dilewati) |
| Panah atas/bawah, Enter | Memilih akun dari daftar pencarian |
| Ctrl+S | Menyimpan bukti |

**Enter tidak menyimpan**; simpan hanya lewat tombol atau Ctrl+S, supaya bukti tidak tersimpan sebelum selesai.

## Mengubah dan menghapus

Dari jendela bukti hari itu, ikon **pensil** mengubah dan **tempat sampah** menghapus bukti `BB/`. Yang boleh dan tidak boleh:

- Hanya bukti **dibuat lewat Bank Book** (nomor `BB/`) yang bisa diubah atau dihapus. Bukti dari transaksi lain ditandai **Sistem**: ubah dari asal transaksinya.
- **Tanggal dan nomor tidak bisa diubah** (tanggal bagian dari nomor); hapus lalu buat bukti baru di tanggal lain.
- Bukti yang kas/bank-nya muncul lebih dari satu baris tidak bisa diubah di sini; ubah lewat **Jurnal Umum**.

Tanda *Reconcile* pada baris kas/bank diisi otomatis oleh Bank Book (seperti di desktop), bukan hasil rekonsiliasi bank, dan **tidak mengunci** bukti.

## Cetak voucher

Ikon **printer** di jendela bukti mencetak voucher bukti itu: kop koperasi, rincian akun, total, dan kolom tanda tangan (Dibuat, Diperiksa, Disetujui).

## Hak akses

Memakai izin menu *Buku Kas && Bank (Bank Book)*. Bukti `JU/` dan `BB/` yang dihapus lewat Jurnal Umum juga mengikuti izin menu masing-masing.
