---
judul: Jenis pinjaman
ringkasan: Semua isian jenis pinjaman, pengaturan umum (staff, kunci grade, tunggakan, SHU, mobile), maksimal plafond dan aturan grade, serta efeknya ke aplikasi anggota.
menu: /dashboard/settings/jenis-pinjaman
---
Jenis pinjaman (jenis kredit) adalah **aturan baku** setiap produk pinjaman. Saat pencairan dan angsuran, mesin posting mengambil bunga, biaya, batas cicilan, dan akun dari sini.

## Isian jenis pinjaman

Susunan layarnya sama dengan layar desktop *Jenis Pinjaman (Credit)*.

| Isian | Arti | Aturan |
| --- | --- | --- |
| Group Pinjaman | KOPERASI, BANK / PIHAK LAIN, atau KPR | Menentukan form pencairan dan izin operator |
| Jenis Pinjaman | Pinjaman Uang atau Pinjaman Barang | |
| Kode Kredit | Kode produk, contoh `C01` | 2-10 huruf/angka, huruf besar, tidak boleh sama dengan yang ada. Tidak bisa diubah setelah dibuat |
| Nama Kredit | Nama produk | Wajib, maks. 50 karakter |
| Max. Lama Cicilan (x) | Batas lama angsuran | 0 berarti bebas |
| Tgl. Jatuh Tempo | Tanggal bayar setiap bulan | 1 sampai 31; di jadwal dibatasi maksimal tanggal 28 |
| Jasa Pinjaman (%) dan Per | Persentase jasa dan cara menghitungnya | PER ANGSURAN atau PER LAMA ANGSURAN, lihat di bawah |
| Biaya Provisi, Biaya ADM, Denda | Kotak centang dan persen dari pokok | Tidak dicentang berarti tidak dipungut (disimpan 0). Provisi dan adm ditagih sekali pada angsuran pertama |
| COA Kredit, Jasa, Adm, Provisi | Akun untuk jurnal | Wajib dipilih; ketik kode atau nama akun untuk mencari |
| Maksimal Plafond (Rp) | Batas besar pinjaman jenis ini | Kosong atau 0 = tidak dibatasi. Lihat aturan plafond di bawah |

## Pengaturan Umum

| Kotak centang | Efek |
| --- | --- |
| UM jika melebihi Grade | Tanda uang muka bila pinjaman melebihi grade anggota |
| Kunci jika melebihi grade | Pinjaman tidak boleh melebihi plafon grade anggota |
| Staff | Jenis hanya untuk anggota Staff. Tidak dicentang: hanya untuk anggota non-staff |
| Kunci jika ada tunggakan | Anggota tidak bisa mengajukan jenis ini selama pinjaman jenis yang sama masih berjalan (sisa lebih dari Rp 100) |
| Hitung SHU | Jasa pinjaman jenis ini ikut dihitung dalam pembagian SHU |
| Tidak untuk mobile | Jenis disembunyikan dari pengajuan di aplikasi anggota; pinjaman lama tetap berjalan normal |

## Maksimal plafond dan grade

Grade adalah nominal plafon tiap anggota (data anggota, kolom grade). Batas pinjaman satu anggota pada satu jenis ditentukan begini:

1. **Kunci jika melebihi grade** dicentang dan anggota punya nominal grade: batasnya **nominal grade anggota**. **Grade diutamakan**, walaupun Maksimal Plafond juga diisi.
2. Selain itu, bila **Maksimal Plafond** diisi: batasnya Maksimal Plafond. Ini juga berlaku bila grade dikunci tetapi nominal grade anggota belum diisi.
3. Grade dikunci, nominal grade kosong, dan Maksimal Plafond kosong: anggota itu belum bisa meminjam jenis ini sampai gradenya diisi.
4. Selain itu: tidak dibatasi.

Di form tersedia tabel **batas pinjaman per nominal grade** yang ada di data anggota, yang langsung berubah saat kotak centang atau Maksimal Plafond diubah, jadi akibat pengaturan terlihat sebelum disimpan.

Batas ini berlaku di **pengajuan di aplikasi anggota** dan di **pencairan oleh operator** (pinjaman tunai dan KPR); pinjaman di atas batas ditolak dengan pesan yang menyebut batasnya.

## Efek ke aplikasi anggota

- Jenis yang tampil di **Ajukan Pinjaman** hanya yang tidak bertanda *Tidak untuk mobile* dan sesuai status Staff anggota.
- Kartu plafon di form pengajuan menampilkan batas anggota itu untuk jenis yang dipilih (dari grade atau Maksimal Plafond), dan pengajuan di atas batas ditolak.
- Simulasi angsuran memakai jasa, adm, dan provisi dari jenis ini; lama pinjaman dibatasi *Max. Lama Cicilan*.
- *Kunci jika ada tunggakan* menolak pengajuan baru selama pinjaman jenis yang sama masih berjalan.

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

1. Buka **Data Master → Jenis Pinjaman**.
2. Tekan **Tambah** untuk produk baru, atau ikon pensil pada baris yang ada.
3. Isi semua isian lalu **Simpan**. Jika ada isian yang salah, pesan galat muncul dan isian Anda tidak hilang.
4. **Hapus** hanya untuk jenis yang belum pernah dipakai pinjaman atau pengajuan; yang sudah dipakai cukup dicentang *Tidak untuk mobile*.

> **Penting:** Perubahan bunga, adm, provisi, atau akun hanya berlaku untuk **pinjaman yang dicairkan sesudahnya**. Pinjaman yang sudah berjalan tetap memakai ketentuan yang tercatat saat pencairan.
