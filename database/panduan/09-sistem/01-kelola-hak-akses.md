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
