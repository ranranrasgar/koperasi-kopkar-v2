---
judul: Mencatat setoran simpanan
ringkasan: Langkah mencatat setoran, isian wajib, nomor bukti, dan jurnal yang terbentuk otomatis.
menu: /dashboard/savings/deposit
---
Menu: **Simpanan → Setoran Simpanan**. Membutuhkan izin menu setoran simpanan.

## Langkah

1. Di isian **Anggota**, ketik minimal 2 huruf kode anggota, KPK, atau nama, lalu pilih anggota dari daftar.
2. Periksa panel informasi anggota: saldo setiap jenis simpanan tampil otomatis.
3. Pilih **Jenis Simpanan**. Bawaannya *Simpanan Sukarela*.
4. Isi **Tanggal** (bawaan: hari ini) dan **Jumlah (Rp)**.
5. Pilih **Kas/Bank** tempat uang diterima.
6. Isi **Keterangan** bila perlu (opsional), lalu tekan **Simpan**.

Jika berhasil, muncul kotak hijau berisi nomor bukti dan saldo setelah transaksi. Jika gagal, pesan merah menjelaskan isian yang salah, dan isian Anda tidak hilang.

## Yang dibuat sistem

| Data | Isi |
| --- | --- |
| Nomor bukti | `SMPM-yymm-urut`, contoh `SMPM-2610-304590` |
| Buku simpanan | Satu baris setoran beserta saldo baru anggota untuk jenis itu |
| Jurnal | **Debit** akun kas/bank yang dipilih, **Kredit** akun jenis simpanan |

Contoh setoran sukarela Rp 500.000 ke Kas Simp. Sukarela:

| Akun | Debit | Kredit |
| --- | --- | --- |
| 1.1.01.31 Kas Simp. Sukarela | 500.000 | |
| 2.1.00.20 Simpanan Sukarela | | 500.000 |

> **Tips:** Untuk setoran simpanan berjangka, buka form ini dari halaman **Simpanan Berjangka**; jenis *Simpanan Berjangka* langsung terpilih.

Kesalahan input yang sudah tersimpan dibetulkan dengan **transaksi pembalik** (misalnya pengambilan dengan jumlah yang sama) atas sepengetahuan bagian akuntansi. Transaksi tidak dihapus, supaya jejak audit tetap utuh.
