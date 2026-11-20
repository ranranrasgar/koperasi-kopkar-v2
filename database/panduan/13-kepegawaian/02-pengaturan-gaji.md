---
judul: Pengaturan gaji
ringkasan: Tanggal awal periode, tunjangan transport dan makan per hari, pembagi potongan dan lembur, persen BPJS, dan tarif PPh 21 TER.
menu: /dashboard/kepegawaian/pengaturan
---
Menu: **Kepegawaian → Pengaturan Gaji**. Izinnya baris **Pengaturan Gaji** di Kelola Hak Akses (bawaan: superadmin dan grup admin).

## Isian

| Isian | Bawaan | Arti |
| --- | --- | --- |
| Tanggal awal periode | 23 | Periode Oktober = 23 September s/d 22 Oktober |
| Tunjangan transport per hari | 7.000 | Dikali jumlah hari hadir (ATN) |
| Tunjangan makan per hari | 10.000 | Dikali jumlah hari hadir (ATN) |
| Pembagi potongan harian | 30 | Potongan tidak hadir = hari / 30 x UMK (dan x tunjangan jabatan) |
| Pembagi upah lembur per jam | 173 | Upah lembur per jam = jml. upah / 173 |
| Hari kerja seminggu | 6 | Menentukan bobot lembur di hari istirahat |
| JHT karyawan | 2% | Dipotong dari gaji, dasar jml. upah |
| Jaminan Pensiun karyawan | 1% | Dipotong dari gaji; isi 0 bila tidak ikut JP |
| BPJS Kesehatan karyawan | 1% | Dipotong dari gaji |
| JKK + JKM dibayar koperasi | 0,54% | Tidak memotong gaji, tetapi menambah bruto PPh 21 |
| BPJS Kesehatan dibayar koperasi | 4% | Tidak memotong gaji, tetapi menambah bruto PPh 21 |
| Hak cuti tahunan | 12 hari | |

> **Penting:** cocokkan persen BPJS dengan bendahara sebelum menghitung gaji. Excel lama (2015) memakai JHT 2% dan BPJS 0,5% tanpa JP.

## Tarif PPh 21 (TER)

PPh 21 bulan Januari s/d November memakai tarif efektif rata-rata (PMK 168/2023): **PPh = tarif x bruto bulanan**, dibulatkan ke bawah ke rupiah. Bruto = gaji kotor + premi BPJS yang dibayar koperasi. Tabel di halaman ini menunjukkan mulai berapa bruto sebulan karyawan kena pajak per kategori. Masa Desember (hitungan setahun Pasal 17) belum dihitung otomatis.
