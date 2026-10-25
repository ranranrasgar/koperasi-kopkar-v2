---
judul: Pengajuan kredit dari aplikasi mobile
ringkasan: Alur pengajuan dari anggota, cara menyetujui atau menolak, dan meneruskannya ke pencairan.
menu: /dashboard/loans/apply
---
Anggota mengajukan pinjaman lewat **aplikasi anggota** (aplikasi Android lama, atau aplikasi anggota baru di browser HP). Pengajuan masuk ke **Pinjaman → Pengajuan Kredit**.

## Yang sudah diperiksa sistem (aplikasi anggota baru)

Pengajuan dari aplikasi anggota baru diperiksa di server sebelum masuk ke daftar ini:

- Jenis kredit sesuai status anggota: anggota staff hanya bisa memilih produk staff, non staff hanya produk non staff.
- Besar pinjaman tidak melebihi **batas plafon**: nominal **grade anggota** bila jenis kredit mengunci grade (grade diutamakan), selain itu **Maksimal Plafond** jenis kredit bila diisi. Aturan lengkapnya ada di panduan *Jenis pinjaman*.
- Jenis kredit yang bertanda **Tidak untuk mobile** tidak ditampilkan di aplikasi anggota.
- Untuk jenis kredit yang dikunci sisa: tidak ada pinjaman jenis yang sama yang masih bersisa lebih dari **Rp 100**. Sisa receh pembulatan Rp 100 ke bawah dianggap lunas.
- Lama pinjaman 1 sampai maksimal cicilan jenis kredit; tanggal realisasi tidak sebelum hari ini dan paling lambat satu tahun ke depan.
- Persen bunga, adm, provisi, dan denda **diambil dari data jenis kredit**, bukan dari isian anggota.
- Satu anggota hanya bisa punya satu pengajuan **Menunggu** untuk jenis kredit yang sama.

Pengajuan dari aplikasi Android lama hanya diperiksa di HP anggota, jadi tetap periksa jenis, plafon, dan bunganya sebelum memutuskan.

## Status pengajuan

| Status | Arti | Yang bisa dilakukan |
| --- | --- | --- |
| **Menunggu** (P) | Belum diputuskan | Setujui atau Tolak |
| **Disetujui** (Y) | Disetujui pengurus | Cairkan |
| **Ditolak** (N) | Ditolak | Tidak ada; pengajuan selesai |

Pilih status di kotak di atas tabel untuk melihat pengajuan per status, atau **Semua**.

## Memutuskan pengajuan

1. Periksa nama, jenis kredit, pokok, lama, dan bunga yang diajukan.
2. Periksa kemampuan bayar anggota, misalnya pinjaman yang masih berjalan dan potongan gaji bulanannya.
3. Tekan **Setujui** atau **Tolak**, lalu konfirmasi.

> **Penting:** Keputusan **tidak bisa dibatalkan** dari web. Hanya pengajuan berstatus Menunggu yang bisa diputuskan; jika dua petugas memutuskan bersamaan, yang kedua mendapat pesan *Pengajuan tidak ada atau sudah diputuskan*.

Anggota dikabari keputusan lewat notifikasi aplikasi (dan email bila emailnya terverifikasi).

Menyetujui pengajuan **belum mencairkan uang**. Tidak ada jurnal yang terbentuk sampai pencairan dicatat.

## Mencairkan pengajuan yang disetujui

Pada pengajuan berstatus Disetujui, tekan **Cairkan** (hanya tampil bila Anda punya izin pencairan). Form **Input Pinjaman Tunai** terbuka dengan anggota, jenis kredit, pokok, lama, dan bunga sudah terisi dari pengajuan. Periksa pratinjau jadwal, pilih kas/bank, lalu simpan seperti pencairan biasa.
