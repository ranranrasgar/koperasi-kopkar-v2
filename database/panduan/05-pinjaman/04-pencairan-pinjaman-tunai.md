---
judul: Pencairan pinjaman tunai
ringkasan: Syarat dan langkah mencairkan pinjaman koperasi atau bank, pratinjau jadwal, dan data serta jurnal yang terbentuk.
menu: /dashboard/loans/create-cash
---
Menu: **Pinjaman → Input Pinjaman Tunai**. Membutuhkan izin pencairan pinjaman koperasi dan/atau bank. Jenis pinjaman yang tampil hanya yang grupnya Anda izinkan.

## Syarat sebelum mencairkan

- Pengajuan sudah disetujui sesuai kebijakan koperasi (dari aplikasi mobile atau formulir kertas).
- Jenis pinjaman sesuai status anggota, misalnya produk *Staff* untuk anggota staff.
- Lama angsuran tidak melebihi **maksimum cicilan** jenis pinjaman (lihat petunjuk di bawah isian).
- Dana tersedia di kas/bank yang akan dipakai.

## Langkah

1. Pilih **Anggota**.
2. Pilih **Jenis Kredit**. Produk bertanda *[disembunyikan]* sudah tidak dipakai; hindari kecuali ada alasan khusus.
3. Isi **Tanggal Pinjaman**, **Pokok Pinjaman (Rp)**, dan **Lama Angsuran (kali)**.
4. **Bunga (%)** boleh dikosongkan untuk memakai bunga bawaan jenis kredit. Isi hanya bila ada keputusan bunga khusus.
5. Pilih **Dibayar dari Kas/Bank**.
6. Periksa **Pratinjau Jadwal** di samping form: total jasa, adm, provisi, dan jadwal setiap angsuran beserta tanggal jatuh temponya. Pratinjau dihitung dengan rumus yang sama dengan saat menyimpan.
7. Tekan **Simpan**.

## Yang dibuat sistem dalam satu transaksi

| Data | Isi |
| --- | --- |
| Nomor pinjaman | `CR-mmyy-urut`, contoh `CR-1026-23001` |
| Data pinjaman | Anggota, jenis, pokok, lama, bunga, adm, provisi, tanggal jatuh tempo |
| Rincian | Satu baris *PENCAIRAN PINJAMAN* berisi pokok dan total jasa |
| Jadwal tagih | Satu baris per angsuran: pokok, jasa, adm/provisi (angsuran 1), tanggal jatuh tempo |
| Jurnal | **Debit** akun piutang jenis pinjaman, **Kredit** kas/bank, sebesar **pokok** |

Contoh C01 Rp 6.000.000 dari Bank OCBC NISP:

| Akun | Debit | Kredit |
| --- | --- | --- |
| Piutang pinjaman uang (akun piutang C01) | 6.000.000 | |
| 1.1.01.41 Bank OCBC NISP | | 6.000.000 |

> **Catatan:** Jasa, adm, dan provisi **belum** dijurnal saat pencairan. Ketiganya baru dicatat sebagai pendapatan ketika angsuran dibayar.

Jika ada isian yang salah, pinjaman tidak tersimpan sama sekali (tidak ada data setengah jadi).
