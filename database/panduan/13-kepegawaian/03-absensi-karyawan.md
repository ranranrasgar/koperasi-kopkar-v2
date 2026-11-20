---
judul: Absensi karyawan per periode gaji
ringkasan: Membuka periode gaji, mengisi kode kehadiran harian (ATN, RD, ABS, ANN, MED, MAT, UNP), mengisi hari kosong otomatis, dan pindai QR.
menu: /dashboard/attendance
---
Menu: **Kepegawaian → Absensi Karyawan**. Izinnya baris **Absensi Karyawan** di Kelola Hak Akses.

## Membuka periode

Periode gaji diberi nama menurut bulan akhirnya. Dengan tanggal awal 23 (Pengaturan Gaji), periode **November 2026** = 23 Oktober s/d 22 November 2026. Pilih bulan di kotak periode lalu **Tampilkan**. Bila periode belum ada, tekan **Buka periode**. Rentang tanggalnya diambil saat dibuka dan tidak berubah walaupun Pengaturan Gaji diubah kemudian.

## Kode kehadiran

| Kode | Arti | Pengaruh ke gaji |
| --- | --- | --- |
| ATN | Hadir | Hari kerja dibayar: tunjangan transport dan makan |
| RD | Libur / hari istirahat | Tidak ada |
| ABS | Tidak hadir (X) | Upah dipotong 1/30 per hari |
| UNP | Izin tanpa upah | Upah dipotong 1/30 per hari |
| ANN | Cuti tahunan (L) | Tidak memotong upah, mengurangi sisa cuti |
| MED | Sakit (S) | Tidak memotong upah |
| MAT | Melahirkan (M) | Tidak memotong upah |

Pilih kode di kotak tanggal; isian langsung tersimpan. Pilih **-** untuk mengosongkan. Kolom di kanan menghitung jumlah per kode.

## Isi hari kosong

**Isi hari kosong (semua)** atau ikon tongkat di ujung baris karyawan mengisi hari yang masih kosong: hari yang punya catatan pindai QR menjadi ATN, hari kerja lain ATN, dan hari istirahat RD (Minggu; Sabtu juga bila Pengaturan Gaji 5 hari kerja). Isian yang sudah ada tidak berubah, jadi isi dulu ABS, cuti, atau sakit, lalu tekan tombol ini, lalu perbaiki hari libur bergilir bila ada.

## Pindai QR

Bagian bawah halaman tetap mencatat jam masuk dan pulang dari **QR saya** aplikasi anggota. Yang bisa absen: anggota berstatus Staff, dan anggota yang tertaut ke karyawan aktif di Data Karyawan (isian **Kode anggota**). Pindai pertama hari itu masuk, berikutnya pulang. Daftar pindai mengikuti rentang periode yang dipilih; jam bisa dikoreksi atau dihapus dengan ikon pensil dan tempat sampah.

Periode yang sudah **final** (di menu Penggajian) tidak bisa diubah lagi.
