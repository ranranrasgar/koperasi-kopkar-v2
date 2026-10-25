---
judul: Notifikasi admin, nomor WhatsApp, dan email
ringkasan: Cara admin diberi tahu ada pendaftar baru, mengatur nomor WhatsApp koperasi, dan email yang dikirim ke pendaftar.
menu: /dashboard/settings
---
## Pemberitahuan ke admin

Setiap pendaftaran baru yang emailnya sudah terbukti memunculkan:

- **Lonceng** di navbar admin (untuk operator berizin menu *Request User && Anggota Baru*).
- **Notifikasi push** ke browser operator berizin, bila notifikasi sudah diaktifkan.
- **Email ke pengurus**, bila `EMAIL_NOTIF_ADMIN` diisi di pengaturan server (alamat dipisah koma).

Tautan di pemberitahuan membuka **User Mobile**.

## Nomor WhatsApp koperasi

Dipakai tombol **Hubungi kami lewat WhatsApp** di halaman *Pendaftaran diterima* serta di Kebijakan Privasi dan Syarat.

1. Buka **Sistem & Pengaturan → Pengaturan Perusahaan**.
2. Di kartu **Kontak WhatsApp**, isi nomor, misalnya `081234567890` (awalan 0 otomatis menjadi 62).
3. Klik **Simpan**. Kosongkan nomor untuk menyembunyikan tombol.

Pesan WhatsApp sudah terisi otomatis (nama dan email pendaftar), tinggal dikirim anggota.

## Email ke pendaftar

| Kapan | Isi |
| --- | --- |
| Mendaftar (jalur kode) | Kode verifikasi 6 angka (berlaku 15 menit) |
| Disetujui | **Email resmi berkop koperasi** (lihat di bawah) |
| Ditolak | Pendaftaran belum dapat disetujui, hubungi pengurus |

Kode verifikasi dan reset password didahulukan dan **tidak** kena batas kirim per jam. Email lain (siaran dan pemberitahuan) mengikuti kuota `EMAIL_MAKS_PER_JAM`.

### Isi email "Akun aplikasi anggota Anda sudah aktif"

Dikirim otomatis ke email yang sudah terverifikasi begitu admin menekan **Setujui**. Tampilannya resmi:

1. **Kop**: nama dan alamat koperasi (diambil dari **Pengaturan Perusahaan**, jadi ubah di sana bila ingin kop berubah).
2. **Pembuka** "Yth. (username)" dan pemberitahuan bahwa pendaftaran disetujui pengurus.
3. **Informasi akun** (tabel): username, email terdaftar, kode anggota (bila dibuatkan atau ditautkan), dan status akun Aktif.
4. **Cara masuk**: buka aplikasi lewat tombol, masuk dengan username dan password buatan sendiri atau lewat Google, dan fitur yang bisa dipakai.
5. **Keamanan password**: jangan bagikan password (pengurus tidak pernah memintanya); **cara mengganti password** (masuk, menu Akun, Ganti password, isi password lama lalu baru; perangkat lain otomatis keluar); segera ganti bila password diatur pengurus; dan **cara bila lupa** (Lupa password di halaman masuk, ikuti tautan di email, berlaku 30 menit).
6. **Bantuan** (menu Pesan di aplikasi atau sekretariat) dan penutup dari pengurus.

Email dikirim dengan tombol **Buka aplikasi** bila alamat aplikasi anggota (`ANGGOTA_URL`) sudah diisi di pengaturan server.

## Bagaimana email dikirim (antrean)

Aplikasi tidak mengirim email langsung. Setiap email dimasukkan dulu ke **antrean** (`email_antrean`), lalu pekerja di server mengirimnya bertahap. Dengan begitu menyetujui pendaftaran tetap cepat dan email yang gagal dicoba ulang otomatis. Status tiap email:

| Status | Artinya |
| --- | --- |
| `menunggu` | Di antrean, belum dikirim (atau menunggu giliran kuota). |
| `terkirim` | Sudah diterima server email. Lampiran (PDF) dibuang dari antrean setelah terkirim. |
| `dicatat` | **Tidak dikirim**: SMTP belum diisi, atau server uji dan penerimanya di luar daftar uji. Alasannya ada di kolom galat. |
| `gagal` | Gagal berulang kali; galat menyebut penyebabnya (mis. login SMTP ditolak). |

Bila email tidak masuk: (1) cek status di antrean, (2) cek folder spam penerima, (3) pastikan alamat email akun benar, (4) lihat panduan SMTP di `docs/smtp-email.md`.

## Email di server uji

**Server uji** (port 3101) memakai salinan database yang berisi email anggota sungguhan, sehingga **tidak pernah mengirim email nyata** ke siapa pun; semua email berstatus `dicatat`. Untuk menguji email dengan aman, isi `EMAIL_UJI_KE` di `frontend/.env.local` dan `anggota/.env.local` dengan alamat Anda sendiri, misalnya `EMAIL_UJI_KE=saya@gmail.com,@kantor.com` (alamat lengkap atau `@domain`, dipisah koma), lalu jalankan ulang server uji. **Hanya penerima di daftar itu yang dikirimi sungguhan**; anggota lain tetap hanya dicatat. Email yang sudah berstatus `dicatat` tidak dikirim ulang sendiri; daftarkan ulang pendaftarannya, atau minta pengembang mengembalikan statusnya ke `menunggu`.
