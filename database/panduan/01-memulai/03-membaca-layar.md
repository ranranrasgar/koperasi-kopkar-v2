---
judul: Membaca layar dan memakai tabel
ringkasan: Menu samping yang bisa dikerutkan, pencarian, filter, kolom, urutan, halaman, cetak yang otomatis muat kertas, ekspor, isian uang, pilihan akun, dan mode gelap.
menu: /dashboard/members
---
## Menu samping

Menu dikelompokkan per fungsi (Keanggotaan, Simpanan, Pinjaman Tunai, KPR, dan seterusnya). **Menu yang tidak diizinkan untuk grup Anda tidak ditampilkan.** Jika Anda membuka alamat halaman yang tidak diizinkan secara langsung, Anda dikembalikan ke Dashboard dengan pesan akses ditolak.

- **Klik judul grup** (misalnya SIMPANAN) untuk mengerutkan atau membuka grup itu. Grup yang jarang dipakai bisa dikerutkan supaya menu lebih ringkas.
- **Dua ikon kecil di sebelah tulisan MENU** membuka semua grup atau mengerutkan semua grup sekaligus.
- Pilihan Anda **diingat di perangkat ini**. Grup halaman yang sedang Anda buka otomatis terbuka saat berpindah halaman, jadi lokasi Anda selalu terlihat.
- Grup yang dikerutkan tetap menampilkan lencana merah bila ada isi yang belum dibaca (misalnya pesan anggota).
- Tombol ☰ di kiri atas menyembunyikan atau menampilkan menu samping. Di dasar menu ada **Logout** dan ikon **palet warna** (mengubah warna dan tema, lihat artikel *Mengubah warna dan tema tampilan*) dan ikon **mode terang/gelap** yang selalu terlihat tanpa menggulir.
- **Di HP** menu tersembunyi supaya halaman memakai seluruh layar; judul halaman tampil di bilah atas. Tekan ☰ untuk membuka menu sebagai laci dari kiri. Laci tertutup sendiri setelah memilih halaman, atau tekan ✕, ketuk area gelap di kanannya, atau tombol Esc.

## Memasang aplikasi ke layar utama (PWA)

Aplikasi pengurus bisa dipasang seperti aplikasi biasa, lalu dibuka dari ikon **Kopkar Admin** tanpa bilah alamat browser:

- **Android (Chrome)**: buka situs admin, menu ⋮ → **Instal aplikasi** atau **Tambahkan ke layar utama**.
- **iPhone (Safari)**: tombol Bagikan → **Tambahkan ke Layar Utama**.
- **Komputer (Chrome/Edge)**: ikon pasang di ujung kanan bilah alamat.

Aplikasi yang dipasang tetap butuh internet dan login seperti biasa; tidak ada data yang disimpan di perangkat. Pemasangan hanya bisa dari alamat **https** (atau localhost).

## Lebar halaman

Halaman dengan tabel yang banyak kolom (Daftar Anggota, Rekap Simpanan, Daftar Pinjaman, Kredit Macet, Potongan Gaji) memakai **lebar layar penuh**. Halaman lain (form, kartu, laporan) dibatasi lebarnya supaya tetap nyaman dibaca.

## Tabel daftar

Hampir semua halaman daftar (anggota, pinjaman, jurnal, COA, dan lain-lain) memakai tabel yang sama:

| Fitur | Cara pakai |
| --- | --- |
| Cari | Ketik di kotak pencarian lalu tekan Enter |
| Filter | Pilih di kotak pilihan (misalnya Status, Staff) atau buka **Filter Lainnya** |
| Urutkan | Klik judul kolom yang bertanda panah; klik lagi untuk membalik urutan |
| Kolom | Tombol **Kolom** untuk menampilkan atau menyembunyikan kolom; pilihan diingat per halaman |
| Baris per halaman | Di bilah halaman: pilih **25, 50, 100, 200**, atau **Semua**. Mengganti pilihan kembali ke halaman 1 |
| Halaman | Bilah halaman menempel di dasar layar (dan pada laporan panjang juga di atas tabel): tombol awal, sebelumnya, nomor, berikutnya, akhir, serta loncat ke halaman tertentu |
| Cetak | Membuka dokumen cetak berkop surat berisi **seluruh baris sesuai filter dan urutan** (bukan hanya halaman yang tampil) |
| Ekspor | Mengunduh file Excel (.xlsx) yang rapi seperti hasil cetak: kop koperasi, judul, tabel berbingkai, angka yang bisa dijumlahkan, dan baris total. Isinya **seluruh baris sesuai filter dan urutan**, bukan hanya halaman yang tampil |

**Semua** menampilkan seluruh baris sampai **5.000 baris**. Untuk tabel yang lebih besar, misalnya Jurnal Umum atau Buku Simpanan tanpa filter, pilihan ini tertulis *Semua (maks. 5.000)*; persempit dulu dengan pencarian atau filter tanggal.

## Mencetak

Tombol **Cetak** membuka dokumen sendiri di jendela baru (izinkan pop-up bila diblokir browser):

- Kop surat berisi nama, alamat, dan logo dari **Pengaturan Perusahaan**, serta nama pencetak dan waktu cetak.
- **Isi otomatis muat di kertas A4**: orientasi dipilih sesuai lebar tabel, dan tulisan atau tabel mengecil bila perlu supaya tidak ada kolom yang keluar kertas. Tombol **Potret** dan **Lanskap** di bagian atas mengganti orientasi, dan ukurannya menyesuaikan lagi.
- Tabel yang panjang berlanjut ke halaman berikutnya dengan judul kolom diulang, dan satu baris tidak terpotong di antara halaman.
- Neraca dan Rugi Laba dicetak dengan tampilan yang sama seperti di layar (Neraca tetap dua kolom).

Tekan **Cetak** di jendela itu untuk mencetak atau menyimpan sebagai PDF.

## Form entri di jendela (modal)

Form tambah dan ubah data (jurnal, bank book, jenis pinjaman, dan lain-lain) terbuka di jendela di atas halaman. Jendela **hanya tertutup lewat tombol X**; klik di luar jendela atau tombol Esc tidak menutupnya, supaya isian tidak hilang karena salah klik.

## Isian uang dan pilihan akun

- **Semua isian uang** otomatis diformat: ketik `1500000` tampil `1.500.000`. Koma dipakai untuk desimal (`1.500.000,5`).
- **Pilihan akun** bisa dicari: ketik sebagian kode atau nama akun (misalnya `titipan bri`), pilih dengan panah atas/bawah lalu **Enter** atau klik. **Esc** menutup daftar. Daftarnya tampil melayang di luar jendela sehingga tidak terpotong.

## Laporan dengan periode

Laporan akuntansi dan laporan pinjaman punya susunan yang sama: judul dan keterangan di kiri, tombol **Cetak** dan **Ekspor** di kanan, lalu satu baris filter di dalam kartu (periode **Dari** dan **Sampai**, atau **Per Tanggal**, plus pilihan lain). Tekan **Tampilkan** setelah mengubah filter.

## Tombol bantuan

Ikon **?** di kanan atas membuka panduan untuk halaman yang sedang Anda buka. Jika belum ada panduan khusus untuk halaman itu, Anda dibawa ke Pusat Panduan.
