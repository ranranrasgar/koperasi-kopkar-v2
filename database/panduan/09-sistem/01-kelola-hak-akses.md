---
judul: Mengelola hak akses grup
ringkasan: Matriks grup × menu untuk mengatur menu yang boleh dibuka setiap grup operator.
menu: /dashboard/settings/akses
---
Menu **Sistem & Pengaturan → Kelola Hak Akses** hanya untuk grup **superadmin**.

## Matriks Hak Akses

Baris adalah menu dengan nama, kelompok, dan urutan yang sama persis dengan **menu samping**; kolom adalah grup operator. **Centang = grup boleh membuka menu itu**, dan menunya langsung muncul di menu samping operator grup itu.

Beberapa menu punya sub-baris karena izinnya memang terpisah, misalnya **Daftar Pinjaman** (Koperasi, Bank / pihak lain, KPR) dan **Daftar Anggota** (Kelola data, Tambah anggota baru, Lihat laporan). Menu tampil di menu samping bila minimal satu sub-barisnya dicentang, dan isinya mengikuti yang dicentang.

1. Ketik di kotak **Cari menu** untuk menemukan menu.
2. Centang atau hapus centang pada kotak di kolom grup yang dimaksud.
3. Perubahan **langsung tersimpan** dan berlaku pada klik berikutnya operator di grup itu, tanpa perlu login ulang.

## Aturan

| Aturan | Keterangan |
| --- | --- |
| Grup superadmin selalu punya semua akses | Kolomnya tidak bisa diubah: *Grup superadmin selalu punya semua akses* |
| Operator dan Kelola Hak Akses khusus superadmin | Barisnya bertulisan *Khusus superadmin*, tanpa kotak centang |
| Pusat Panduan untuk semua operator | Barisnya bertulisan *Semua operator*, tanpa kotak centang |
| Dashboard selalu tampil | Centangnya hanya mengatur apakah ringkasan angka di Dashboard terlihat |
| Pesan Anggota ada di kelompok Navbar | Dibuka dari ikon pesan di bagian atas, bukan dari menu samping |
| Cari Pinjaman mengikuti izin pinjaman | Hasil pencarian hanya memuat grup pinjaman yang boleh dilihat grup itu (laporan, pencairan, angsuran, tunggakan, atau pengajuan) |
| Izin pencairan dan angsuran pinjaman per grup pinjaman | Lihat panduan *Hak akses dan kenapa menu saya berbeda* |

## Saran pembagian akses

| Grup | Contoh akses |
| --- | --- |
| Kasir | Setoran/pengambilan simpanan, setoran angsuran, laporan simpanan |
| admin | Semua transaksi, data anggota, laporan |
| Pengurus | Laporan, pengajuan kredit, SHU |
| Pengawas | Laporan saja (tanpa transaksi) |

Berikan akses paling sedikit yang dibutuhkan untuk pekerjaan masing-masing, terutama untuk menu pencairan dan jurnal umum.

## Mengatur tambah, lihat, ubah, dan hapus

Setiap sel berisi satu baris centang **C R U D**:

| Centang | Arti |
| --- | --- |
| **C** (Create) | Tambah: input data atau transaksi baru, termasuk proses seperti posting, tutup buku, dan hitung SHU |
| **R** (Read) | Lihat: grup boleh membuka menu itu |
| **U** (Update) | Ubah: mengubah data atau bukti yang sudah ada, termasuk memutuskan pengajuan |
| **D** (Delete) | Hapus: menghapus data atau bukti |

Hanya aksi yang tersedia di menu itu yang tampil, misalnya Setoran Simpanan hanya punya C dan R, dan laporan hanya R. Lepas C, U, dan D untuk membuat grup hanya bisa melihat. Bawaannya semua dicentang, jadi grup yang sudah punya akses tidak berubah sampai Anda mengaturnya.

Menu yang di aplikasi desktop terdiri dari beberapa izin (Daftar Anggota, Karyawan Mattel, User Mobile, Setoran Angsuran, Input Pinjaman Tunai, Daftar Pinjaman, Kredit Macet, Transaksi Potongan, Buku Besar, SHU, dan Audit Data) tampil satu baris. Satu centang berlaku untuk semua grup pinjaman: tidak bisa lagi membedakan Koperasi dan Bank dari halaman ini. Mencentang R hanya membuka menu; C, U, dan D harus dicentang sendiri, dan baru aktif bila R dicentang. Tombol yang tidak diizinkan disembunyikan di menu master, jurnal, dan Bank Book; di form transaksi lain, simpan ditolak dengan pesan *Grup ... tidak boleh ...*. Membatalkan transaksi diatur lewat **D** di baris Audit Data, bawaannya hanya superadmin. Di baris SHU, C mencakup hitung, posting, dan pencairan SHU, sedangkan D membatalkan pencairan.
