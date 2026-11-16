---
judul: Penyelesaian tenant bulanan
ringkasan: Menghitung bagi hasil atau sewa kantin tenant, menyalingkan dengan belanja Simpanan Sukarela anggota, dan mencatat transfernya.
menu: /dashboard/unit-usaha/penyelesaian
---
Menu: **Unit Usaha → Penyelesaian Tenant**. Izinnya baris **Penyelesaian Tenant** di Kelola Hak Akses (bawaan: pemegang izin Daftar Unit Usaha, yaitu grup admin). Hanya untuk kantin bermodel tenant.

## Kenapa perlu

Selama sebulan, kantin tenant menghasilkan dua hal yang belum diselesaikan:

- **Piutang koperasi**: bagi hasil dari penjualan tunai (uangnya dipegang tenant).
- **Utang koperasi**: belanja anggota dari Simpanan Sukarela (uangnya masih di koperasi), dikurangi bagi hasilnya.

Penyelesaian menyalingkan keduanya, sehingga hanya selisihnya yang ditransfer.

## Langkah

1. Pilih **Kantin tenant** dan periodenya (bawaannya bulan lalu), lalu **Hitung**.
2. Periksa rinciannya: jumlah nota, penjualan tunai dan sukarela, bagi hasil, **kekurangan minimum** (bila bagi hasil sebulan di bawah minimum kontrak) atau **sewa**, utang, piutang, dan nilai yang harus dibayar.
3. Isi tanggal jurnal, akun kas/bank tempat transfer keluar atau masuk, dan catatan (nomor transfer).
4. **Cetak rekap** untuk ditandatangani koperasi dan tenant, lalu **Simpan penyelesaian**.

Minimum bagi hasil dan sewa adalah nilai bulanan, jadi hanya dihitung bila kontraknya memakai penyelesaian **bulanan**.

## Jurnal (KTP-...)

- Kekurangan minimum atau sewa: Piutang Tenant debit / Pendapatan kredit.
- Penyalingan: Utang ke Tenant debit, Piutang Tenant kredit.
- Selisih: koperasi membayar tenant (kas/bank kredit) atau tenant membayar koperasi (kas/bank debit).

## Setelah disimpan

Nota di periode itu terkunci: tidak bisa dibatalkan, dan tidak dihitung lagi di penyelesaian berikutnya. Periode yang sama tidak bisa diselesaikan dua kali. Bila keliru, tekan ikon silang di **Riwayat penyelesaian**: jurnalnya dihapus dan notanya terbuka lagi. Transfer yang sudah terjadi perlu dicatat ulang setelah penyelesaian dibuat kembali.
