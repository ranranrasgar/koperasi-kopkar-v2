---
judul: Penggajian dan slip gaji
ringkasan: Rekap gaji per periode seperti sheet Master Karyawan, isian manual (cadangan risiko, THR, potongan), finalkan, buka kembali, slip cetak, dan ekspor.
menu: /dashboard/kepegawaian/penggajian
---
Menu: **Kepegawaian → Penggajian**. Izinnya baris **Penggajian** di Kelola Hak Akses: **ubah** untuk isian manual, **tambah** untuk finalkan, **hapus** untuk buka kembali (bawaan: superadmin dan grup admin).

## Urutan kerja tiap periode

1. **Absensi Karyawan**: buka periode, isi kode kehadiran sampai tidak ada hari kosong.
2. **Lembur Karyawan**: catat lembur harian.
3. **Penggajian**: periksa rekap, isi kolom manual lewat ikon pensil, lalu **Finalkan periode**.
4. Cetak slip (**Cetak semua slip** atau ikon printer per karyawan) dan **Ekspor** untuk transfer gaji.

## Kolom rekap

| Kolom | Isi |
| --- | --- |
| Jml. Upah | UMK + tunjangan jabatan (Data Karyawan) |
| Hr Potong, Gaji | Hari ABS + UNP; gaji = jml. upah - hari / 30 x (UMK dan tunjangan jabatan) |
| HK, Transport, Makan | Hari ATN x tarif harian (Pengaturan Gaji) |
| Lembur | Total jam berbobot periode x jml. upah / 173 |
| Cad. Risiko, THR, Tunj. Lain | Isian manual |
| Gaji Kotor | Gaji + transport + makan + lembur + cadangan risiko + THR + tunjangan lain |
| JHT, JP, BPJS Kes | Persen Pengaturan Gaji x jml. upah |
| PPh 21 | Tarif TER x bruto (gaji kotor + premi BPJS yang dibayar koperasi), dibulatkan ke bawah |
| Pot. Kop, Lain-lain | Isian manual. Untuk karyawan yang juga anggota, form isian menampilkan jadwal tagih pinjaman koperasinya di periode itu sebagai acuan (tidak terisi otomatis) |
| Gaji Bersih | Gaji kotor - JHT - JP - BPJS Kes - PPh 21 - potongan koperasi - lain-lain |

## Draf dan final

Selama **draf**, rekap dihitung ulang dari Data Karyawan, Absensi, Lembur, Pengaturan Gaji, dan isian manual setiap kali halaman dibuka. **Finalkan periode** ditolak bila masih ada hari kosong di Absensi. Setelah final, angka rekap dan slip disimpan apa adanya: mengubah UMK, data karyawan, atau pengaturan tidak mengubah periode itu, dan absensi, lembur, serta isian terkunci.

Bila ada koreksi, tekan **Buka kembali**: periode kembali draf, perbaiki datanya, lalu finalkan lagi.

## Slip

Slip memakai kop koperasi dan berisi data karyawan, pendapatan, potongan, perhitungan PPh 21, upah bersih, serta kolom tanda tangan Bendahara, Ketua Umum, dan karyawan. Satu slip satu halaman, kertas A4 lanskap. Izinkan pop-up browser bila jendela cetak tidak muncul.

> Masa Desember (PPh 21 setahun Pasal 17) dan jurnal beban gaji belum dibuat otomatis; catat lewat Jurnal Umum.
