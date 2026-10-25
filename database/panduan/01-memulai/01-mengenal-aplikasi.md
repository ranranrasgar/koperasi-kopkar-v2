---
judul: Mengenal aplikasi koperasi
ringkasan: Gambaran modul, istilah penting, dan bagaimana setiap transaksi saling terhubung sampai ke laporan keuangan.
menu: /dashboard
---
Aplikasi ini adalah versi web dari sistem Koperasi Karyawan Mattel MJS 2000. Datanya sama dengan aplikasi desktop (hasil migrasi ke PostgreSQL), dan setiap transaksi uang yang dicatat di web langsung membentuk **jurnal akuntansi**, sehingga laporan keuangan selalu mengikuti transaksi.

## Modul utama

Menu samping disusun dari yang paling sering dipakai sehari-hari ke yang jarang, dan di tiap grup transaksi harian ada di atas, lalu laporan.

| Grup menu | Isi | Menu |
| --- | --- | --- |
| Keanggotaan | Data anggota, karyawan Mattel dari HR, akun aplikasi anggota, absensi | Daftar Anggota, Karyawan Mattel, User Mobile, Absensi Fingerprint |
| Simpanan | Setoran dan pengambilan lima jenis simpanan, laporan saldo | Setoran, Pengambilan, Rekap, Buku, Kartu, Berjangka, Grafik |
| Pinjaman | Pengajuan, pencairan pinjaman tunai dan KPR, angsuran, titipan, tunggakan | Setoran Angsuran, Pengajuan Kredit, Input Pinjaman Tunai dan KPR, Titipan, Daftar Pinjaman, Cari Pinjaman, Kredit Macet |
| Potongan Gaji | Potongan gaji bulanan anggota | Generate & Posting, Transaksi Potongan |
| Akuntansi | Jurnal, kas dan bank, buku besar, neraca saldo, laporan keuangan, bagan akun | Jurnal Umum, Bank Book, Buku Besar, Trial Balance, Laporan Keuangan, Chart of Accounts |
| Tutup Buku & SHU | Proses akhir tahun, berurutan: tutup buku lalu SHU | Tutup Buku, Sisa Hasil Usaha (SHU) |
| Data Master | Aturan produk | Jenis Pinjaman, Jenis Simpanan |
| Komunikasi | Pesan ke aplikasi anggota | Kirim Notifikasi, Himbauan & Promo |
| Sistem | Identitas koperasi, nilai awal anggota baru, hak akses, operator, cadangan, mode uji, panduan | Pengaturan Perusahaan, Operator, Kelola Hak Akses, Backup & Restore, Mode Uji / Live, Kelola Panduan |

## Alur data dari transaksi ke laporan

1. Kasir mencatat transaksi, misalnya setoran simpanan atau pencairan pinjaman.
2. Sistem menyimpan dokumen transaksi **dan** jurnal debit/kredit dalam satu langkah. Jika salah satu gagal, semuanya dibatalkan, sehingga tidak pernah ada transaksi tanpa jurnal.
3. Anggota yang bersangkutan dikabari lewat **notifikasi aplikasi** dan **email** pada transaksi tertentu, misalnya pencairan pinjaman (lengkap dengan PDF jadwal angsuran).
4. Jurnal itu langsung terlihat di **Jurnal Umum**, **Bank Book**, **Buku Besar**, **Trial Balance**, dan **Laporan Keuangan**.

> **Catatan:** Laporan tidak perlu diproses atau di-*generate* lebih dulu. Semua laporan dihitung langsung dari data saat halaman dibuka.

## Istilah yang sering dipakai

| Istilah | Arti |
| --- | --- |
| Kode anggota | Nomor anggota koperasi, contoh `2703-6506` |
| KPK / NIK | Nomor induk karyawan Mattel |
| Staff / Non-staff | Status kepegawaian; beberapa jenis pinjaman dibedakan untuk staff dan non-staff |
| Nomor bukti | Nomor dokumen transaksi, dibuat otomatis oleh sistem (lihat tabel di bawah) |
| Akun / COA | Akun di bagan akun (Chart of Accounts), contoh `1.1.01.41 Bank OCBC NISP` |
| Jasa | Bunga pinjaman |
| TBT | Jurnal tutup buku tahunan |

## Format nomor bukti

| Transaksi | Format | Contoh |
| --- | --- | --- |
| Setoran simpanan | `SMPM-yymm-urut` | `SMPM-2610-304590` |
| Pengambilan simpanan | `SMPK-yymm-urut` | `SMPK-2610-304583` |
| Pencairan pinjaman tunai | `CR-mmyy-urut` | `CR-1026-23001` |
| Angsuran pinjaman tunai | `ANGS-CR-mmyy-urut` | `ANGS-CR-1026-150200` |
| Pencairan KPR | `KPR-mmyy-urut` | `KPR-1026-450` |
| Angsuran KPR | `ANGS-KPR-mmyy-urut` | `ANGS-KPR-1026-9100` |
| Jurnal umum (memorial) | `JU/yymmdd/n` | `JU/261022/1205` |
| Bank Book (kas dan bank) | `BB/yymmdd/NNN` | `BB/261022/003` |
| Pencairan SHU anggota | `SHU/yymmdd/urut` | `SHU/260218/28916` |
| Tutup buku tahunan | `TBT/yymmdd/NNN` | `TBT/251231/001` |

Perhatikan bahwa simpanan memakai **tahun lalu bulan** (`yymm`), sedangkan pinjaman memakai **bulan lalu tahun** (`mmyy`). Ini mengikuti format aplikasi desktop supaya nomor lama dan baru tetap konsisten. Nomor urut diambil dari penghitung database sehingga tidak pernah dobel walaupun beberapa kasir menyimpan bersamaan.
