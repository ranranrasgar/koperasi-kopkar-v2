---
judul: Data karyawan koperasi
ringkasan: Menambah dan mengubah karyawan yang digaji koperasi, tautan ke anggota, dan isian gaji (UMK, tunjangan jabatan, status PTKP).
menu: /dashboard/kepegawaian/karyawan
---
Menu: **Kepegawaian → Data Karyawan**. Izinnya baris **Data Karyawan** di Kelola Hak Akses (bawaan: superadmin dan grup admin; isi gaji bersifat pribadi).

Karyawan di sini adalah **karyawan koperasi sendiri** (kasir toko, staf keuangan, dan sebagainya), bukan anggota berstatus Staff. Status Staff/No Staff di data anggota adalah golongan karyawan Mattel untuk potongan gaji.

## Menambah karyawan

1. Tekan **Tambah**.
2. Tab **Data diri**: **Kode karyawan** (mis. `K015`, sama dengan nomor karyawan di slip lama; tidak bisa diubah setelah disimpan), nama, jenis kelamin, NIK KTP, NPWP. **Kode anggota** diisi bila karyawan itu juga anggota koperasi: dipakai untuk absensi dari QR saya dan untuk menarik cicilan pinjaman koperasinya sebagai potongan. Satu anggota hanya bisa tertaut ke satu karyawan.
3. Tab **Pekerjaan**: status (Kontrak/Tetap), tanggal masuk, akhir kontrak (EOC), bidang, jabatan, atasan, dan centang **Masih bekerja (aktif)**. Karyawan tidak aktif tidak ikut dihitung di periode gaji berikutnya.
4. Tab **Gaji & rekening**: **UMK**, **Tunjangan jabatan**, **Status PTKP** (menentukan kategori tarif PPh 21), bank, nomor dan atas nama rekening.
5. **Simpan**.

## Dasar hitung dari isian ini

| Kolom | Dipakai untuk |
| --- | --- |
| Jml. Upah = UMK + tunjangan jabatan | Upah lembur per jam (jml. upah / 173), JHT, JP, dan BPJS Kesehatan |
| UMK dan tunjangan jabatan | Dipotong per hari tidak hadir: hari / 30 x nilainya |
| Status PTKP | Kategori TER: A (TK/0, TK/1, K/0), B (TK/2, TK/3, K/1, K/2), C (K/3) |

Mengubah UMK atau tunjangan berlaku untuk hitungan gaji berikutnya; slip periode yang sudah final tidak berubah.
