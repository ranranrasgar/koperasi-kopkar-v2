---
judul: Buku besar
ringkasan: Mutasi satu akun dengan saldo awal dan saldo berjalan, pilihan akun yang bisa dicari, halaman, dan dasar rekonsiliasi dengan rekening koran.
menu: /dashboard/accounting/ledger
---
**Akuntansi → Buku Besar** menampilkan mutasi **satu akun** dengan saldo berjalan. Semua akun COA bisa dipilih (operator yang hanya berizin kas dan bank hanya melihat akun kas dan bank). Untuk mencatat transaksi kas dan bank, pakai **Bank Book**.

## Langkah

1. Pilih **Akun**: ketik sebagian kode atau nama (misalnya `titipan bri`), pilih dengan panah dan Enter atau klik.
2. Isi periode **Dari** dan **Sampai**, lalu **Tampilkan**.
3. Baca: saldo awal, setiap baris debit/kredit dengan saldo berjalan, total mutasi, dan saldo akhir.

Saldo ditulis sebagai **debit dikurangi kredit**: debit menambah, kredit mengurangi. Untuk akun bersaldo normal kredit (misalnya simpanan, pendapatan, titipan), saldo positif yang wajar tampil sebagai angka negatif.

## Halaman dan baris per halaman

Akun yang ramai punya ribuan baris, jadi tabel dibagi per halaman: pilih **25, 50, 100 (bawaan), 200**, atau **Semua** (maks. 5.000). Bilah halaman ada **di atas dan di dasar layar**. Saldo berjalan tetap benar di semua halaman: halaman kedua dan seterusnya diawali baris *Saldo dari halaman sebelumnya*. **Total mutasi dan saldo akhir** di bawah selalu untuk **seluruh periode**, bukan hanya halaman yang tampil.

**Ekspor** mengunduh seluruh periode (maks. 5.000 baris). **Cetak** mencetak halaman yang tampil; pilih **Semua** lebih dulu untuk mencetak semua baris.

## Rekonsiliasi bank

Bandingkan saldo akhir akun bank (misalnya `1.1.01.41 Bank OCBC NISP`) dengan **rekening koran** pada tanggal yang sama. Jika berbeda, cari baris yang belum tercatat atau tercatat di akun bank yang salah. Rekening koran harian per akun juga ada di **Bank Book**.

Tips: dari tampilan pohon **Chart of Accounts**, klik nama akun detail untuk langsung membuka buku besarnya.

## Dari mana saldo awal diambil

Saldo awal tahun diambil dari jurnal **saldo pembuka tutup buku (TBT)** tanggal 1 Januari, ditambah semua jurnal sejak tanggal itu sampai sebelum tanggal **Dari**. Penjelasan lengkap ada di panduan *Tutup buku dan saldo awal tahun*.
