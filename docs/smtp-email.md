# Mengaktifkan pengiriman email (SMTP)

Aplikasi anggota dan admin mengirim email lewat antrean (`email_antrean`) memakai SMTP dari env. Tanpa SMTP, email **hanya dicatat di log server** (termasuk kode verifikasi), jadi tidak ada yang terkirim.

## 0. Email domain di Jagoan Hosting "Mail Business" (dipakai koperasi)

Domain `kopkarmjsmattel.com` memakai produk **Mail Business** Jagoan Hosting (kotak `support@kopkarmjsmattel.com`). Kotaknya berada di platform **emailarray** (webmail Group-Office, server qmail `smtp8.emailarray.com`), **bukan** di server cPanel `solodns.jagoanhosting.com` yang kebetulan menjawab untuk domain; login ke server cPanel itu selalu `535 Incorrect authentication data`. Host yang benar:

```
SMTP_HOST=smtp.emailarray.com
SMTP_PORT=587
SMTP_SECURE=0
SMTP_USER=support@kopkarmjsmattel.com
SMTP_PASS=<sandi kotak email, yang sama dengan login webmail>
SMTP_FROM=Kopkar MJS <support@kopkarmjsmattel.com>
EMAIL_MAKS_PER_JAM=100
```

Sertifikat `*.emailarray.com` valid; login `LOGIN/PLAIN` setelah STARTTLS (587) atau port 465 dengan `SMTP_SECURE=1`. Sandi dimasukkan dengan `npm run email:sandi` (menulis ke `anggota/.env.local` dan `frontend/.env.local` sekaligus lalu menguji login). Uji kirim: `npm run email:uji -- alamat@penerima.com`.

### Wajib: SPF (dan sebaiknya DKIM) di DNS domain

Tanpa itu, Gmail **menolak** email dari `@kopkarmjsmattel.com` (`550 5.7.26 ... sender is unauthenticated ... SPF [kopkarmjsmattel.com] with ip: [65.39.216.67] = did not pass`), walau SMTP menerimanya. Domain belum punya record SPF sama sekali. DNS domain dikelola di Jagoan Hosting (ns1/ns2.jagoanhosting.com): menu Domain, kopkarmjsmattel.com, kelola DNS, tambah record:

| Tipe | Host | Isi |
| --- | --- | --- |
| TXT | `@` | `v=spf1 ip4:65.39.216.1/25 ip4:69.28.212.192/27 ip4:69.90.179.1/28 ip4:69.172.250.0/24 ip4:66.179.84.0/24 ~all` |

(Rentang IP itu dipakai SPF `jagoanhosting.com` sendiri untuk server emailarray; cocokkan dengan petunjuk di halaman "Informasi" produk Mail Business bila ada versi yang lebih baru. SPF lulus saja sudah cukup bagi Gmail; DKIM tambahan, bila panel Mail Business menyediakan kunci DKIM, meningkatkan keterkiraman.) Perubahan DNS bisa butuh beberapa menit sampai sejam. Uji ulang dengan `npm run email:uji` ke alamat Gmail; folder spam juga diperiksa.

Catatan: MX domain saat ini menunjuk ke `kopkarmjsmattel.com` (server web), bukan emailarray. Itu hanya memengaruhi **menerima** email ke `support@...` (mis. balasan); mengirim tidak terpengaruh. Untuk menerima, pasang MX sesuai petunjuk produk Mail Business.

- Batas kirim: atur `EMAIL_MAKS_PER_JAM` (dan `EMAIL_MAKS_PER_HARI`) di bawah batas paket (tanyakan ke Jagoan Hosting). Email biasa (siaran, notifikasi) ditahan sampai kuota ada; kode verifikasi dan reset password tidak dibatasi dan didahulukan.

## 1. Gmail (alternatif)

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
- **Cara teraman mencoba email di server uji: `EMAIL_UJI_KE=alamat1@x.com,@domainsaya.com` di `frontend/.env.local` dan `anggota/.env.local`** (lalu jalankan ulang server). Hanya penerima itu yang dikirimi sungguhan; email ke anggota lain tetap dicatat (status `dicatat`, galat "Server uji: penerima di luar EMAIL_UJI_KE").
- Untuk mencoba pengiriman sungguhan di server uji, isi `EMAIL_UJI_KIRIM=1` hanya sementara. Kode verifikasi hanya dikirim ke alamat yang diketik saat mendaftar, tetapi notifikasi siaran akan ikut ke email anggota terverifikasi di salinan itu, jadi jangan kirim siaran selama opsi ini aktif.
- Server utama (`npm run dev:anggota`, port 3200) memakai database asli dan mengirim email sungguhan bila SMTP diisi.

## 4. Memantau antrean

```sql
SELECT status, count(*) FROM email_antrean GROUP BY 1;                       -- menunggu / terkirim / gagal / dicatat
SELECT ke, judul, galat FROM email_antrean WHERE status = 'gagal' ORDER BY id DESC LIMIT 20;
```
