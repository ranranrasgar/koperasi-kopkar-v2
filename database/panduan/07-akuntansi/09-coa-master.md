---
judul: Mengelola Chart of Accounts
ringkasan: Menambah akun baru, mengubah detail akun, dan menghapus akun COA yang belum dipakai.
menu: /dashboard/accounting/coa
---
Halaman **Akuntansi → Chart of Accounts (COA)** menampilkan bagan akun dan saldo. Tampilan **Pohon** untuk menelusuri akun; pilih **Tabel & Aksi** untuk mengubah atau menghapus akun.

## Menambah akun

Tekan **Tambah Akun** (di samping pilihan Pohon/Tabel; hanya muncul bila grup Anda punya izin tambah **Data Perkiraan (COA)**). Isiannya sama dengan form desktop:

| Isian | Keterangan |
| --- | --- |
| Nomor Akun (Acct Number) | Kode akun, mis. `1.1.01.47`. Hanya angka, huruf, dan titik; harus belum dipakai. **Tidak bisa diubah setelah disimpan.** |
| Nama Akun (Acct Name) | Nama yang tampil di laporan dan pilihan akun. |
| Induk (Parent) | Akun golongan di atasnya. Akun yang **sudah punya jurnal tidak bisa menjadi induk** (ditandai *berjurnal* dan tidak bisa dipilih), karena akun itu akan berubah menjadi akun induk. |
| Debit / Kredit | Posisi saldo normal. Otomatis mengikuti induk, boleh diganti. |
| Group | AKTIVA, HUTANG, MODAL, PENDAPATAN, atau BIAYA-BIAYA. Otomatis mengikuti induk, boleh diganti. |
| Flag | `-` untuk akun biasa; `BANK` atau `GC` membuat akun muncul di Bank Book. Flag sistem tutup buku (Laba Ditahan, Hutang Pajak) tidak bisa dipilih di sini. |

**Saldo Awal** dari form desktop tidak ada: di aplikasi web saldo akun dihitung dari jurnal. Untuk saldo pembuka akun baru, buat **Jurnal Umum**. Akun baru langsung bisa dipilih di form jurnal karena belum punya sub-akun.

## Mengubah akun

Operator dengan izin **Data Perkiraan (COA)** dapat mengubah nama akun, posisi normal debet/kredit, keterangan (misalnya `BANK` atau `GC`), dan anggaran. Kode akun tidak dapat diubah karena dipakai jurnal dan relasi COA.

## Menghapus akun

Penghapusan permanen hanya tersedia jika akun belum dipakai di jurnal, tidak memiliki sub-akun, dan tidak dipakai saldo atau pengaturan jenis simpanan, pinjaman, maupun pos SHU. Ketik kode akun untuk konfirmasi. Jika tombol hapus nonaktif, akun tersebut masih digunakan dan tidak dapat dihapus.

Perubahan dicatat di riwayat operator. Dalam **Mode Uji**, tindakan dicoba lalu di-rollback; pesan hasil menandai bahwa data tidak tersimpan.
