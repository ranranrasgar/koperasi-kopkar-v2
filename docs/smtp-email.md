# Mengaktifkan pengiriman email (SMTP)

Aplikasi anggota dan admin mengirim email lewat antrean (`email_antrean`) memakai SMTP dari env. Tanpa SMTP, email **hanya dicatat di log server** (termasuk kode verifikasi), jadi tidak ada yang terkirim.

## 1. Gmail (cara tercepat)

1. Pakai akun Google khusus pengirim (mis. satu akun Gmail koperasi), jangan akun pribadi.
2. Aktifkan **Verifikasi 2 langkah**: Akun Google, Keamanan, Verifikasi 2 langkah (`myaccount.google.com/security`).
3. Buat **Sandi aplikasi**: `myaccount.google.com/apppasswords`, beri nama "Kopkar MJS", salin sandi 16 karakter. (Menu ini baru muncul setelah verifikasi 2 langkah aktif.)
4. Isi di `anggota/.env.local` **dan** `frontend/.env.local` (dua-duanya, karena kedua aplikasi mengirim email):

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=0
SMTP_USER=alamatpengirim@gmail.com
SMTP_PASS=sandi16karakterdarigoogle
SMTP_FROM=Kopkar MJS <alamatpengirim@gmail.com>
ANGGOTA_URL=https://anggota.kopkarmjsmattel.com
ADMIN_URL=https://admin.kopkarmjsmattel.com
EMAIL_NOTIF_ADMIN=pengurus1@kopkarmjsmattel.com,pengurus2@kopkarmjsmattel.com
```

Port 465 dengan `SMTP_SECURE=1` juga bisa. Untuk uji di komputer sendiri, `ANGGOTA_URL` dan `ADMIN_URL` boleh dikosongkan (tautan di email tidak ditampilkan).

5. **Jalankan ulang server** (env hanya dibaca saat server mulai).
6. Uji pengaturan tanpa membuka aplikasi: `npm run email:uji -- alamat@penerima.com`.

## 2. Batas Gmail

- Akun Gmail biasa: sekitar 500 penerima per hari. Google Workspace: sekitar 2.000 per hari.
- Siaran ke seluruh anggota (1.000+) bisa melewati batas itu. Email yang ditolak diulang 3 kali lalu ditandai `gagal` di `email_antrean`. Untuk volume besar pakai layanan email transaksional (mis. Brevo, Mailgun, Amazon SES); pengaturannya sama, hanya mengganti `SMTP_HOST/PORT/USER/PASS`.
- Bila memakai domain sendiri (`@kopkarmjsmattel.com`), pasang SPF dan DKIM di DNS supaya email tidak masuk spam.

## 3. Menguji di komputer pengembang

- **Server uji (`npm run dev:anggota:uji`, port 3201) tidak pernah mengirim email sungguhan**, karena databasenya salinan data asli dengan email anggota. Kode verifikasi muncul di terminal tempat server berjalan, pada baris `[email dicatat, SMTP belum diatur] jenis=verifikasi ...`.
- Untuk mencoba pengiriman sungguhan di server uji, isi `EMAIL_UJI_KIRIM=1` hanya sementara. Kode verifikasi hanya dikirim ke alamat yang diketik saat mendaftar, tetapi notifikasi siaran akan ikut ke email anggota terverifikasi di salinan itu, jadi jangan kirim siaran selama opsi ini aktif.
- Server utama (`npm run dev:anggota`, port 3200) memakai database asli dan mengirim email sungguhan bila SMTP diisi.

## 4. Memantau antrean

```sql
SELECT status, count(*) FROM email_antrean GROUP BY 1;                       -- menunggu / terkirim / gagal / dicatat
SELECT ke, judul, galat FROM email_antrean WHERE status = 'gagal' ORDER BY id DESC LIMIT 20;
```
