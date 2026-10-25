---
judul: Layanan pendukung dan perintah pemeliharaan
ringkasan: Email, notifikasi push, PDF, tema tampilan, variabel pengaturan server, serta perintah rutin dan cara memperbarui aplikasi di VPS.
---
Hanya untuk **superadmin dan grup admin**.

## Layanan pendukung

| Layanan | Cara kerja | Yang perlu dijaga |
| --- | --- | --- |
| **Email** | Email dimasukkan ke antrean (`email_antrean`), pekerja mengirimnya bertahap lewat SMTP; gagal dicoba ulang. Email resmi memakai kop koperasi dari Pengaturan Perusahaan. | Isi `SMTP_*` di `.env.local`; catatan **SPF** domain di DNS; kuota kirim per jam |
| **Notifikasi push** | Web Push standar VAPID ke HP anggota yang memasang PWA | Nilai **`VAPID_*` harus tetap sama**; bila diganti, semua anggota harus mengaktifkan notifikasi ulang |
| **PDF** | Jadwal angsuran dibuat dengan pdfkit dan dilampirkan ke email pencairan | Paket pdfkit termasuk dalam image; ikut ter-update lewat build |
| **Tema tampilan** | Tiap operator menyimpan tema warna sendiri (`opr_tampilan`) | Tidak ada; tombol Reset menghapusnya |
| **Panduan** | Tersimpan di tabel `panduan`; isi awal dari berkas di `database/panduan` | Artikel yang sudah disunting admin tidak ditimpa saat pembaruan |

## Variabel pengaturan server

Disimpan di `frontend/.env.local` dan `anggota/.env.local` (tidak ikut repositori). Yang utama:

| Variabel | Fungsi |
| --- | --- |
| `PG_URL` | Alamat database (di Docker diatur otomatis ke layanan `db`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Pengiriman email |
| `VAPID_*` | Kunci notifikasi push |
| `ANGGOTA_URL`, `ADMIN_URL` | Alamat aplikasi untuk tautan di email dan notifikasi |
| `EMAIL_NOTIF_ADMIN` | Alamat pengurus yang diberi tahu ada pendaftar baru |
| `EMAIL_UJI_KE` | Penerima yang boleh dikirimi email dari server uji |

Setelah mengubah berkas ini, **jalankan ulang** aplikasinya supaya terbaca.

## Perintah rutin

Dijalankan dari folder utama repositori:

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` / `npm run dev:anggota` | Menjalankan admin (3100) dan anggota (3200) untuk pengembangan |
| `npm run dev:uji` / `npm run dev:anggota:uji` | Server uji dengan database salinan (3101 dan 3201) |
| `npm run uji:reset` | Membuat ulang database uji dari data asli |
| `npm run backup` / `npm run restore` | Cadangan dan pemulihan database |
| `npm run panduan:pasang` | Memasang atau memperbarui isi Pusat Panduan |
| `npm run pengaturan:pasang`, `anggota:pasang`, `shu:pasang` | Memasang tabel dan data baru (aman dijalankan ulang) |
| `npm run indeks:pasang` | Memasang indeks database yang belum ada, termasuk indeks kecepatan halaman (`indeks-cepat.sql`: indeks penutup dan trigram untuk pencarian). Berjalan otomatis di `update-vps.sh`; `-- --periksa` hanya melaporkan |
| `npm test` | Menjalankan uji otomatis backend dan API |
| `npm run email:uji -- alamat@contoh.com` | Mencoba koneksi dan kirim email percobaan |

## Kecepatan halaman

Halaman membaca data besar (jurnal sekitar 1,1 juta baris, simpanan sekitar 300 ribu baris), jadi kecepatan bergantung pada indeks. Ringkasnya: Buku Besar, Bank Book, dan saldo akun memakai indeks kode akun dan tanggal; Neraca, Rugi Laba, dan Neraca Saldo memakai indeks penutup sehingga cukup membaca indeks; pencarian teks (nomor bukti, keterangan) di Jurnal Umum dan Buku Simpanan memakai indeks trigram (ekstensi `pg_trgm`, termasuk dalam paket contrib PostgreSQL). Setelah memulihkan database dari cadangan atau memigrasi ulang, jalankan `npm run indeks:pasang` supaya indeks itu terpasang kembali. Indeks menambah sedikit waktu simpan jurnal, tetapi jauh menghemat waktu baca.

## Memperbarui aplikasi di VPS

```bash
cd /srv/kopkar
git pull
./update-vps.sh
```

Skrip itu menarik kode, membangun ulang image, **mencadangkan database lebih dulu**, memasang tabel dan data baru, lalu menjalankan ulang aplikasi. Database dan volumenya tidak disentuh. Lakukan di luar jam sibuk dan pastikan ada cadangan yang tersimpan di luar server.

> **VPS 2 GB wajib punya swap.** Build memakai RAM besar; tanpa swap prosesnya dimatikan sistem (pesan `Killed` pada langkah 3) dan aplikasi yang sudah dihentikan tetap mati. Tambahkan swap 4 GB sekali saja: `sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`, lalu `echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab`. Skrip pembaruan memperingatkan bila swap belum ada, dan bila langkah mana pun gagal ia **menyalakan kembali versi lama** otomatis. Bila aplikasi terlanjur mati: `cd /srv/kopkar && docker compose up -d`.

Detail pemasangan awal, Nginx, HTTPS, dan pemulihan ada di berkas `docs/DEPLOY-VPS.md` pada repositori.
