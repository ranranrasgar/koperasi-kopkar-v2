---
judul: Laporan keuangan (neraca dan rugi laba)
ringkasan: Membaca neraca per tanggal dan laporan rugi laba per periode, termasuk SHU tahun berjalan.
menu: /dashboard/accounting/reports
---
**Akuntansi → Laporan Keuangan** punya dua tab: **Neraca** dan **Rugi Laba**. Tab yang tampil mengikuti izin menu Anda.

## Neraca

Isi **Per Tanggal** lalu **Tampilkan**.

| Bagian | Isi |
| --- | --- |
| Aktiva | Akun klasifikasi 10: kas, bank, piutang, aktiva tetap |
| Hutang | Akun klasifikasi 20, termasuk simpanan sukarela dan berjangka |
| Modal | Akun klasifikasi 30, termasuk simpanan pokok, wajib, dan cadangan |
| SHU Tahun Berjalan | Pendapatan dikurangi biaya yang belum ditutup buku |

**Total Aktiva** harus sama dengan **Total Pasiva** (hutang + modal + SHU tahun berjalan). Bila berbeda, muncul keterangan selisih yang berasal dari jurnal lama yang tidak seimbang, beserta saldo akun yang tidak ada di COA (lihat panduan *Neraca saldo*). **Keterangan selisih itu bisa diklik** dan membuka daftar jurnal penyebabnya (halaman *Jurnal Bermasalah*, dijelaskan di panduan Neraca saldo).

## Rugi Laba

Isi **Dari** dan **Sampai** lalu **Tampilkan**. Pendapatan dan biaya dikelompokkan menurut **kelompok perkiraan** (akun induknya) dengan subtotal tiap kelompok:

| Bagian | Isi |
| --- | --- |
| Pendapatan | Pendapatan, dan Pendapatan (Beban) Lain-lain; lalu **Jumlah Pendapatan** |
| Biaya | Beban Usaha dan Beban Perkoperasian; lalu **Jumlah Biaya** |
| Pendapatan sebelum pajak | Jumlah pendapatan dikurangi jumlah biaya |
| Pajak pendapatan | Persen pajak di **Pengaturan Perusahaan** dikali pendapatan sebelum pajak (nol bila rugi) |
| Pendapatan setelah pajak (SHU) | Pendapatan sebelum pajak dikurangi pajak |

Persen pajak diatur di Pengaturan Perusahaan (kolom *Pajak Pendapatan*). Pajak hanya tampil sebagai angka laporan dan **tidak membentuk jurnal**; jurnalnya baru terbentuk saat **tutup buku**.

Jurnal tutup buku (TBT) **tidak** ikut dihitung, sehingga periode yang mencakup 31 Desember tetap menunjukkan hasil usaha setahun penuh. Contoh: rugi laba 1 Januari sampai 31 Desember 2025 menghasilkan pendapatan sebelum pajak **Rp 1.703.638.349**, sama dengan nilai yang ditutup aplikasi desktop; setelah pajak 11% menjadi **Rp 1.516.238.130**, dasar pembagian SHU.

## Cetak dan Ekspor

Halaman memakai susunan yang sama dengan halaman daftar: judul di kiri, **Cetak** dan **Ekspor** di kanan, filter dan pilihan **Neraca / Rugi Laba** dalam satu baris di kartu. Hasil cetak meniru tampilan di layar (tanpa kotak tabel; Neraca tetap dua kolom Aktiva dan Hutang+Modal) berkop koperasi dan otomatis muat di kertas. **Ekspor** mengunduh baris laporan sebagai CSV.
