---
judul: Jenis pinjaman
ringkasan: Grup pinjaman, cara bunga dihitung, biaya adm dan provisi, batas lama cicilan, tanggal jatuh tempo, dan akun yang dipakai.
menu: /dashboard/settings/jenis-pinjaman
---
Jenis pinjaman (jenis kredit) adalah **aturan baku** setiap produk pinjaman. Saat pencairan dan angsuran, mesin posting mengambil bunga, biaya, batas cicilan, dan akun dari sini.

## Isian jenis pinjaman

| Isian | Arti | Aturan |
| --- | --- | --- |
| Kode | Kode produk, contoh `C01` | 2-10 huruf/angka, huruf besar, tidak boleh sama dengan yang ada. Tidak bisa diubah setelah dibuat |
| Nama | Nama produk | Wajib, maks. 50 karakter |
| Grup | KOPERASI, BANK / PIHAK LAIN, atau KPR | Menentukan form pencairan dan izin operator |
| Jenis | Pinjaman Uang atau Pinjaman Barang | |
| Bunga (%) | Persentase jasa | 0 sampai 100 |
| Bunga per | PER ANGSURAN atau PER LAMA ANGSURAN | Lihat penjelasan di bawah |
| Adm (%) dan Provisi (%) | Persentase dari pokok | 0 sampai 100, ditagih sekali pada angsuran pertama |
| Maks. Cicilan | Batas lama angsuran | 0 berarti bebas |
| Tanggal Jatuh Tempo | Tanggal bayar setiap bulan | 1 sampai 31; di jadwal dibatasi maksimal tanggal 28 |
| Hide | Tandai produk yang sudah tidak dipakai | Di form pencairan, produk ini diletakkan paling bawah dengan tanda *[disembunyikan]*; masih bisa dipilih |
| Akun piutang/titipan, jasa, adm, provisi | Akun COA untuk jurnal | Wajib dipilih |

## Cara bunga dihitung

- **PER ANGSURAN**: jasa total = pokok × bunga % × lama angsuran. Contoh: Rp 6.000.000 × 1,5% × 12 = **Rp 1.080.000**, atau Rp 90.000 per bulan.
- **PER LAMA ANGSURAN**: bunga dihitung **sekali** untuk seluruh masa pinjaman. Contoh: Rp 6.000.000 × 1,5% = **Rp 90.000** total, dibagi rata ke semua angsuran.

## Produk koperasi yang aktif

| Kode | Nama | Bunga | Adm | Provisi | Maks. cicilan |
| --- | --- | --- | --- | --- | --- |
| C01 | Pinj. Uang Non Staff | 1,5% per angsuran | 1% | 0% | 12 |
| C02 | Pinj. Uang Staff | 1,5% per angsuran | 1% | 0% | 12 |
| C07 | Dibayar Dimuka Non Staff | 2% per angsuran | 1% | 0% | 5 |
| C08 | Dibayar Dimuka Staff | 2% per angsuran | 1% | 0% | 5 |
| C31 | Pinj. Konsumtif Staff | 2% per angsuran | 1% | 1% | 24 |
| C32 | Pinj. Konsumtif Non Staff | 2% per angsuran | 1% | 1% | 24 |

Semua produk di atas jatuh tempo tanggal 10. Nilai pasti selalu yang tertulis di halaman **Jenis Pinjaman**; tabel ini hanya contoh saat panduan ditulis.

Grup **BANK / PIHAK LAIN** (15 produk) dan **KPR** (7 produk) saat ini semuanya bertanda *hide*. Produk itu masih bisa dipilih, dan pinjaman lama dengan produk itu tetap bisa diangsur seperti biasa.

## Menambah atau mengubah

1. Buka **Sistem & Pengaturan → Jenis Pinjaman**.
2. Tekan **Tambah** untuk produk baru, atau **Ubah** pada baris yang ada.
3. Isi semua isian lalu **Simpan**. Jika ada isian yang salah, pesan galat muncul dan isian Anda tidak hilang.

> **Penting:** Perubahan bunga, adm, provisi, atau akun hanya berlaku untuk **pinjaman yang dicairkan sesudahnya**. Pinjaman yang sudah berjalan tetap memakai ketentuan yang tercatat saat pencairan.
