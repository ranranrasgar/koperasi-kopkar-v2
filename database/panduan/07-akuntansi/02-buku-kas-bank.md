---
judul: Buku kas dan bank (buku besar)
ringkasan: Mutasi satu akun dengan saldo awal dan saldo berjalan, untuk rekonsiliasi kas dan rekening koran.
menu: /dashboard/accounting/ledger
---
**Akuntansi → Buku Kas & Bank** menampilkan mutasi **satu akun** dengan saldo berjalan. Walaupun namanya buku kas, semua akun COA bisa dipilih, jadi halaman ini juga berfungsi sebagai **buku besar**.

## Langkah

1. Pilih **Akun**.
2. Isi periode **Dari** dan **Sampai**, lalu **Tampilkan**.
3. Baca: saldo awal, setiap baris debit/kredit dengan saldo berjalan, total mutasi, dan saldo akhir.

Saldo ditulis sebagai **debit dikurangi kredit**: debit menambah, kredit mengurangi. Untuk akun bersaldo normal kredit (misalnya simpanan, pendapatan), saldo positif yang wajar tampil sebagai angka negatif.

## Rekonsiliasi bank

Bandingkan saldo akhir akun bank (misalnya `1.1.01.41 Bank OCBC NISP`) dengan **rekening koran** pada tanggal yang sama. Jika berbeda, cari baris yang belum tercatat atau tercatat di akun bank yang salah.

Tips: dari tampilan pohon **Chart of Accounts**, klik nama akun detail untuk langsung membuka buku besarnya.

## Dari mana saldo awal diambil

Saldo awal tahun diambil dari jurnal **saldo pembuka tutup buku (TBT)** tanggal 1 Januari, ditambah semua jurnal sejak tanggal itu sampai sebelum tanggal **Dari**. Penjelasan lengkap ada di panduan *Tutup buku dan saldo awal tahun*.
