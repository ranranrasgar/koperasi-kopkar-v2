---
judul: Mengelola operator
ringkasan: Menambah operator, memindahkan grup, menonaktifkan akun, dan me-reset password.
menu: /dashboard/settings/operator
---
Menu **Sistem & Pengaturan → Operator** hanya untuk grup **superadmin**. Perubahan berlaku pada klik berikutnya operator yang bersangkutan.

## Menambah operator

1. Di kartu **Tambah Operator**, isi **Nama Login**, **Nama Lengkap**, dan pilih **Grup**.
2. Tekan simpan. Sistem membuat **password sementara** yang hanya ditampilkan **sekali**. Catat dan serahkan langsung ke operator.
3. Saat login pertama, operator wajib mengganti password sementara itu.

Aturan nama login: **3-30 karakter**, huruf kecil, angka, titik, garis bawah, atau strip (contoh `budi`, `kasir.01`). Nama yang sudah dipakai ditolak.

## Mengubah operator

| Tindakan | Aturan |
| --- | --- |
| Ubah (ikon pensil) | Mengubah nama lengkap, alamat, dan telepon. Nama login tidak bisa diubah karena tercatat di transaksi |
| Ganti grup | Tidak bisa mengeluarkan **diri sendiri** dari grup superadmin |
| Aktif / nonaktif | Tidak bisa menonaktifkan diri sendiri. Operator nonaktif tidak bisa login, tetapi namanya tetap tercatat di transaksi lama |
| Hapus (ikon sampah) | Hanya untuk akun yang belum pernah dipakai, misalnya salah buat. Akun yang punya riwayat ditolak; nonaktifkan saja. Tidak bisa menghapus diri sendiri |
| Reset password | Membuat password sementara baru dan mewajibkan ganti password. Untuk akun sendiri, pakai menu **Ganti Password** |
| Superadmin terakhir | **Minimal satu superadmin harus tetap aktif**, jadi superadmin terakhir tidak bisa dinonaktifkan atau dipindah grup |

> **Penting:** Jangan menghapus atau memakai ulang akun operator yang sudah keluar. Nonaktifkan saja, supaya jejak siapa yang mencatat setiap transaksi tetap jelas.
