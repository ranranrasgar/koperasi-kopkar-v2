---
judul: Pengaturan Google dan email (superadmin)
ringkasan: Yang harus ada agar Lanjut dengan Google dan pengiriman email berjalan: Google Console, SMTP, SPF, dan tabel database.
menu: /dashboard/settings
---
Bagian ini untuk **superadmin / pengelola server**. Nilai rahasia (sandi, secret) **hanya** ditulis di berkas `.env.local` server, tidak di aplikasi dan tidak dikirim lewat chat.

## Masuk dengan Google

1. Di **Google Cloud Console → APIs & Services → Credentials**, buat **OAuth client ID** tipe *Web application*.
2. Daftarkan **Authorized redirect URI** untuk setiap alamat aplikasi anggota, persis dengan awalan `http`/`https`, host, port, dan jalur `/auth/google/callback`. Contoh uji: `http://localhost:3201/auth/google/callback`; produksi: `https://<domain>/auth/google/callback`. `localhost` dan `127.0.0.1` dianggap berbeda.
3. Isi di `anggota/.env.local`: `GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_SECRET`. Jalankan ulang server.
4. Tombol **Lanjut dengan Google** muncul otomatis bila kedua nilai ada. Selama aplikasi Google masih mode *Testing*, hanya email yang didaftarkan sebagai *Test users* yang bisa masuk.
5. Layar persetujuan memuat tautan **Kebijakan Privasi** (`/policy`) dan **Syarat dan Ketentuan** (`/terms`) milik aplikasi anggota.

Galat `redirect_uri_mismatch` berarti alamat balik belum terdaftar di client yang dipakai (cek juga bahwa Client ID di `.env.local` sama dengan client yang Anda edit).

## Email (SMTP)

- Isi `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, dan `SMTP_FROM` di `anggota/.env.local` **dan** `frontend/.env.local`.
- Uji: `npm run email:uji -- alamat@penerima.com`. Atur sandi dengan `npm run email:sandi`.
- Agar email tidak ditolak Gmail, domain pengirim butuh **record SPF** (dan sebaiknya DKIM) di DNS. Rinciannya ada di `docs/smtp-email.md`.
- Server uji tidak mengirim email sungguhan. Cara aman mencobanya: isi `EMAIL_UJI_KE=alamat-anda@contoh.com` (hanya penerima itu yang dikirimi; lihat artikel *Notifikasi admin, nomor WhatsApp, dan email*). `EMAIL_UJI_KIRIM=1` membuka pengiriman ke semua anggota di salinan; jangan dipakai bersama siaran.

## Tabel database

Fitur pendaftaran memakai tabel dan kolom khusus web. Jalankan sekali per database (aman diulang):

```
npm run anggota:pasang
```

Ini memasang antara lain tabel tautan Google, kolom penanda **menunggu admin**, dan kolom **keputusan pendaftaran**. Tanpa ini, login anggota dan persetujuan pendaftaran akan galat.

## Alamat dan variabel lain

| Variabel | Fungsi |
| --- | --- |
| `ANGGOTA_URL` | Alamat aplikasi anggota di tautan email |
| `ADMIN_URL` | Alamat admin di email pengurus |
| `EMAIL_NOTIF_ADMIN` | Penerima email pemberitahuan pendaftar baru |
| `EMAIL_MAKS_PER_JAM` / `EMAIL_MAKS_PER_HARI` | Batas kirim email biasa |
