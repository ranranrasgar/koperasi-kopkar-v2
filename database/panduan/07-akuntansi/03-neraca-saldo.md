---
judul: Neraca saldo (trial balance)
ringkasan: Saldo awal, mutasi, dan saldo akhir setiap akun; cara membaca peringatan selisih.
menu: /dashboard/accounting/trial-balance
---
**Akuntansi → Trial Balance** menampilkan setiap akun yang punya saldo atau mutasi pada periode yang dipilih, dengan enam kolom angka:

| Kolom | Arti |
| --- | --- |
| Saldo Awal Debit / Kredit | Saldo pada tanggal **Dari** |
| Mutasi Debit / Kredit | Jumlah jurnal pada periode itu |
| Saldo Akhir Debit / Kredit | Saldo pada tanggal **Sampai** |

Saldo ditampilkan di sisi yang sesuai: saldo positif di kolom Debit, saldo negatif di kolom Kredit. Baris **Total** di bawah tabel menjumlahkan setiap kolom.

## Peringatan selisih

Dalam pembukuan yang seimbang, total saldo akhir debit sama dengan total saldo akhir kredit. Bila tidak sama, muncul peringatan kuning *Total debit dan kredit saldo akhir berselisih ...*.

Selisih itu berasal dari **data lama** yang tidak seimbang, bukan dari perhitungan laporan. Contoh yang diketahui: beberapa bukti dari aplikasi desktop tahun 2025-2026 punya baris debit dengan kode akun `0` (tidak ada di COA), dan sisa pembulatan sekitar Rp 3.468 dari jurnal sebelum 2019. Akun `0` tampil sebagai *(akun tidak ada di COA)* supaya mudah ditelusuri.

> **Catatan:** Semua transaksi dari web selalu seimbang, karena mesin posting menolak jurnal yang debit dan kreditnya berbeda.
