---
judul: Menyetujui, menolak, dan menghapus akun
ringkasan: Langkah memutuskan pendaftaran di User Mobile, dan aturan hapus akun (termasuk akun yang sudah terhubung ke anggota).
menu: /dashboard/members/mobile-users
---
Semua keputusan dilakukan di **Keanggotaan → User Mobile**. Pilih filter **Anggota baru (menunggu)** untuk melihat yang perlu diputuskan.

## Menyetujui

1. Periksa baris pendaftar: nama, NIK (kolom KPK), dan email.
2. Klik **centang hijau (Setujui)**, lalu konfirmasi.
3. Akun menjadi aktif. Bila pendaftar karyawan Mattel yang belum anggota, data anggota dibuat otomatis dan **kode anggota** tampil di pesan hasil. Kode itu juga dikirim ke email pendaftar.

> **Syarat:** email pendaftar harus sudah terverifikasi. Bila belum, tombol Setujui tidak aktif.

Bila NIK ternyata sudah punya data anggota yang **tidak aktif**, persetujuan dibatalkan dengan pesan *Keanggotaan dengan NIK ini tidak aktif*. Aktifkan anggotanya lebih dulu di **Daftar Anggota**.

## Menolak

Klik **silang oranye (Tolak)**. Akun tetap nonaktif, statusnya menjadi **Ditolak** (bisa dilihat dengan filter *Ditolak*), dan pendaftar dapat email yang mengarahkan mereka menghubungi pengurus. Pendaftar yang ditolak tidak bisa masuk.

## Menjadikan anggota (akun yang sudah aktif)

Akun karyawan Mattel yang sudah aktif tetapi belum anggota (misalnya disetujui sebelum fitur ini ada) punya tombol **ikon tambah orang (Jadikan anggota)**. Hasilnya sama dengan persetujuan: data anggota dibuat dengan kode baru, atau akun ditautkan ke anggota dengan NIK yang sama.

## Menghapus akun

Klik **tempat sampah**, lalu konfirmasi. Tindakan ini **tidak bisa dibatalkan**.

| Yang terhapus | Yang tidak terhapus |
| --- | --- |
| Akun, foto profil, langganan notifikasi, pengantar, verifikasi email, tautan Google, dan percakapan pesan anggota itu | Data **anggota** dan semua data keuangan (simpanan, pinjaman, jurnal) |

- Akun yang **sudah terhubung ke anggota** hanya boleh dihapus oleh **superadmin atau grup admin**. Operator lain menerima penolakan.
- Menghapus akun tidak menghapus keanggotaan. Anggota bisa mendaftar lagi dengan NIK yang sama.
- Dalam **mode uji**, hasilnya tidak tersimpan (lihat artikel *Mode uji dan database uji*).
