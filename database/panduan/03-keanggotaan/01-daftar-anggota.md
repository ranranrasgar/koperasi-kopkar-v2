---
judul: Daftar anggota
ringkasan: Mencari, mengubah, menonaktifkan, mengaktifkan kembali, dan menghapus anggota yang belum memiliki transaksi.
menu: /dashboard/members
---
Menu **Keanggotaan → Daftar Anggota** menampilkan seluruh anggota koperasi, aktif maupun tidak.

## Kolom penting

| Kolom | Arti |
| --- | --- |
| Kode Anggota | Nomor anggota, dipakai di semua transaksi |
| KPK | Nomor induk karyawan Mattel |
| Nama Lengkap | Nama anggota; di bawahnya tampil username aplikasi Android bila ada |
| Status | **AKTIF** atau **NON-AKTIF**. Hanya anggota aktif yang ikut potongan gaji |
| Staff | **STAFF** atau **NON-STAFF**; menentukan produk pinjaman yang sesuai (misalnya C01 untuk non staff, C02 untuk staff) |
| Grade | Golongan karyawan dari HR |
| Tgl Daftar | Tanggal mulai menjadi anggota |
| Saldo Simpanan | Total saldo semua jenis simpanan |

## Mencari dan menyaring

- Kotak cari menerima **kode anggota, KPK, atau nama**.
- Filter **Status** (Aktif / Non-Aktif), **Anggota** (Anggota / Non Anggota), dan **Staff** (Staff / Non Staff) bisa digabung.
- Tombol mata di kolom **Aksi** membuka jendela **Detail** berisi semua kolom anggota itu, termasuk kolom yang sedang disembunyikan.

## Mengelola anggota

Operator dengan izin **Daftar Nama Anggota** dapat memakai tombol aksi per baris:

- **Ubah** data pribadi, KPK, jenis kelamin, alamat, kota, nomor HP, status staff, grade, rekening bank, dan nominal simpanan bulanan. Kode anggota tidak dapat diubah; grade harus tersedia di Data Master → Grade.
- **Catat anggota keluar** menyimpan tanggal dan alasan keluar tanpa menghapus riwayat. Anggota keluar tidak ikut generate potongan gaji. Gunakan **Aktifkan kembali** untuk menghapus tanggal/alasan keluar dan mengaktifkannya lagi.
- **Hapus permanen** hanya tersedia jika anggota belum punya transaksi atau akun terkait. Ketik kode anggota sebagai konfirmasi. Jika tombol hapus nonaktif, gunakan **Catat anggota keluar**.

Perubahan dicatat di riwayat operator. Dalam **Mode Uji**, perubahan dicoba lalu di-rollback; pesan hasil menandai bahwa data tidak tersimpan.

## Melihat saldo per jenis

Untuk saldo per jenis simpanan beserta mutasinya, buka **Simpanan → Kartu Simpanan** dan cari anggota yang dimaksud. Saldo per jenis juga tampil otomatis setiap kali Anda memilih anggota di form setoran atau pengambilan, dan pinjaman yang masih berjalan tampil di form **Setoran Angsuran**.
