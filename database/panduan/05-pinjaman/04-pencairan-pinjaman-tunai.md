---
judul: Pencairan pinjaman tunai
ringkasan: Memilih anggota dan membaca riwayatnya, jenis kredit yang sesuai, batas plafon, pratinjau jadwal, data dan jurnal yang terbentuk, serta informasi yang dikirim ke anggota.
menu: /dashboard/loans/create-cash
---
Menu: **Pinjaman → Input Pinjaman Tunai**. Membutuhkan izin pencairan pinjaman koperasi dan/atau bank. Jenis pinjaman yang tampil hanya yang grupnya Anda izinkan.

## Syarat sebelum mencairkan

- Pengajuan sudah disetujui sesuai kebijakan koperasi (dari aplikasi mobile atau formulir kertas).
- Jenis pinjaman sesuai status anggota (staff atau non-staff) dan aturan di pengaturan jenis kredit.
- Pokok pinjaman tidak melebihi batas plafon anggota untuk jenis itu.
- Lama angsuran tidak melebihi **maksimum cicilan** jenis pinjaman.
- Dana tersedia di kas/bank yang akan dipakai.

## Langkah

1. Pilih **Anggota**. Segera muncul **ringkasan risiko** dan **Riwayat pinjaman** anggota itu (lihat di bawah).
2. Pilih **Jenis Kredit**. Daftarnya mengikuti aturan di *Jenis Pinjaman* dan status anggota, sama seperti di aplikasi anggota:
   - **Tersedia**: jenis yang boleh diajukan anggota lewat aplikasi.
   - **Khusus operator**: jenis bertanda *Tidak untuk mobile* (misalnya produk bank atau pihak lain). Tetap bisa dipilih operator.
   - **Tidak tersedia untuk anggota ini** (tidak bisa dipilih, dengan alasannya): hanya untuk Staff / bukan untuk Staff, masih ada pinjaman jenis ini yang berjalan (jenis yang mengunci tunggakan), atau grade anggota belum diisi.
3. Isi **Tanggal Pinjaman**, **Pokok Pinjaman (Rp)**, dan **Lama Angsuran (kali)**. Di bawah isian pokok tampil **batas maksimal** anggota untuk jenis itu; bila pokok melebihinya muncul pesan merah dan tombol Cairkan nonaktif.
4. **Bunga (%)** mengikuti pengaturan jenis kredit. **Hanya admin atau superadmin yang boleh mengubahnya**; untuk operator lain isian ini terkunci.
5. Pilih **Dibayar dari Kas/Bank**.
6. Periksa **Pratinjau Jadwal** di samping form: total jasa, adm, provisi, dan jadwal setiap angsuran beserta tanggal jatuh temponya. Pratinjau dihitung dengan rumus yang sama dengan saat menyimpan.
7. Tekan **Cairkan Pinjaman**.

## Riwayat dan risiko anggota

Setelah anggota dipilih, halaman menampilkan:

- **Satu baris ringkasan berwarna**: *ada pinjaman macet sekarang*, *menunggak N angsuran*, *pernah terlambat atau pernah macet*, atau *tidak ada tunggakan*, beserta sisa utang dan angsuran per bulan.
- **Kartu**: sisa utang berjalan, tunggakan sekarang dan kolektibilitasnya, **pernah macet**, jumlah pinjaman tercatat (berapa lunas), simpanan, serta grade dan batas jenis yang dipilih.
- **Tabel semua pinjaman** (tunai dan KPR): tanggal, jenis, pokok, angsuran dibayar, sisa pokok, keterlambatan terlama, dan status (Lunas, Berjalan, Menunggak).

Cara membacanya:

| Istilah | Arti |
| --- | --- |
| Tunggakan sekarang | Angsuran yang bulan jatuh temponya sudah berakhir tetapi belum dibayar |
| Kolektibilitas | Dari lama menunggak: 1-90 hari Dalam Perhatian Khusus, 91-120 Kurang Lancar, 121-180 Diragukan, lebih dari 180 Macet |
| Telat terlama | Selisih terbesar antara tanggal bayar dan jatuh tempo suatu angsuran. Bayar lebih awal (potongan gaji dibukukan akhir bulan) dihitung 0 |
| Pernah macet | Ada angsuran yang pernah dibayar **lebih dari 180 hari** setelah jatuh tempo, atau sekarang menunggak lebih dari 180 hari |

Riwayat ini alat bantu keputusan; sistem tidak menolak pencairan hanya karena riwayatnya.

## Yang dibuat sistem dalam satu transaksi

| Data | Isi |
| --- | --- |
| Nomor pinjaman | `CR-mmyy-urut`, contoh `CR-1026-23001` |
| Data pinjaman | Anggota, jenis, pokok, lama, bunga, adm, provisi, tanggal jatuh tempo |
| Rincian | Satu baris *PENCAIRAN PINJAMAN* berisi pokok dan total jasa |
| Jadwal tagih | Satu baris per angsuran: pokok, jasa, adm/provisi (angsuran 1), tanggal jatuh tempo |
| Jurnal | **Debit** akun piutang jenis pinjaman, **Kredit** kas/bank, sebesar **pokok** |

Contoh C01 Rp 6.000.000 dari Bank OCBC NISP:

| Akun | Debit | Kredit |
| --- | --- | --- |
| Piutang pinjaman uang (akun piutang C01) | 6.000.000 | |
| 1.1.01.41 Bank OCBC NISP | | 6.000.000 |

> **Catatan:** Jasa, adm, dan provisi **belum** dijurnal saat pencairan. Ketiganya baru dicatat sebagai pendapatan ketika angsuran dibayar.

Jika ada isian yang salah, pinjaman tidak tersimpan sama sekali (tidak ada data setengah jadi). Server juga menolak pokok di atas batas plafon dan bunga yang diubah oleh operator yang bukan admin, walaupun permintaannya dikirim tanpa lewat form.

## Informasi untuk anggota

Setelah pencairan tersimpan, anggota otomatis dikabari:

- **Notifikasi di aplikasi anggota** (riwayat dan notifikasi ke HP): jenis kredit, pokok, lama, tanggal pencairan, serta angsuran ke-1 dan jatuh temponya.
- **Email** (hanya bila emailnya sudah terverifikasi) berisi ringkasan kredit, jadwal angsuran, dan **lampiran PDF jadwal angsuran** yang bisa diunduh.

Pesan hasil di layar menyebutkan apakah notifikasi dan email terkirim. Kegagalan mengirim **tidak membatalkan pencairan**. Di mode uji tidak ada yang dikirim.

Bila anggota belum menerima atau meminta salinan, buka **detail pinjaman** (klik nomor pinjaman di Daftar Pinjaman atau Cari Pinjaman) lalu tekan **Kirim info ke anggota**.
