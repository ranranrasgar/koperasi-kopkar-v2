---
judul: Kode anggota dan data otomatis
ringkasan: Format kode anggota baru, data yang diisi otomatis saat pendaftar dijadikan anggota, dan hal yang perlu diperiksa.
menu: /dashboard/members
---
Saat pendaftar karyawan Mattel disetujui (atau memakai tombol **Jadikan anggota**), admin mengisi form **Kelengkapan data anggota baru**, lalu sistem membuat baris di **Daftar Anggota** dari isian itu.

## Format kode anggota

Mengikuti format yang sedang berjalan: **`BBTT-NNNN`**

- **BBTT**: bulan dan tahun pencatatan (dua digit), zona waktu Jakarta.
- **NNNN**: nomor urut anggota empat digit, diambil dari nomor urut tertinggi + 1.

Contoh: `0626-2033` artinya anggota ke-2033, dicatat Juni 2026. Kode tidak pernah dipakai ulang; dua persetujuan bersamaan diurutkan oleh sistem sehingga tidak ada kode kembar.

## Data yang terisi di form (bisa diubah admin)

| Data anggota | Sumbernya |
| --- | --- |
| NIK, nama, status staff, grade | Data **Karyawan Mattel** |
| Alamat, HP, nomor rekening | Data Karyawan Mattel (bila ada) |
| Tanggal pencatatan | Hari persetujuan |
| Operator | Nama operator yang menyetujui |
| Status | Aktif, jenis **Anggota** |
| Simpanan pokok, wajib, sukarela | **Nilai awal di Sistem → Pengaturan Perusahaan → Nilai Awal Anggota Baru.** Bila kolom itu dikosongkan, dipakai tebakan: nilai yang paling sering dipakai anggota aktif terbaru dengan grade yang sama |
| Nominal grade | Tebakan dari anggota terbaru bergrade sama (dasar plafon pinjaman) |
| Jenis kelamin, kota, kode pos, telepon rumah, nama bank, atas nama | Kosong atau mengikuti nama karyawan; diisi admin di form |

Data karyawan ditandai pada anggota baru, sehingga daftar **Karyawan Mattel** menunjukkan mereka sudah menjadi anggota. Akun aplikasi otomatis terhubung ke anggota baru, dan kode anggota akun diperbarui.

## Yang perlu diperiksa pengurus

- **Nilai simpanan awal** menentukan tagihan potongan gaji bulanan anggota; bukan transaksi, jadi tidak ada setoran yang dicatat otomatis. Pastikan nilainya benar sebelum menyimpan; mengubahnya kemudian bisa lewat **Daftar Anggota**.
- Atur nilai standar koperasi satu kali di **Pengaturan Perusahaan**, supaya form kelengkapan sudah terisi benar dan admin cukup memeriksa.
- Bila NIK sudah punya anggota **aktif**, tidak dibuat anggota baru: akun hanya ditautkan.
