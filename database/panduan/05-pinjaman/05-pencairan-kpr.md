---
judul: Pencairan KPR
ringkasan: KPR adalah titipan angsuran ke bank tanpa bunga; cara mencatatnya dan mengapa pencairan KPR tidak membentuk jurnal.
menu: /dashboard/loans/create-kpr
---
KPR (kredit kepemilikan rumah) dibiayai **bank**. Koperasi hanya **memotong angsuran dari gaji anggota lalu meneruskannya ke bank**. Karena itu:

- KPR **tidak berbunga** di koperasi.
- Angsuran yang diterima dicatat sebagai **titipan** (kewajiban koperasi kepada bank), bukan pendapatan.
- Pencairan KPR **tidak membentuk jurnal**, karena uang pinjaman langsung dari bank ke anggota, tidak melewati kas koperasi.

Menu: **Pinjaman → Input Pinjaman KPR**. Membutuhkan izin pencairan KPR.

## Langkah

1. Pilih **Anggota** dan **Jenis KPR** (jenis kredit grup KPR, misalnya BTN Bekasi atau BRI). Jenis KPR wajib sudah punya akun titipan; jika belum, muncul pesan *Jenis kredit ... belum punya akun titipan*.
2. Isi **Tanggal**, **Pokok KPR (Rp)**, dan **Lama Angsuran (bulan)**. Lama tidak boleh melebihi maksimum jenis KPR.
3. **Angsuran per Bulan (Rp)**: kosongkan untuk memakai pokok ÷ lama yang dibulatkan ke rupiah, atau isi sesuai angsuran dari bank.
4. Pilih **Kas/Bank** lalu **Simpan**.

## Yang dibuat sistem

| Data | Isi |
| --- | --- |
| Nomor KPR | `KPR-mmyy-urut` |
| Data KPR | Anggota, jenis, pokok, lama, angsuran per bulan |
| Rincian | Satu baris *PENCAIRAN PINJAMAN* berisi pokok |
| Jurnal | **Tidak ada** |

Angsurannya dicatat lewat **Setoran Angsuran**, tab KPR.
