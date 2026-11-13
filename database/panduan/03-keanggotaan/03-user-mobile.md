---
judul: User Mobile (akun aplikasi anggota)
ringkasan: Daftar akun aplikasi anggota, filter pendaftaran baru, dan aksi setujui, tolak, password sementara, hapus, serta jadikan anggota.
menu: /dashboard/members/mobile-users
---
Anggota memakai **aplikasi anggota** (di browser HP, dan aplikasi Android lama) untuk melihat saldo simpanan, pinjaman, dan mengajukan kredit. Semua akunnya tampil di **Keanggotaan → User Mobile**. Cara kerja pendaftaran akun baru dijelaskan lengkap di kategori **Pendaftaran Anggota Baru (Admin)**; halaman ini ringkasannya.

## Kolom tabel

| Kolom | Arti |
| --- | --- |
| Username | Nama login anggota |
| Kode Anggota / Nama | Anggota pemilik akun |
| KPK | Nomor KPK anggota pemilik akun (kosong bila akun belum terhubung ke anggota). Pencarian juga bisa memakai KPK. |
| Email | Email akun |
| Status | **Aktif**, **Tidak aktif**, **Menunggu** (pendaftaran baru), atau **Ditolak** |
| Notifikasi | Apakah perangkat sudah menerima notifikasi (tersembunyi; buka lewat **Kolom**) |
| Verifikasi Email | *Terverifikasi* (email sudah dikonfirmasi anggota dengan kode, jadi menerima email), *Belum* (sudah diisi tetapi belum dikonfirmasi), atau *Belum ada* |
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
| Silang oranye (**Nonaktifkan**) | Akun Aktif | Menonaktifkan akun kapan saja. Pemilik akun langsung keluar dari aplikasi anggota (browser dan Android) dan tidak bisa masuk sampai diaktifkan lagi. Data simpanan dan pinjaman tidak berubah. |
| Centang hijau (**Aktifkan**) | Akun Tidak aktif atau Ditolak | Mengaktifkan kembali akun. Akun yang pendaftarannya dulu ditolak hanya bisa diaktifkan bila emailnya sudah terverifikasi. Bila akun belum terhubung ke anggota, gunakan **Jadikan anggota** sesudahnya. |
| Ikon tambah orang (**Jadikan anggota**) | Akun aktif yang belum terhubung ke anggota | Membuat data anggota (atau menautkan ke anggota dengan NIK yang sama). |
| Kunci (**Buat password sementara**) | Akun Aktif | Untuk anggota yang lupa password dan tidak bisa memakai **Lupa password** di aplikasi. Sistem membuat password acak 12 karakter yang **hanya tampil sekali**: salin lalu sampaikan langsung ke anggota pemilik akun (jangan lewat grup). Password lama langsung tidak berlaku dan perangkat yang sedang masuk akan keluar. Di aplikasi web anggota, anggota **wajib membuat password baru** begitu masuk; aplikasi Android lama tidak memaksa, jadi minta anggota segera menggantinya di menu Akun. |
| Amplop (**Ubah email akun**) | Semua baris | Mengganti email akun atas permintaan anggota (mis. email lama tidak aktif). Setelah disimpan, **kode verifikasi dan tombol tautan langsung dikirim ke email baru itu** (berlaku 24 jam); anggota tinggal membuka emailnya, menekan tombol, dan mengetik kodenya. Sampai itu dilakukan statusnya *Belum* dan email belum menerima notifikasi. Memilih ikon ini lagi pada email yang sama mengirim ulang kodenya. Anggota dikabari lewat notifikasi HP, dan email lama diberi tahu. Satu email hanya untuk satu akun. |
| Tempat sampah (**Hapus**) | Semua baris | Menghapus akun beserta data aplikasinya. Akun yang sudah terhubung ke anggota hanya boleh dihapus **superadmin atau grup admin**. Untuk akun beranggota, ketik kode anggota pada kotak verifikasi bila keanggotaannya ikut dihapus (hanya bila belum ada transaksi); status karyawan kembali bukan anggota. |
| Mata (**Detail**) | Semua baris | Melihat semua kolom baris itu. |

## Yang perlu diketahui

- Password anggota diatur anggota sendiri. Pengurus tidak bisa melihat password anggota; pengurus hanya bisa membuat **password sementara** (ikon kunci) yang wajib diganti anggota.
- Username tidak membedakan huruf besar/kecil. Satu email hanya untuk satu akun.
- Pengajuan kredit dari aplikasi anggota masuk ke **Pinjaman Tunai → Pengajuan Kredit**.
- Perubahan status akun (diaktifkan atau dinonaktifkan) diberitahukan lewat email ke pemilik akun, **hanya bila email sudah terverifikasi**. Di mode uji tidak ada yang tersimpan maupun terkirim.
- Notifikasi (himbauan, promo, keputusan pengajuan) juga dikirim ke email anggota, **hanya bila email sudah terverifikasi**. Pesan chat tidak dikirim lewat email.
- Hak akses halaman ini: menu *User* atau *Request User && Anggota Baru* pada grup operator.
