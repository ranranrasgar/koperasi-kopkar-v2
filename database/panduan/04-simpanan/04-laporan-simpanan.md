---
judul: Laporan simpanan
ringkasan: Rekap simpanan, buku simpanan, kartu simpanan anggota, grafik analisa, dan simpanan berjangka.
menu: /dashboard/savings
---
## Rekap Simpanan

**Simpanan → Rekap Simpanan** menampilkan setoran, pengambilan, dan saldo per jenis simpanan untuk setiap anggota aktif sampai tanggal yang dipilih (**S/d Tanggal**). Bisa disaring per status staff dan dicari dengan KPK atau nama.

## Buku Simpanan

**Simpanan → Buku Simpanan** berisi semua transaksi setoran dan pengambilan. Saring dengan **Jenis**, **Dari Tanggal**, dan **Sampai Tanggal**, atau cari nomor bukti, kode anggota, KPK, atau nama.

Kolom **Saldo** berlaku seperti rekening koran: saldo anggota untuk jenis simpanan itu **setelah** transaksi di baris tersebut. Saldo dihitung dari seluruh riwayat anggota, bukan hanya dari periode yang sedang ditampilkan, sehingga saldo baris terbaru sama dengan saldo akhir di Kartu Simpanan.

Karena saldonya berjalan, tabel ini hanya bisa diurutkan menurut **Tanggal** (terbaru atau terlama). Kolom lain sengaja tidak bisa diurutkan, supaya baris tetap kronologis dan saldo tetap terbaca.

Saat mencari anggota, muncul ringkasan di atas tabel:

- **Satu anggota cocok**: nama, kode, KPK, kartu **Total Simpanan**, dan satu kartu per jenis simpanan (saldo, jumlah setor, jumlah ambil). Klik kartu jenis untuk menampilkan buku jenis itu di tabel; klik **Total Simpanan** untuk kembali ke semua jenis. Tombol **Kartu Simpanan** membuka kartu anggota tersebut.
- **Beberapa anggota cocok**: daftar anggota beserta total simpanannya. Klik salah satu untuk memilihnya.

Saldo di ringkasan dihitung dari seluruh riwayat sampai filter **Sampai Tanggal** (bila diisi), sama dengan kolom Saldo. Filter **Dari Tanggal** dan **Jenis** hanya menyaring tabel. Ringkasan tidak ikut tercetak.

> **Tips:** Untuk membaca seperti rekening koran, cari satu anggota, klik kartu jenisnya, lalu klik judul kolom **Tanggal** untuk mengurutkan dari yang terlama.

## Kartu Simpanan

**Simpanan → Kartu Simpanan** menampilkan mutasi **satu anggota** per jenis simpanan dengan saldo berjalan, seperti buku tabungan.

1. Ketik kode anggota, KPK, atau nama, lalu pilih anggota.
2. Isi periode **Dari** dan **Sampai**.
3. Setiap jenis simpanan tampil sebagai tabel: saldo awal, baris setor/ambil, dan saldo akhir.
4. Tekan **Cetak** untuk mencetak kartu.

Jika tidak ada transaksi pada periode itu, tampil *Tidak ada mutasi pada periode ini.*

## Grafik Analisa

**Simpanan → Grafik Analisa** menampilkan arus simpanan **per bulan** untuk tahun yang dipilih:

- **Arus Simpanan per Bulan**: batang kiri setoran (berwarna per jenis), batang kanan pengambilan.
- **Saldo Akhir per Bulan**: saldo seluruh simpanan di akhir tiap bulan.
- **Rincian per Bulan**: angka di balik grafik, termasuk saldo awal tahun dan total setoran/pengambilan.

## Simpanan Berjangka

**Simpanan → Simpanan Berjangka** menampilkan saldo simpanan berjangka (jenis 05) per anggota. Tombol **Setor** dan **Pengambilan** di halaman ini membuka form simpanan dengan jenis *Simpanan Berjangka* sudah terpilih. Klik nama anggota untuk membuka Kartu Simpanan anggota itu.
