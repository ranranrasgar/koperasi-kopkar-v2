---
judul: Jurnal penyesuaian
ringkasan: Mencatat jurnal penyesuaian akhir periode (penyusutan, beban dibayar di muka, dan sejenisnya) di jurnal umum dengan status Penyesuaian, untuk neraca lajur.
menu: /dashboard/accounting/adjusting
---
Menu **Akuntansi → Jurnal Penyesuaian** berisi jurnal yang dicatat pada akhir periode untuk menyesuaikan saldo akun, misalnya **beban penyusutan** dan akumulasi penyusutan, beban dibayar di muka, pendapatan diterima di muka, atau beban yang masih harus dibayar. Hak aksesnya sama dengan menu *Jurnal Umum*.

## Cara kerjanya

Jurnal penyesuaian **tidak punya tabel sendiri**. Ia disimpan di tabel jurnal umum yang sama dengan jurnal lain, dengan dua penanda:

- **Status `Penyesuaian`** pada setiap barisnya.
- **Nomor bukti `JP/yymmdd/n`** (contoh `JP/261031/3`), dengan urutan nomor sendiri sehingga tidak bertabrakan dengan nomor `JU/`.

Karena tersimpan di jurnal umum, jurnal penyesuaian **ikut dihitung** di Buku Besar, Neraca, Rugi Laba, dan Neraca Saldo seperti jurnal lainnya. Penandanya dipakai untuk **neraca lajur** (kertas kerja akuntansi), yang memisahkan saldo sebelum penyesuaian, kolom penyesuaian, dan saldo setelah penyesuaian.

## Mencatat jurnal penyesuaian

1. Buka **Akuntansi → Jurnal Penyesuaian**, lalu klik **Penyesuaian Baru**.
2. Isi **tanggal** (biasanya akhir bulan atau akhir tahun) dan **keterangan jurnal**.
3. Pilih akun pada tiap baris (bisa dicari dengan kode atau nama), isi **debit** atau **kredit**, tambah baris bila perlu. Debit dan kredit harus **seimbang**; tombol Simpan baru aktif bila sama.
4. Klik **Simpan Jurnal**. Nomor `JP/...` dibuat otomatis.

Form tidak menutup bila ada isian yang tidak sah, supaya isian Anda tidak hilang. Aturan lain sama dengan jurnal umum (akun harus ada di COA, minimal dua baris berisi nilai).

## Aksi per baris

| Ikon | Fungsi |
| --- | --- |
| Printer | Cetak voucher (judul *Voucher Jurnal Penyesuaian*) |
| Pensil | Ubah isi jurnal; nomor, tanggal, dan status Penyesuaian tetap |
| Tempat sampah | Hapus seluruh bukti |

## Menandai jurnal lama sebagai penyesuaian

Sebagian jurnal yang dibuat di aplikasi desktop sebenarnya jurnal penyesuaian, misalnya penyusutan bulanan (`JU/...` dengan akun *Beban Penyusutan* dan *Akumulasi Penyusutan*). Di **Jurnal Umum**, klik ikon **timbangan** pada baris itu untuk **menandainya sebagai penyesuaian**. Nomor `JU/` tidak berubah; hanya statusnya, sehingga jurnal itu muncul di halaman Jurnal Penyesuaian dan dikelompokkan di neraca lajur. Klik ikon yang sama lagi untuk mengembalikannya menjadi jurnal umum biasa. Jurnal `JP/` selalu penyesuaian.

## Memfilter

- Di **Jurnal Umum**, filter **Jenis** menampilkan hanya jurnal penyesuaian atau hanya yang bukan penyesuaian, dan kolom **Jenis** memberi lencana *Penyesuaian*. Filter **Sumber** punya pilihan *Jurnal Penyesuaian (web)*.
- Di halaman **Jurnal Penyesuaian**, filter tanggal dan pencarian (nomor bukti, akun, keterangan) berlaku seperti biasa.
