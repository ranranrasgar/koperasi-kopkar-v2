---
judul: Detail pinjaman dan semua tombolnya
ringkasan: Isi halaman detail pinjaman tunai, arti setiap status, dan fungsi tombol Cetak, Ekspor, Bukti Pencairan, Buku Pinjaman, Kirim info, Tutup Pinjaman, serta Batalkan.
menu: /dashboard/loans
---
Halaman detail dibuka dengan mengklik **nomor pinjaman** di **Daftar Pinjaman**, **Cari Pinjaman**, **Kredit Macet**, atau **Buku Pinjaman**. Halaman ini menampilkan satu pinjaman secara lengkap dan menjadi tempat semua tindakan atas pinjaman itu.

Halaman ini bisa dibuka operator yang menangani pinjaman grup tersebut (menu laporan, pencairan, angsuran, tunggakan, atau pengajuan untuk grup KOPERASI atau BANK / PIHAK LAIN), walaupun tidak berizin Daftar Pinjaman.

## Bagian atas: status pinjaman

Di samping nomor pinjaman ada label status:

| Label | Arti |
| --- | --- |
| **Berjalan** | Belum lunas dan tidak ada angsuran yang terlambat |
| **Menunggak N angsuran** | Ada N angsuran yang bulan jatuh temponya sudah lewat tetapi belum dibayar |
| **Lunas** | Pokok dan jasa sudah terbayar penuh, atau pinjaman ditutup, atau pencairannya dibatalkan |

## Ringkasan

| Isian | Arti |
| --- | --- |
| Anggota, KPK / Kode | Pemilik pinjaman |
| Jenis Kredit, Grup | Jenis pinjaman dan grupnya (KOPERASI atau BANK / PIHAK LAIN) |
| Tgl Realisasi | Tanggal pencairan |
| Lama Angsuran | Jumlah bulan dan berapa yang sudah terbayar |
| Bunga | Persen jasa dan per berapa bulan |
| Pinjaman, Uang Muka, Adm / Provisi | Nilai saat pencairan |
| Angsuran / Bulan | Pokok + jasa per bulan menurut jadwal |
| Total Jasa | Jasa untuk seluruh masa pinjaman |
| Sudah Dibayar (pokok + jasa) | Uang yang benar-benar diterima menurut Riwayat Pembayaran |
| Sisa Pokok | Mengikuti jadwal cicilan seperti aplikasi desktop. Bila buku pinjaman membagi pembayaran berbeda, saldo bukunya ditulis di catatan di bawah ringkasan |
| Jatuh Tempo Berikut | Tanggal angsuran berikutnya |
| Operator | Yang mencairkan |

Keterangan tambahan bisa muncul di bawah ringkasan:

- **Sisa jasa**: pinjaman koperasi yang cicilannya sudah penuh tetapi jasanya masih kurang. Pinjaman tetap berjalan sampai sisanya dibayar lewat Setoran Angsuran atau ditutup.
- **Jasa tidak ditagih**: pinjaman lunas yang jasanya dibayar kurang dari yang dibebankan.
- **Ditutup tanpa jurnal**: siapa yang menutup, kapan, dan alasannya.
- **Pencairan dibatalkan**: nomor pembalik dan alasannya.

## Tab Jadwal Angsuran dan Riwayat Pembayaran

**Jadwal Angsuran** berisi semua angsuran dari awal sampai akhir, dengan status per baris:

| Status | Arti |
| --- | --- |
| Terbayar | Angsuran ke itu sudah dibayar |
| Terlambat | Bulan jatuh temponya sudah lewat, belum dibayar |
| Jatuh tempo bulan ini | Jatuh tempo di bulan berjalan, belum dibayar |
| Belum jatuh tempo | Masih di bulan yang akan datang |
| Ditutup | Tidak pernah dibayar, tetapi pinjaman ditutup lewat Tutup Pinjaman |
| Lunas | Pinjaman sudah lunas sebelum angsuran ini |

**Riwayat Pembayaran** adalah isi buku pinjaman: pencairan, setiap angsuran, dan pembatalan, beserta saldo buku setelah tiap baris. Baris pembatalan ditandai **DIBATALKAN** dan diikuti baris pembaliknya.

Di kolom paling kanan Jadwal Angsuran ada ikon printer untuk mencetak ulang kwitansi angsuran, dan ikon batal (panah melingkar merah) di **angsuran terakhir** bagi operator yang berhak membatalkan.

## Tombol di kanan atas

| Tombol | Fungsi | Mengubah data? |
| --- | --- | --- |
| **Cetak** | Mencetak ringkasan, seluruh jadwal, dan seluruh riwayat pembayaran berkop koperasi, tidak tergantung tab yang terbuka | Tidak |
| **Ekspor** | Isi yang sama dengan Cetak, diunduh sebagai berkas Excel | Tidak |
| **Bukti Pencairan** | Mencetak kwitansi pencairan pinjaman (format printer dot matrix) | Tidak |
| **Buku Pinjaman** | Mencetak kartu buku pinjaman anggota (format printer dot matrix) | Tidak |
| **Kirim info ke anggota** | Mengirim ulang notifikasi dan email berisi informasi kredit dan PDF jadwal angsuran ke anggota | Tidak, hanya mengirim pesan |
| **Tutup Pinjaman** | Menandai pinjaman lunas tanpa uang masuk dan tanpa jurnal | Ya, status saja |
| **Batalkan Penutupan** | Mengembalikan pinjaman yang ditutup menjadi berjalan | Ya, status saja |
| **Batalkan Pencairan** | Membatalkan pinjaman yang belum punya angsuran, dengan jurnal pembalik | Ya, membuat jurnal |
| **Batalkan Pinjaman** | Membatalkan semua angsuran lalu pencairannya sekaligus, dengan jurnal pembalik | Ya, membuat jurnal |

Tombol yang tidak berlaku untuk keadaan pinjaman itu tidak ditampilkan. Misalnya Tutup Pinjaman tidak muncul pada pinjaman yang sudah lunas, dan Batalkan Pencairan hanya muncul bila belum ada angsuran.

### Kirim info ke anggota

1. Tekan **Kirim info ke anggota**, lalu jawab **Ya** di dialog konfirmasi.
2. Anggota menerima notifikasi di aplikasi. Bila emailnya sudah terverifikasi, anggota juga menerima email dengan lampiran PDF jadwal angsuran.
3. Pesan hasil menyebutkan apa yang terkirim. Bila anggota belum punya akun aplikasi aktif, tidak ada yang bisa dikirimi dan pesannya menyebut itu.

Di **Mode Uji** tidak ada yang dikirim ke anggota.

### Tutup Pinjaman dan Batalkan

Ketiga tindakan ini mengubah data dan dijelaskan lengkap di artikel tersendiri:

- **Menutup pinjaman tanpa jurnal**: kapan dipakai, alurnya, dan pengaruhnya ke neraca.
- **Membatalkan pinjaman, pencairan, dan angsuran**: syarat, alur, dan jurnal pembaliknya.

## Memilih tindakan yang tepat

| Keadaan | Tindakan |
| --- | --- |
| Anggota membayar angsuran atau pelunasan ke koperasi | **Setoran Angsuran** (bukan dari halaman ini) |
| Angsuran terakhir salah input (nilai, tanggal, atau dobel) | Ikon batal di baris angsuran terakhir, lalu input ulang yang benar |
| Pinjaman salah input dan belum ada angsuran | **Batalkan Pencairan** |
| Pinjaman salah input, atau anggota membatalkan pinjaman dan mengembalikan uangnya, padahal sudah ada angsuran | **Batalkan Pinjaman** |
| Pinjaman sudah selesai di luar koperasi (lunas langsung ke bank, top-up, data migrasi) | **Tutup Pinjaman** |
| Sisa jasa pinjaman koperasi dibebaskan pengurus | **Tutup Pinjaman**, tulis keputusan pengurus di alasan |
| Pinjaman ditutup karena keliru | **Batalkan Penutupan** |

## Siapa yang bisa

| Tindakan | Yang berhak |
| --- | --- |
| Melihat detail, Cetak, Ekspor, Bukti Pencairan, Buku Pinjaman, Kirim info | Operator yang menangani pinjaman grup itu |
| Tutup Pinjaman, Batalkan Penutupan | Grup **superadmin** dan **admin** |
| Batalkan angsuran, Batalkan Pencairan, Batalkan Pinjaman | Operator berizin **D** pada baris Audit Data (Batal Transaksi) di Kelola Hak Akses; awalnya hanya superadmin |
