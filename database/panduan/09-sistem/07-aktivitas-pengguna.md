---
judul: Aktivitas Pengguna
ringkasan: Melihat admin dan anggota yang sedang online, menu yang dibuka, dan riwayat login serta aksi simpan selama 90 hari.
menu: /dashboard/settings/aktivitas
---
Menu: **Sistem → Aktivitas Pengguna**. Bawaannya izin diberikan ke grup admin dan bisa diatur di **Kelola Hak Akses**.

## Sedang Online

Tab ini memperbarui diri tiap 30 detik. Pengguna dianggap online bila aktif dalam 5 menit terakhir.

| Kolom | Isi |
| --- | --- |
| Kode / Grup | Grup untuk admin, kode anggota untuk anggota |
| Jenis | Admin, Anggota (PWA), atau Anggota (Android) |
| Sedang di | Menu yang sedang dibuka |
| Perangkat | Browser dan sistem operasi |

Tab browser yang ditinggal atau tertutup berhenti mengirim sinyal, jadi penggunanya hilang dari daftar dalam 5 menit. Menekan **Logout** langsung menghapusnya dari daftar.

Aplikasi Android lama tidak melaporkan menu yang dibuka, jadi kolom **Sedang di** hanya berisi *Aplikasi Android*. Statusnya berasal dari permintaan terakhir aplikasi ke server. Anggota yang sedang membaca satu layar tanpa memuat data baru bisa tampak tidak online.

## Riwayat Aktivitas

Saring dengan tanggal, jenis pengguna, aksi, atau kata kunci, lalu tekan **Terapkan**. **Cetak** dan **Ekspor** mengikuti tab yang terbuka. Layar memuat sampai 5.000 aktivitas terbaru.

| Aksi | Yang dicatat |
| --- | --- |
| Login, Logout | Admin, PWA, dan Android. Logout Android tidak tercatat |
| Login gagal | Baris diberi warna merah. Nama yang diketik tidak disimpan bila akunnya tidak ada |
| Simpan | Transaksi, data master, potongan, SHU, hak akses, operator, backup, pengajuan, dan pendaftaran |
| Buka halaman | Halaman yang dibuka anggota di **PWA** (Beranda, Simpanan, Pinjaman, Potongan Gaji, SHU, Pesan, Akun, dan seterusnya), dicatat saat anggota pindah halaman |

**Buka halaman** jauh lebih banyak daripada aksi lain, jadi **tidak tampil** di *Semua Aksi*. Pilih aksi **Buka halaman** untuk melihatnya, dan isi kolom pencarian dengan nama anggota atau nama halaman untuk mempersempit. Halaman yang sama dibuka berulang dalam 20 detik (muat ulang) dihitung sekali. Yang disimpan hanya nama halaman; kode anggota atau nomor pinjaman pada alamat tidak ikut tercatat. Hanya anggota PWA; admin dan aplikasi Android tidak dicatat halamannya.

Aksi yang dilakukan saat **Mode Uji** diberi tanda *[Mode uji]* karena datanya tidak tersimpan. Simpan yang gagal validasi tidak dicatat.

## Membersihkan riwayat

Khusus **superadmin**. Di tab Riwayat Aktivitas, tekan **Bersihkan Riwayat**, pilih rentang (lebih dari 30 hari, lebih dari 7 hari, atau semua), ketik `HAPUS`, lalu tekan **Hapus Riwayat**.

Riwayat yang dihapus tidak bisa dikembalikan, kecuali dari backup. Penghapusannya selalu meninggalkan satu baris riwayat berisi siapa dan berapa baris yang dihapus. Status Sedang Online tidak ikut terhapus. Saat **Mode Uji** aktif, riwayat tidak benar-benar dihapus.

## Yang tidak dicatat

Password, kata kunci pencarian, isi pesan, isi form, dan nilai rupiah tidak disimpan. Untuk rincian transaksi, buka bukti aslinya lewat nomornya.

> **Penting:** Riwayat dihapus otomatis setelah 90 hari. Ini bukan pengganti **Riwayat koreksi** di Audit Data, yang tersimpan permanen.
