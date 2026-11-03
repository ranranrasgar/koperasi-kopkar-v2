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
| **Disetujui** (Y) | Disetujui pengurus | Cairkan, atau **Batalkan** selama belum dicairkan |
| **Ditolak** (N) | Ditolak | Tidak ada; pengajuan selesai |

Pilih status di kotak di atas tabel untuk melihat pengajuan per status, atau **Semua**.

## Memutuskan pengajuan

1. Tekan **Lihat** pada baris pengajuan. Jendela tinjauan menampilkan:
   - rincian pengajuan (jenis, pokok, lama, bunga, keperluan) dan peringatan merah bila pokok melebihi batas plafon;
   - ringkasan risiko berwarna: macet sekarang (merah), menunggak (oranye), pernah terlambat atau pernah macet (kuning), atau bersih (hijau);
   - identitas anggota: kode/KPK, KTP, alamat, telepon, bank, bagian dan tanggal mulai kerja (dari data karyawan Mattel bila tertaut), jabatan, grade, gaji pokok;
   - kartu sisa utang berjalan, angsuran per bulan, tunggakan beserta kolektibilitasnya, pernah macet, jumlah pinjaman, simpanan, dan grade;
   - tabel semua pinjaman tunai dan KPR anggota (pokok, angsuran dibayar, sisa pokok, keterlambatan terlama, status).

   Ringkasan dan tabel ini sama dengan panel riwayat di form pencairan pinjaman tunai.

   Di atas jendela tinjauan ada dua tombol:
   - **Cetak / PDF**: membuka dokumen berkop koperasi (A4) berisi seluruh tinjauan. Untuk berkas PDF, tekan **Cetak** lalu pilih tujuan **Simpan sebagai PDF**. Tabel riwayat ikut tercetak sebanyak yang tampil; tekan *Tampilkan semua* dulu bila perlu semua pinjaman.
   - **Kirim ke WA**: membuka WhatsApp ke nomor HP anggota dengan pesan ringkasan pengajuan (jenis, pokok, lama, sisa utang, tunggakan). WhatsApp tidak bisa menerima lampiran dari tautan, jadi lampirkan PDF hasil cetak secara manual di chat itu. Tombol nonaktif bila HP anggota kosong atau bukan nomor HP.
2. Nilai kemampuan bayar anggota dari data itu, misalnya pinjaman yang masih berjalan, tunggakan, dan potongan gaji bulanannya.
3. Tekan **Setujui** atau **Tolak** (di jendela tinjauan atau di baris tabel), lalu konfirmasi.

> **Penting:** Penolakan **tidak bisa dibatalkan** dari web, dan persetujuan hanya bisa dibatalkan selama belum dicairkan (lihat di bawah). Hanya pengajuan berstatus Menunggu yang bisa disetujui atau ditolak; jika dua petugas memutuskan bersamaan, yang kedua mendapat pesan *Pengajuan tidak ada atau sudah diputuskan*.

Anggota dikabari keputusan lewat notifikasi aplikasi (dan email bila emailnya terverifikasi).

Menyetujui pengajuan **belum mencairkan uang**. Tidak ada jurnal yang terbentuk sampai pencairan dicatat.

Selama pengajuan yang disetujui belum dicairkan, jenis pinjaman yang memakai **Kunci jika belum lunas** tidak bisa diajukan lagi oleh anggota itu. Tandanya hilang begitu pinjaman tunai jenis yang sama dicairkan untuk anggota tersebut, baik lewat tombol **Cairkan** maupun lewat form pencairan biasa. Bila pengajuan tidak jadi dicairkan, tekan **Batalkan** pada barisnya: status menjadi Ditolak, anggota dikabari, dan kuncinya terbuka.

## Mencairkan pengajuan yang disetujui

Pada pengajuan berstatus Disetujui, tekan **Cairkan** (hanya tampil bila Anda punya izin pencairan). Form **Input Pinjaman Tunai** terbuka dengan anggota, jenis kredit, pokok, lama, dan bunga sudah terisi dari pengajuan. Periksa pratinjau jadwal, pilih kas/bank, lalu simpan seperti pencairan biasa.
