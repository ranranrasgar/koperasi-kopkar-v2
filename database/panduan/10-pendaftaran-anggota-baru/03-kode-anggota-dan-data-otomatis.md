---
judul: Kode anggota dan data otomatis
ringkasan: Format kode anggota baru, data yang diisi otomatis saat pendaftar dijadikan anggota, dan hal yang perlu diperiksa.
menu: /dashboard/members
---
Saat pendaftar karyawan Mattel disetujui (atau memakai tombol **Jadikan anggota**), sistem membuat baris di **Daftar Anggota**.

## Format kode anggota

Mengikuti format yang sedang berjalan: **`BBTT-NNNN`**

- **BBTT**: bulan dan tahun pencatatan (dua digit), zona waktu Jakarta.
- **NNNN**: nomor urut anggota empat digit, diambil dari nomor urut tertinggi + 1.

Contoh: `0626-2033` artinya anggota ke-2033, dicatat Juni 2026. Kode tidak pernah dipakai ulang; dua persetujuan bersamaan diurutkan oleh sistem sehingga tidak ada kode kembar.

## Data yang diisi otomatis

| Data anggota | Sumbernya |
| --- | --- |
| NIK, nama, status staff, grade | Data **Karyawan Mattel** |
| Alamat, HP, nomor rekening | Data Karyawan Mattel (bila ada) |
| Tanggal pencatatan | Hari persetujuan |
| Operator | Nama operator yang menyetujui |
| Status | Aktif, jenis **Anggota** |
| Plafon grade, simpanan pokok, wajib, sukarela | Nilai yang **paling sering dipakai** anggota aktif terbaru dengan grade yang sama (bila grade belum pernah ada, dari semua anggota terbaru) |

Data karyawan ditandai pada anggota baru, sehingga daftar **Karyawan Mattel** menunjukkan mereka sudah menjadi anggota. Akun aplikasi otomatis terhubung ke anggota baru, dan kode anggota akun diperbarui.

## Yang perlu diperiksa pengurus

- **Nilai simpanan dan plafon awal** adalah nilai bawaan dari pola anggota terbaru, bukan transaksi. Tidak ada setoran yang dicatat otomatis. Periksa dan sesuaikan di **Daftar Anggota** bila perlu.
- Data yang tidak ada di data karyawan (jenis kelamin, kota, kode pos, bank, dll.) dibiarkan kosong; lengkapi di **Daftar Anggota**.
- Bila NIK sudah punya anggota **aktif**, tidak dibuat anggota baru: akun hanya ditautkan.
