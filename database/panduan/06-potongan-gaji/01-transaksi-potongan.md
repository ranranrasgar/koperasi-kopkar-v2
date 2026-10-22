---
judul: Transaksi potongan gaji
ringkasan: Komponen potongan gaji setiap anggota aktif, cara sistem menghitungnya, dan cara memakai daftarnya.
menu: /dashboard/deductions
---
Sebagian besar setoran simpanan wajib dan angsuran dibayar lewat **potongan gaji** karyawan Mattel. Halaman **Potongan Gaji → Transaksi Potongan** menghitung **proyeksi potongan bulan berjalan** untuk setiap anggota **aktif**, langsung dari data saat halaman dibuka.

## Komponen potongan per anggota

| Komponen | Sumber angka |
| --- | --- |
| Simpanan pokok | 0 (simpanan pokok dibayar sekali saat masuk) |
| Simpanan wajib | Nilai simpanan wajib bulanan di data anggota |
| Simpanan sukarela | Nilai simpanan sukarela bulanan di data anggota |
| Pinjaman koperasi | Angsuran **berikutnya** semua pinjaman grup KOPERASI yang belum lunas: pokok + jasa + adm + provisi sesuai jadwal tagih |
| Pinjaman bank | Sama, untuk grup BANK / PIHAK LAIN |
| KPR | Angsuran per bulan setiap KPR yang belum lunas, maksimal sebesar sisa pokoknya |
| Adm bank | Biaya adm bank dari Pengaturan Perusahaan (saat ini Rp 2.000) |
| **Total** | Jumlah semua komponen |

Rumusnya sama dengan proses *generate* potongan di aplikasi desktop. Kolom **Generate terakhir** menampilkan total hasil generate desktop terakhir sebagai pembanding; angkanya **ditandai** bila berbeda dari proyeksi (misalnya karena ada angsuran yang dicatat setelah generate). Kolom ini tidak ikut tercetak.

## Memakai halaman ini

- Saring **Staff / Non staff / Semua staff**, atau cari kode anggota, KPK, atau nama.
- Kolom **Rekening** menampilkan bank dan nomor rekening anggota.
- Tekan **Cetak** untuk daftar yang diserahkan ke bagian penggajian.

> **Penting:** Halaman ini **hanya proyeksi**. Tidak ada transaksi yang tersimpan. Setelah gaji dipotong, setiap setoran simpanan dan angsuran tetap harus **dicatat** di menu masing-masing (Setoran Simpanan, Setoran Angsuran), supaya saldo anggota dan jurnal ikut berubah.

Karena dihitung dari angsuran berikutnya, angka potongan seorang anggota otomatis berubah begitu angsuran bulan ini dicatat. Cetak daftar potongan **sebelum** mencatat angsuran bulan itu.
