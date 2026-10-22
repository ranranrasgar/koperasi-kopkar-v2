---
judul: Aturan simpanan
ringkasan: Lima jenis simpanan, sifatnya, bagaimana saldo dihitung, dan aturan yang diperiksa sistem di setiap transaksi.
---
## Jenis dan sifat simpanan

| Jenis | Sifat | Dicatat sebagai |
| --- | --- | --- |
| 01 Simpanan Pokok | Dibayar sekali saat masuk menjadi anggota | Modal |
| 02 Simpanan Wajib | Dibayar rutin, umumnya lewat potongan gaji | Modal |
| 03 Simpanan Sukarela | Bebas disetor dan diambil | Kewajiban (utang kepada anggota) |
| 04 Simpanan Wajib Khusus | Simpanan wajib dengan ketentuan khusus | Modal |
| 05 Simpanan Berjangka | Simpanan dengan jangka waktu | Kewajiban |

## Bagaimana saldo dihitung

Saldo simpanan dihitung **per anggota dan per jenis**: jumlah semua setoran dikurangi jumlah semua pengambilan untuk jenis itu. Saldo satu jenis tidak bisa dipakai untuk jenis lain.

## Aturan yang diperiksa sistem

| Aturan | Pesan bila dilanggar |
| --- | --- |
| Anggota wajib dipilih dan harus ada | *Anggota ... tidak ditemukan* |
| Jenis simpanan wajib dipilih | *Jenis simpanan wajib diisi* |
| Jumlah harus angka lebih dari nol (desimal maks. 4 angka, pakai titik atau koma) | *Jumlah harus angka lebih dari nol* |
| Tanggal wajib dan valid | *Tanggal tidak valid* |
| Akun kas/bank wajib dipilih | *Akun kas/bank wajib diisi* |
| **Pengambilan tidak boleh melebihi saldo jenis itu** | *Saldo Simpanan Sukarela 150.000 kurang dari pengambilan 200.000* |

Dua kasir yang mencatat transaksi untuk anggota yang sama pada saat bersamaan tidak akan membuat saldo kacau: sistem memproses keduanya bergantian.

## Kebijakan yang tidak dikunci sistem

Sistem **hanya memeriksa saldo**. Kebijakan koperasi berikut tetap menjadi tanggung jawab petugas dan pengurus:

- Simpanan pokok dan simpanan wajib pada umumnya hanya dikembalikan saat anggota **keluar** dari keanggotaan.
- Pengambilan simpanan berjangka sebelum jatuh tempo memerlukan persetujuan pengurus.
- Pengambilan dalam jumlah besar sebaiknya disertai bukti persetujuan yang diarsipkan.

> **Penting:** Karena sistem tidak menolak pengambilan simpanan pokok atau wajib selama saldonya cukup, pastikan dasar pengambilannya jelas sebelum menekan **Simpan**.
