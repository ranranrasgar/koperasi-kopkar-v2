---
judul: User Mobile (akun aplikasi anggota)
ringkasan: Daftar akun aplikasi anggota, filter pendaftaran baru, dan aksi setujui, tolak, hapus, serta jadikan anggota.
menu: /dashboard/members/mobile-users
---
Anggota memakai **aplikasi anggota** (di browser HP, dan aplikasi Android lama) untuk melihat saldo simpanan, pinjaman, dan mengajukan kredit. Semua akunnya tampil di **Keanggotaan → User Mobile**. Cara kerja pendaftaran akun baru dijelaskan lengkap di kategori **Pendaftaran Anggota Baru (Admin)**; halaman ini ringkasannya.

## Kolom tabel

| Kolom | Arti |
| --- | --- |
| Username | Nama login anggota |
| Kode Anggota / Nama | Anggota pemilik akun |
| Email | Email akun |
| Status | **Aktif**, **Tidak aktif**, **Menunggu** (pendaftaran baru), atau **Ditolak** |
| Notifikasi | Apakah perangkat sudah menerima notifikasi (tersembunyi; buka lewat **Kolom**) |
| Dibuat / Diubah | Tanggal akun dibuat dan terakhir diubah |

## Filter Status

| Pilihan | Isinya |
| --- | --- |
| Anggota baru (menunggu) | Pendaftaran baru yang belum Anda putuskan |
| Sudah disetujui | Pendaftaran baru yang Anda setujui |
| Ditolak | Pendaftaran baru yang Anda tolak |
| Aktif / Tidak aktif | Semua akun menurut status aktifnya, termasuk akun lama |

## Aksi di setiap baris

| Tombol | Muncul di | Fungsi |
| --- | --- | --- |
| Centang hijau (**Setujui**) | Baris Menunggu | Mengaktifkan akun. Karyawan Mattel yang belum anggota otomatis dijadikan anggota. Hanya bisa bila email pendaftar sudah terverifikasi. |
| Silang oranye (**Tolak**) | Baris Menunggu | Akun tetap nonaktif; pendaftar diberi tahu lewat email. |
| Ikon tambah orang (**Jadikan anggota**) | Akun aktif yang belum terhubung ke anggota | Membuat data anggota (atau menautkan ke anggota dengan NIK yang sama). |
| Tempat sampah (**Hapus**) | Semua baris | Menghapus akun beserta data aplikasinya. Akun yang sudah terhubung ke anggota hanya boleh dihapus **superadmin atau grup admin**. Untuk akun beranggota, ketik kode anggota pada kotak verifikasi bila keanggotaannya ikut dihapus (hanya bila belum ada transaksi); status karyawan kembali bukan anggota. |
| Mata (**Detail**) | Semua baris | Melihat semua kolom baris itu. |

## Yang perlu diketahui

- Password anggota diatur anggota sendiri dan **tidak bisa diubah dari web admin**.
- Username tidak membedakan huruf besar/kecil. Satu email hanya untuk satu akun.
- Pengajuan kredit dari aplikasi anggota masuk ke **Pinjaman → Pengajuan Kredit**.
- Notifikasi (himbauan, promo, keputusan pengajuan) juga dikirim ke email anggota, **hanya bila email sudah terverifikasi**. Pesan chat tidak dikirim lewat email.
- Hak akses halaman ini: menu *User* atau *Request User && Anggota Baru* pada grup operator.
