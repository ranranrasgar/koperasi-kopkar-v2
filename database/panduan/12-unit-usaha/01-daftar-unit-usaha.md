---
judul: Membuat kantin dan menugaskan petugas
ringkasan: Menambah kantin milik koperasi atau kantin tenant, jam buka dan tutup sementara, akun jurnal yang dibuat otomatis, cara bayar, kontrak tenant, dan petugas kantin.
menu: /dashboard/unit-usaha
---
Menu: **Unit Usaha → Daftar Unit Usaha**. Izinnya baris **Daftar Unit Usaha** di Kelola Hak Akses (bawaan: superadmin dan grup admin). Pemegang izin ini juga melihat dan mengelola semua kantin di menu kantin lain.

## Model kepemilikan

Dipilih per kantin di tab **Umum**:

| Model | Pemilik barang dan uang tunai | Pendapatan koperasi | Akun yang dibuat |
| --- | --- | --- | --- |
| **Milik koperasi** | Koperasi | Penjualan dikurangi HPP | Kas, Persediaan, Penjualan, HPP |
| **Tenant bagi hasil** | Tenant | Persen penjualan, paling sedikit nilai minimum per bulan | Piutang Tenant, Utang ke Tenant, Pendapatan Bagi Hasil |
| **Tenant sewa tetap** | Tenant | Sewa per bulan | Piutang Tenant, Utang ke Tenant, Pendapatan Sewa |

## Jam buka dan tutup sementara

Di tab **Umum**, bagian **Jam buka untuk pesanan dari aplikasi anggota**, pilih salah satu:

- **Sesuai jadwal**: isi **Jam buka** dan **Jam tutup**; berlaku setiap hari. Bila jam tutup lebih kecil dari jam buka, jadwalnya lewat tengah malam (mis. 20:00 - 08:00 = buka malam sampai pagi).
- **Buka 24 jam**: pesanan dari aplikasi diterima kapan saja.
- **Tutup sementara**: untuk libur, stok opname, renovasi, dan sebagainya. Isi **pesan untuk anggota** (mis. "Libur Lebaran, buka lagi Senin") dan, bila sudah tahu, **tutup sampai tanggal**. Setelah tanggal itu lewat, kantin otomatis kembali ke jadwal yang tersimpan. Tanpa tanggal, kantin tetap tutup sampai Anda memilih Sesuai jadwal atau Buka 24 jam lagi.

Saat tutup, anggota tetap bisa melihat menu dan mengisi tas, tetapi tidak bisa mengirim pesanan; pesan tutup sementara tampil di halaman kantin. Kolom **Nama** di daftar menampilkan status saat ini, mis. *Buka sekarang · buka 08:00-17:00*. Jam ini hanya untuk pesanan dari aplikasi; kasir di kantin tetap bisa berjualan.

## Akun jurnal otomatis

Saat kantin disimpan, akun yang dibutuhkan modelnya dibuat di COA dengan nama kantin, nomornya yang pertama kosong:

- Kas, Persediaan, dan Piutang Tenant di bawah **1.1.01.00 Aktiva Lancar** (mulai .80). Akun Kas bertanda BANK sehingga muncul di **Bank Book** untuk setoran harian ke kas induk.
- Utang ke Tenant di bawah **2.1.00.00 Kewajiban Lancar** (mulai .74).
- Penjualan dan Pendapatan Bagi Hasil/Sewa di bawah **4.1.00.00 Pendapatan Unit Usaha**; HPP di bawah **5.3.00.00 Harga Pokok Penjualan**. Kedua induk ini dibuat otomatis saat kantin pertama disimpan.

Daftar akun tampil di kolom **Akun jurnal**. Nama akun boleh diubah di **Chart of Accounts**; akunnya tidak bisa dihapus selama dipakai kantin. Bila model diganti, akun model baru dibuat dan akun lama dibiarkan.

## Pembayaran

Tab **Pembayaran**: terima tunai, terima bayar dari Simpanan Sukarela (QR), batas belanja sukarela per transaksi dan per hari, saldo sukarela minimal yang harus tersisa, dan batas waktu mengambil pesanan tunai dari aplikasi anggota. Pengaturan ini dipakai saat fitur kasir dan belanja dari aplikasi anggota aktif.

## Tenant dan kontrak

Tab **Tenant** (hanya model tenant): data usaha, pemilik, kontak, dan rekening tujuan transfer, lalu kontrak: tanggal mulai dan selesai, persen bagi hasil dan minimum per bulan (atau sewa per bulan), serta penyelesaian bulanan atau mingguan. Mengubah isian dengan tanggal mulai yang sama memperbarui kontrak itu; tanggal mulai baru membuat kontrak baru dan kontrak lama tetap tersimpan.

## Petugas

Petugas kantin login dengan akun operator. Untuk orang yang hanya menjaga kantin (boleh bukan anggota atau pengurus), buat operator di **Sistem → Operator** dengan grup **Kantin**: grup ini hanya punya menu kantin. Lalu di tab **Petugas** pilih operatornya dan perannya:

- **Pengelola**: mengatur produk, harga, dan stok kantin itu.
- **Kasir**: hanya berjualan; daftar produk tampil tanpa tombol ubah.

Petugas hanya melihat kantin tempat ia ditugaskan.
