---
judul: Daftar anggota
ringkasan: Mencari, menambah, mengubah, menonaktifkan, mengaktifkan kembali, dan menghapus anggota yang belum memiliki transaksi.
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
| No. Rekening | Nomor rekening anggota; nama pemilik rekening tampil kecil di bawahnya. Di **Cetak** tampil sama, di **Ekspor** nama pemilik menjadi kolom sendiri (*Rekening Atas Nama*) |
| Tgl Daftar | Tanggal mulai menjadi anggota |
| Saldo Simpanan | Total saldo semua jenis simpanan |

## Mencari dan menyaring

- Kotak cari menerima **kode anggota, KPK, atau nama**.
- Filter **Status** (Aktif / Non-Aktif), **Anggota** (Anggota / Non Anggota), dan **Staff** (Staff / Non Staff) bisa digabung.
- Tombol mata di kolom **Aksi** membuka jendela **Detail** berisi semua kolom anggota itu, termasuk kolom yang sedang disembunyikan.

## Menambah anggota baru

Tombol **Tambah Anggota** di kanan atas tampil untuk grup yang dicentang **Daftar Anggota → Tambah anggota baru** di Kelola Hak Akses.

1. Isi **KPK** dan **Nama lengkap** (wajib), lalu data lain yang tersedia.
2. Periksa **Simpanan awal**. Nilainya mengikuti Pengaturan Perusahaan dan bisa diubah di form ini.
3. Pilih **Tambah**. Sistem membuat kode anggota otomatis dengan format `BBTT-NNNN` (bulan, tahun, nomor urut), lalu menampilkannya.

KPK yang sudah terdaftar ditolak dan pesannya menyebut kode anggota pemiliknya; bila anggota itu tidak aktif, aktifkan kembali lewat tombol di barisnya. Bila KPK ada di data Karyawan Mattel, anggota otomatis tertaut ke data itu. Anggota yang ditambah di sini belum punya akun aplikasi; akun dibuat anggota sendiri lewat pendaftaran di aplikasi. Dalam **Mode Uji**, anggota baru tidak tersimpan.

## Mengelola anggota

Operator dengan izin **Daftar Nama Anggota** dapat memakai tombol aksi per baris:

- **Ubah** data anggota dalam empat tab: **Data Pribadi** (nama, KPK, jenis kelamin, status perkawinan, KTP/SIM, NPWP, keluarga), **Alamat & Kontak**, **Pekerjaan & Gaji** (status staff, grade, gaji, jabatan, tempat kerja), dan **Bank & Simpanan**. Isian di semua tab tersimpan sekaligus dengan satu tombol **Simpan**. Kode anggota tidak dapat diubah; grade harus tersedia di Data Master → Grade. Gaji dipakai untuk perkiraan take home pay saat meninjau pengajuan.
- **Catat anggota keluar** menyimpan tanggal dan alasan keluar tanpa menghapus riwayat. Anggota keluar tidak ikut generate potongan gaji. Gunakan **Aktifkan kembali** untuk menghapus tanggal/alasan keluar dan mengaktifkannya lagi.
- **Hapus permanen** hanya tersedia jika anggota belum punya transaksi atau akun terkait. Ketik kode anggota sebagai konfirmasi. Jika tombol hapus nonaktif, gunakan **Catat anggota keluar**.

Perubahan dicatat di riwayat operator. Dalam **Mode Uji**, perubahan dicoba lalu di-rollback; pesan hasil menandai bahwa data tidak tersimpan.

## Melihat saldo per jenis

Untuk saldo per jenis simpanan beserta mutasinya, buka **Simpanan → Kartu Simpanan** dan cari anggota yang dimaksud. Saldo per jenis juga tampil otomatis setiap kali Anda memilih anggota di form setoran atau pengambilan, dan pinjaman yang masih berjalan tampil di form **Setoran Angsuran**.
