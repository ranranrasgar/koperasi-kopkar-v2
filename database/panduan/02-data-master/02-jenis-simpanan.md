---
judul: Jenis simpanan
ringkasan: Lima jenis simpanan, persentase laba untuk SHU, dan akun COA yang menentukan jurnal setiap setoran dan pengambilan.
menu: /dashboard/settings/jenis-simpanan
---
Jenis simpanan menentukan **akun COA** yang dipakai mesin posting. Setiap setoran mengkredit akun ini dan setiap pengambilan mendebitnya.

## Jenis simpanan yang berlaku

| Kode | Nama | Laba (%) | Kenaikan (%) | Endapan | Akun COA |
| --- | --- | --- | --- | --- | --- |
| 01 | Simpanan Pokok | 10 | 0 | Tidak | 3.0.00.10 (Modal) |
| 02 | Simpanan Wajib | 10 | 20 | Tidak | 3.0.00.11 (Modal) |
| 03 | Simpanan Sukarela | 10 | 0 | Ya | 2.1.00.20 (Kewajiban) |
| 04 | Simpanan Wajib Khusus | 0 | 0 | Tidak | 3.0.00.13 (Modal) |
| 05 | Simpanan Berjangka | 0 | 0 | Tidak | 2.1.00.22 (Kewajiban) |

- **Laba (%)**: persentase yang dipakai dalam perhitungan pembagian SHU atas simpanan.
- **Kenaikan (%)**: persentase kenaikan yang dipakai aplikasi desktop untuk penyesuaian simpanan wajib.
- **Endapan**: menandai simpanan yang saldonya mengendap (dipakai perhitungan desktop).
- **Akun COA**: simpanan pokok, wajib, dan wajib khusus adalah **modal** anggota; simpanan sukarela dan berjangka adalah **kewajiban** (utang koperasi kepada anggota).

## Mengubah jenis simpanan

1. Buka **Sistem & Pengaturan → Jenis Simpanan**, tekan **Ubah** pada baris yang dimaksud.
2. Ubah nama (wajib, maks. 50 karakter), persen laba dan kenaikan (0 sampai 100), centang endapan, dan pilih akun COA.
3. Tekan **Simpan**.

> **Penting:** Mengganti **akun COA** hanya berlaku untuk transaksi berikutnya. Transaksi dan jurnal lama tidak ikut pindah akun. Ubah akun hanya atas keputusan bagian akuntansi, karena saldo di neraca akan terbelah di dua akun.

Jenis simpanan baru tidak bisa ditambahkan dari web. Kodenya dipakai di banyak laporan dan perhitungan desktop.
