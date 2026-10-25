---
judul: Menyetujui, menolak, dan menghapus akun
ringkasan: Langkah memutuskan pendaftaran di User Mobile, dan aturan hapus akun (termasuk akun yang sudah terhubung ke anggota).
menu: /dashboard/members/mobile-users
---
Semua keputusan dilakukan di **Keanggotaan → User Mobile**. Pilih filter **Anggota baru (menunggu)** untuk melihat yang perlu diputuskan.

## Menyetujui

1. Periksa baris pendaftar: nama, NIK (kolom KPK), dan email.
2. Klik **centang hijau (Setujui)**.
3. **Pendaftar yang belum anggota:** muncul form **Kelengkapan data anggota baru**. Isiannya sudah terisi dari data Karyawan Mattel dan nilai awal simpanan dari Pengaturan Perusahaan; periksa, lengkapi, dan ubah bila perlu (lihat bagian di bawah), lalu klik **Setujui dan jadikan anggota**.
4. **Pendaftar yang sudah punya anggota** (NIK sudah terdaftar): tidak ada form, cukup konfirmasi; akun ditautkan ke anggota itu.
5. Akun menjadi aktif, dan **kode anggota** tampil di pesan hasil serta dikirim ke email pendaftar.

### Form kelengkapan data anggota baru

| Bagian | Isi |
| --- | --- |
| Identitas | Nama lengkap (wajib), jenis kelamin, alamat, kota, kode pos, HP, telepon rumah |
| Rekening | Bank, nomor rekening, atas nama rekening |
| Kepegawaian | **Grade** (pilihan dari tabel Grade; grade di data karyawan terpilih otomatis bila ada), status staff (Staff atau No Staff). **Nominal plafon** ditampilkan dari tabel Grade dan tidak diketik |
| **Simpanan awal** | **Pokok, wajib, dan sukarela** yang dipotong tiap bulan. Di bawah tiap kolom tertulis asal nilainya: *Dari Pengaturan Perusahaan* atau *Tebakan dari anggota baru* |

Grade harus ada di tabel **Data Master → Grade Anggota**; bila belum ada, tambahkan dulu di sana. Nilai simpanan boleh diubah admin untuk anggota ini saja; pengaturan umumnya tidak ikut berubah. Bila ada isian yang tidak sah (misalnya nama kosong, angka negatif, atau teks melebihi batas), pesan galat muncul di form dan **tidak ada yang tersimpan**, jadi akun tetap menunggu keputusan.

> **Syarat:** email pendaftar harus sudah terverifikasi. Bila belum, tombol Setujui tidak aktif.

Bila NIK ternyata sudah punya data anggota yang **tidak aktif**, persetujuan dibatalkan dengan pesan *Keanggotaan dengan NIK ini tidak aktif*. Aktifkan anggotanya lebih dulu di **Daftar Anggota**.

## Menolak

Klik **silang oranye (Tolak)**. Akun tetap nonaktif, statusnya menjadi **Ditolak** (bisa dilihat dengan filter *Ditolak*), dan pendaftar dapat email yang mengarahkan mereka menghubungi pengurus. Pendaftar yang ditolak tidak bisa masuk.

## Menjadikan anggota (akun yang sudah aktif)

Akun karyawan Mattel yang sudah aktif tetapi belum anggota (misalnya disetujui sebelum fitur ini ada) punya tombol **ikon tambah orang (Jadikan anggota)**. Form kelengkapan yang sama muncul untuk dilengkapi sebelum data anggota dibuat dengan kode baru. Bila NIK sudah punya anggota, akun hanya ditautkan.

## Menghapus akun

Klik **tempat sampah**, lalu konfirmasi. Tindakan ini **tidak bisa dibatalkan**.

| Yang terhapus | Yang tidak terhapus |
| --- | --- |
| Akun, foto profil, langganan notifikasi, pengantar, verifikasi email, tautan Google, dan percakapan pesan anggota itu | Data **anggota** dan semua data keuangan (simpanan, pinjaman, jurnal) |

- Akun yang **sudah terhubung ke anggota** hanya boleh dihapus oleh **superadmin atau grup admin**. Operator lain menerima penolakan.
- Menghapus akun **secara bawaan tidak menghapus keanggotaan**. Anggota bisa mendaftar lagi dengan NIK yang sama.
- **Menghapus keanggotaan sekaligus** (untuk anggota yang keliru dibuat dari pendaftaran): setelah konfirmasi hapus akun, muncul kotak verifikasi. **Ketik kode anggota** untuk juga menghapus data anggota beserta pengajuan, notifikasi, dan tabel kerjanya; data karyawan di menu Karyawan Mattel kembali berstatus **Belum** anggota. Kosongkan kotak itu bila anggota harus tetap ada.
- Keanggotaan **tidak bisa dihapus** bila sudah punya transaksi pembukuan (simpanan, pinjaman, KPR, potongan gaji, SHU); seluruh penghapusan dibatalkan dan pesan menyebut jumlah transaksinya. Anggota seperti itu cukup dinonaktifkan lewat data anggota supaya laporan keuangan tetap utuh.
- Dalam **mode uji**, hasilnya tidak tersimpan (lihat artikel *Mode uji dan database uji*).
