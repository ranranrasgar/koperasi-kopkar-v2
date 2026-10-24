---
judul: Sisa Hasil Usaha (SHU)
ringkasan: Alur SHU per tahun buku - tutup buku, hitung SHU anggota, posting, pencairan - lengkap dengan rumus pembagiannya.
menu: /dashboard/shu
---
SHU adalah selisih pendapatan dan biaya koperasi dalam satu tahun buku. Halaman **SHU & Absensi → Sisa Hasil Usaha** menjalankan seluruh prosesnya dan menyimpan hasil **per tahun**, jadi SHU tahun-tahun lama bisa dilihat ulang lewat pilihan **Tahun buku**.

## Alur empat langkah

| Langkah | Di mana | Siapa |
| --- | --- | --- |
| 1. **Tutup buku** tahun itu | Akuntansi → Tutup Buku | superadmin / admin |
| 2. **Hitung SHU** anggota | halaman SHU | izin menu Hitung SHU |
| 3. **Posting** hasil hitung | halaman SHU | superadmin / admin |
| 4. **Pencairan**: tunai per anggota, atau semua yang belum diambil dipindahkan ke simpanan sukarela | halaman SHU | izin menu SHU; batal dan ke sukarela hanya superadmin / admin |

Kartu di atas halaman menunjukkan angka tutup buku: SHU sebelum pajak, pajak, SHU setelah pajak, dan kolam pembagian anggota.

## Pembagian SHU per pos

Persen tiap pos diambil dari pengaturan pos SHU, dibagi dari **SHU setelah pajak** (bukan sebelum pajak):

| Urut | Pos SHU | Persen | Akun |
| --- | --- | --- | --- |
| 1 | Dana Cadangan | 30% | 3.0.00.22 |
| 2 | SHU yang Dibagikan Anggota | 51% | 2.1.00.83 |
| 3 | Dana Pendidikan | 11% | 2.1.00.80 |
| 4 | Dana Pengurus & Pengawas | 3% | 2.1.00.84 |
| 5 | Dana Kesejahteraan Karyawan | 0% | 2.1.00.85 |
| 6 | Dana Pembangunan Daerah Kerja | 2,5% | 2.1.00.81 |
| 7 | Dana Sosial | 2,5% | 2.1.00.82 |

Pos nomor 2 adalah **kolam** yang dibagikan ke anggota.

## Rumus SHU per anggota

Kolam dibagi **empat komponen sama besar**. Bagian setiap anggota:

> kolam ÷ 4 × ( saldo sukarela ÷ total + jasa uang ÷ total + jasa barang ÷ total + lama anggota ÷ total )

| Komponen | Isinya |
| --- | --- |
| Saldo sukarela | Setoran dikurangi pengambilan simpanan sukarela sampai akhir tahun |
| Jasa uang | Jasa (bunga) angsuran pinjaman uang yang dibayar anggota pada tahun itu |
| Jasa barang | Sama, untuk pinjaman barang |
| Lama anggota | Bulan sejak tanggal masuk sampai 31 Desember: (jumlah hari + 1) ÷ 30, dibulatkan (setengah ke genap) |

Hanya anggota **aktif** yang masuk sampai tahun itu dan berstatus anggota yang dihitung; hanya jenis kredit bertanda *hitung SHU* yang ikut. Kotak **Ikutkan saldo simpanan sukarela** di Hitung SHU mematikan komponen saldo sukarela bila tidak diperlukan.

## Pencairan

- **Cairkan**: pilih akun kas/bank dan tanggal. Jurnal: debit pos SHU anggota (2.1.00.83), kredit kas/bank, bernomor `SHU/yymmdd/urut` dengan keterangan *Pengambilan SHU Tahun Y*. Voucher bisa dicetak dari baris itu.
- **Batal**: menghapus jurnal pencairan dan mengembalikan status ke *Belum diambil* (superadmin / admin).
- **Posting ke sukarela**: semua anggota yang belum mengambil dipindahkan ke simpanan sukarela (debit 2.1.00.83, kredit 2.1.00.20, satu jurnal per anggota). Setelah itu SHU tahun itu tidak bisa diambil lagi.

Hitung ulang SHU atau tutup buku ulang **ditolak** selama masih ada anggota yang sudah dicairkan; batalkan pencairannya dulu.

## Tabel anggota

Bisa dicari (kode, KPK, nama), disaring menurut status pencairan, diurutkan dengan klik judul kolom, dan dicetak atau diekspor **seluruhnya** (bukan hanya halaman yang tampil). Baris total menjumlahkan seluruh hasil saring.
