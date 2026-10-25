---
judul: Teknologi dan susunan aplikasi
ringkasan: Bahasa, kerangka kerja, database, dan bagian-bagian aplikasi (admin, anggota, API Android, landing page) serta bagaimana semuanya terhubung.
---
Artikel ini hanya tampil untuk **superadmin dan grup admin**. Isinya untuk memahami apa yang menjalankan aplikasi ini, supaya keputusan pemeliharaan, pindah server, atau menambah pengembang lebih mudah.

## Teknologi yang dipakai

| Bagian | Teknologi |
| --- | --- |
| Bahasa | **TypeScript** (dijalankan Node.js 22) |
| Aplikasi web | **Next.js 16** (App Router, server actions) dengan **React 19** |
| Tampilan | **Tailwind CSS 4**, komponen **Radix UI** (dialog), ikon **Lucide** dan Material Symbols, notifikasi layar **Sonner** |
| Database | **PostgreSQL 14** (driver `pg`), data utama hasil migrasi dari MySQL aplikasi desktop |
| Logika bisnis | Paket **backend** bersama (TypeScript): posting jurnal, simpanan, pinjaman, potongan gaji, SHU, laporan |
| Cetak PDF | **pdfkit** (jadwal angsuran) dan cetak browser untuk laporan |
| Email | **nodemailer** lewat SMTP, dengan antrean di database |
| Notifikasi HP | **Web Push** (standar VAPID) untuk aplikasi anggota yang dipasang di layar utama |
| Penyebaran | **Docker Compose** di VPS Linux, **Nginx** + HTTPS (certbot) di server host |

## Bagian-bagian aplikasi

Seluruhnya satu repositori (monorepo npm workspaces):

| Folder | Isi | Alamat |
| --- | --- | --- |
| `frontend/` | **Aplikasi admin** (yang sedang Anda pakai): anggota, simpanan, pinjaman, akuntansi, SHU, pengaturan | `admin.kopkarmjsmattel.com` (port 3100) |
| `anggota/` | **PWA anggota**: dipasang seperti aplikasi di HP, anggota melihat simpanan, pinjaman, potongan, SHU, dan mengajukan kredit | `anggota.kopkarmjsmattel.com` (port 3200) |
| `mobile-api/` | API untuk **aplikasi Android anggota** (pengganti API PHP lama) | `api.kopkarmjsmattel.com` (port 8099) |
| `backend/` | Logika bisnis dan akses database yang dipakai bersama oleh admin, anggota, dan API | tidak berdiri sendiri |
| `database/` | Skema, skrip pemasangan, migrasi, cadangan, dan isi awal panduan | tidak berdiri sendiri |
| `landing/` | Halaman depan statis koperasi | `kopkarmjsmattel.com` |
| `android/` | Sumber aplikasi Android | tidak dijalankan di server |

Admin dan anggota memakai **database yang sama**, tetapi hak aksesnya terpisah: operator masuk ke admin, anggota masuk ke PWA dengan akun aplikasinya sendiri. Aplikasi **desktop lama** tetap bisa dipakai paralel selama masa peralihan karena nama tabel dan nomor bukti dijaga sama.

## Susunan di server

```
Internet -> Nginx (HTTPS) -> admin   (container, 127.0.0.1:3100)
                          -> anggota (container, 127.0.0.1:3200)
                          -> mobile  (container, 127.0.0.1:8099)
admin, anggota, mobile -> db (PostgreSQL 14, data di volume db-data)
admin -> folder cadangan /var/backups/kopkar
```

Satu image Docker dipakai untuk admin dan anggota. Sandi dan kunci rahasia dibaca dari berkas `.env.local` di server, **bukan** dari image atau repositori.

## Nama dan kebiasaan penamaan

- Tabel dan kolom memakai **snake_case** bahasa Indonesia (mis. `pinjaman_tunai`, `kode_agt`); kode memakai camelCase.
- Semua teks layar berbahasa Indonesia, waktu memakai zona **Asia/Jakarta**.
- Tabel khusus web (tidak ada di desktop) antara lain `app_user` (akun anggota), `email_antrean`, `panduan`, `pengaturan_web`, `opr_tampilan`, `shu_tahun`, dan `shu_anggota`.
