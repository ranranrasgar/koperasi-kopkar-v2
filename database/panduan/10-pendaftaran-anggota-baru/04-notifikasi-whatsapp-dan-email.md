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
| Mendaftar (jalur kode) | Kode verifikasi 6 angka |
| Disetujui | Akun aktif, serta kode anggota bila dibuatkan anggota, dan tautan masuk |
| Ditolak | Pendaftaran belum dapat disetujui, hubungi pengurus |

Kode verifikasi dan reset password didahulukan dan **tidak** kena batas kirim per jam. Email lain (siaran dan pemberitahuan) mengikuti kuota `EMAIL_MAKS_PER_JAM`.

> Bila email tidak terkirim, periksa status di antrean (`email_antrean`) dan panduan pengaturan email di dokumen `docs/smtp-email.md`.
