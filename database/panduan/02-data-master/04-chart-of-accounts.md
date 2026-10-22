---
judul: Chart of Accounts (bagan akun)
ringkasan: Struktur akun bertingkat, saldo normal debit/kredit, akun kas dan bank, serta cara membaca tampilan pohon.
menu: /dashboard/accounting/coa
---
Bagan akun berisi **152 akun** dalam tiga tingkat: kelompok utama, sub-kelompok, dan akun detail. Hanya **akun detail** yang dipakai di jurnal; akun induk adalah penjumlahan anak-anaknya.

## Kelompok utama

| Kode | Kelompok | Saldo normal | Klasifikasi |
| --- | --- | --- | --- |
| 1.0.00.00 | AKTIVA | Debit (D) | 10 |
| 2.0.00.00 | KEWAJIBAN DAN MODAL | Kredit (C) | 20 |
| 3.0.00.00 | MODAL DAN CADANGAN KOPERASI | Kredit (C) | 30 |
| 4.0.00.00 | PENDAPATAN | Kredit (C) | 40 |
| 5.0.00.00 | BEBAN OPERASI | Debit (D) | 50 |
| 6.0.00.00 | PENDAPATAN (BEBAN) LAIN-LAIN | Kredit (C) | 40 |

**Saldo normal** menunjukkan sisi yang menambah saldo: akun D bertambah saat didebit, akun C bertambah saat dikredit.

## Akun kas dan bank

Akun yang bisa dipilih di isian **Kas/Bank** pada form transaksi adalah akun `1.1.01.10` sampai `1.1.01.60`, antara lain Kas, Kas Induk, Kas Kecil, Kas Operasional, Kas Simp. Sukarela, Bank BTN Purwakarta, **Bank OCBC NISP**, Bank OCBC NISP OMI, Bank Muamalat, Bank Saudara, Bank BRI, Bank DKI, Bank BTN Syariah, Bank Danamon, Bank BKE, Bank BRI 2, dan Temporary. Akun yang paling sering dipakai otomatis muncul paling atas.

## Tampilan pohon

1. Buka **Akuntansi → Chart of Accounts**. Tampilan **Pohon** terbuka secara bawaan.
2. Klik baris induk (ikon folder) untuk membuka atau menutup. Tombol **Buka semua** dan **Tutup semua** tersedia di atas tabel.
3. Klik nama akun detail (ikon dokumen) untuk membuka **buku besar** akun itu.
4. Isi **Per Tanggal** lalu **Tampilkan** untuk melihat saldo pada tanggal tertentu. Saldo induk adalah jumlah semua akun di bawahnya.
5. Ketik di kotak cari untuk menemukan akun; induknya ikut terbuka otomatis.

Angka **merah** berarti saldo berlawanan dengan saldo normal akun, misalnya akun kas yang kreditnya lebih besar dari debitnya. Biasanya ini tanda salah posting yang perlu diperiksa.

Tampilan **Tabel** (tombol di kanan atas) menampilkan daftar datar dengan urutan, filter saldo normal D/C, dan ekspor CSV.

> **Catatan:** Akun COA belum bisa ditambah atau diubah dari web. Perubahan bagan akun masih dilakukan di aplikasi desktop.
