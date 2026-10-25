---
judul: Setoran titipan (saldo titipan angsuran)
ringkasan: Ringkasan saldo akun titipan: angsuran KPR dan pinjaman bank yang dikumpulkan koperasi, fee kolektif, dan titipan pajak atau BPJS.
menu: /dashboard/loans/escrow
---
Halaman **Pinjaman → Setoran Titipan** merangkum **uang titipan** yang dipegang koperasi dan belum disalurkan, per akun titipan, berdasarkan jurnal.

## Apa itu titipan

Titipan terjadi ketika koperasi menerima uang yang bukan miliknya sendiri:

- **Titipan angsuran pinjaman dan KPR**: angsuran anggota yang dikumpulkan koperasi lalu diteruskan ke bank (BTN, BRI, dan lain-lain).
- **Fee titipan kolektif**: fee atas penagihan angsuran bank/pihak lain.
- **Titipan pajak, BPJS, dan dana**: misalnya Titipan PPh 21, BPJS Kesehatan, dan Dana Resiko.

Di pembukuan semuanya akun **kewajiban** bersaldo normal kredit (kode `2.1.00.xx`); saldo positif berarti koperasi masih berutang untuk menyalurkannya.

## Membaca halaman

Isi periode **Dari** dan **Sampai** lalu **Tampilkan**. Tiap kelompok berisi akun-akun titipan dengan kolom:

| Kolom | Arti |
| --- | --- |
| Saldo Awal | Titipan di awal periode |
| Titipan Masuk | Jumlah kredit pada periode |
| Disalurkan / Keluar | Jumlah debit pada periode (diteruskan ke bank atau dibayarkan) |
| Saldo Akhir | Titipan yang masih dipegang |

Baris **Jumlah** ada per kelompok dan **Total titipan** di bawah. Klik **kode akun** untuk membuka mutasinya di **Buku Besar** pada periode yang sama. **Cetak** dan **Ekspor** tersedia seperti laporan lain. Angkanya sama dengan akun-akun itu di Neraca.

> **Catatan:** Halaman ini hanya merangkum; titipan dicatat oleh transaksi lain: angsuran KPR di **Setoran Angsuran** tab KPR, serta jurnal umum atau Bank Book untuk fee dan titipan lain. Tabel titipan lama dari aplikasi desktop (*pinjaman_tunai_titipan*) kosong dan tidak dipakai.

Untuk menerima pembayaran angsuran, pakai **Pinjaman → Setoran Angsuran**.
