---
judul: Lembur karyawan
ringkasan: Mencatat lembur harian karyawan koperasi, aturan jam dan bobot lembur (Rate Lembur), dan perkiraan uang lembur per periode.
menu: /dashboard/kepegawaian/lembur
---
Menu: **Kepegawaian → Lembur Karyawan**. Izinnya baris **Lembur Karyawan** di Kelola Hak Akses (bawaan: superadmin dan grup admin). Periode gaji harus sudah dibuka di **Absensi Karyawan**.

## Mencatat lembur

1. Pilih periode lalu **Tampilkan**.
2. Pilih **Karyawan**, **Tanggal**, **Jam mulai**, dan **Jam selesai** (jam selesai lebih kecil dari jam mulai berarti lewat tengah malam).
3. **Jenis hari** biarkan kosong: tanggal berkode **RD** di Absensi dianggap hari istirahat, selain itu hari kerja. Pilih sendiri bila perlu, mis. lembur di hari libur nasional.
4. **Simpan lembur**. Satu karyawan satu baris per tanggal; menyimpan tanggal yang sama lagi memperbarui baris itu.

Lembur ditolak di tanggal berkode tidak hadir, izin tanpa upah, cuti, sakit, atau melahirkan, dan bila kurang dari 1 jam penuh.

## Aturan hitung (sama dengan sheet Rate Lembur)

- Jam lembur dibulatkan ke bawah per jam penuh. Di hari kerja, lembur lebih dari 3 jam dikurangi 1 jam istirahat.
- Bobot hari kerja: jam ke-1 x1,5, jam berikutnya x2 (3 jam = 5,5).
- Bobot hari istirahat, 6 hari kerja seminggu: jam 1-7 x2, jam 8 x3, jam 9 dst x4 (9 jam = 21). Bila Pengaturan Gaji 5 hari kerja: jam 1-8 x2, jam 9 x3, jam 10 dst x4.
- Uang lembur = total jam berbobot periode x jml. upah / 173 (Pengaturan Gaji), dibulatkan ke rupiah.

Tabel atas merangkum per karyawan (hari, jam, jam berbobot, perkiraan uang). Nilai yang dibayar dihitung lagi di Penggajian saat periode difinalkan. Periode final tidak bisa diubah.
