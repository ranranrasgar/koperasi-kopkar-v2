---
judul: Mengelola Chart of Accounts
ringkasan: Mengubah detail akun dan menghapus akun COA yang belum dipakai.
menu: /dashboard/accounting/coa
---
Halaman **Akuntansi → Chart of Accounts (COA)** menampilkan bagan akun dan saldo. Tampilan **Pohon** untuk menelusuri akun; pilih **Tabel & Aksi** untuk mengubah atau menghapus akun.

## Mengubah akun

Operator dengan izin **Data Perkiraan (COA)** dapat mengubah nama akun, posisi normal debet/kredit, keterangan (misalnya `BANK` atau `GC`), dan anggaran. Kode akun tidak dapat diubah karena dipakai jurnal dan relasi COA.

## Menghapus akun

Penghapusan permanen hanya tersedia jika akun belum dipakai di jurnal, tidak memiliki sub-akun, dan tidak dipakai saldo atau pengaturan jenis simpanan, pinjaman, maupun pos SHU. Ketik kode akun untuk konfirmasi. Jika tombol hapus nonaktif, akun tersebut masih digunakan dan tidak dapat dihapus.

Perubahan dicatat di riwayat operator. Dalam **Mode Uji**, tindakan dicoba lalu di-rollback; pesan hasil menandai bahwa data tidak tersimpan.
