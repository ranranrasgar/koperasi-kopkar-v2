# Deploy ke VPS dengan Docker (langkah demi langkah)

Panduan memasang aplikasi admin (`frontend/`) dan aplikasi anggota (`anggota/`) di VPS Linux memakai **Docker**, memindahkan data dari komputer kantor, lalu menjaga cadangan dan pembaruan. Ditulis 24 Oktober 2026 untuk keadaan repo saat itu; perbarui bila ada yang berubah.

**Susunan**

```
Internet ──> Nginx di host (HTTPS, certbot) ──┬─> 127.0.0.1:3100  container admin    (frontend/)
                                              ├─> 127.0.0.1:3200  container anggota  (anggota/)
                                              └─> 127.0.0.1:8080  Apache + API PHP lama (bila ada, jalur B)
                         container admin & anggota ──> container db (PostgreSQL 14, volume db-data)
                         container admin ──> /backup  =  /var/backups/kopkar di host
```

| Alamat | Isi | Layanan compose |
| --- | --- | --- |
| `https://admin.kopkarmjsmattel.com` | Aplikasi admin | `admin` (port host 127.0.0.1:3100) |
| `https://anggota.kopkarmjsmattel.com` | PWA anggota | `anggota` (127.0.0.1:3200) |
| `https://kopkarmjsmattel.com` (+ `www`) | Diarahkan ke PWA anggota | `anggota` |

Berkas Docker di akar repo:

| Berkas | Isi |
| --- | --- |
| `Dockerfile` | Satu image untuk admin dan anggota (Node 22, build kedua aplikasi, `pg_dump`/`pg_restore` 14 untuk Backup & Restore) |
| `docker-compose.yml` | Layanan `db` (postgres:14), `admin`, `anggota`; volume database dan folder cadangan |
| `.env.contoh` | Contoh `.env` untuk compose (sandi database, folder cadangan) |
| `.dockerignore` | Yang tidak dibawa ke image (node_modules, `.env*`, cadangan, `.git`) |

Nginx sengaja **di host, bukan di container**: VPS yang direncanakan (`101.50.3.222`) sudah melayani **API PHP aplikasi Android lama** (`http://101.50.3.222/KopkarMJS2000_2026/`) lewat Apache, yang masih dipakai anggota. Nginx di host paling mudah berbagi port 80/443 dengan API itu dan memakai certbot biasa.

> **Penting.** Lakukan di luar jam sibuk, dan setelah selesai pastikan aplikasi Android lama masih bisa login (langkah 11).

> **Data**: sistem yang benar-benar dipakai koperasi masih desktop + MySQL. Data yang dipasang dengan panduan ini adalah salinan database PostgreSQL di komputer kantor saat dicadangkan. Untuk pindah sungguhan (cutover), ikuti `database/postgres/README.md` (migrasi ulang dari MySQL) setelah langkah ini berhasil, lalu **wajib** `npm run sequences:pasang` supaya nomor bukti web tidak bentrok dengan nomor dari desktop.

Simbol: perintah tanpa tanda = di VPS; **[kantor]** = dikerjakan di komputer kantor.

---

## 0. Yang perlu disiapkan

- Akses SSH ke VPS dengan pengguna yang bisa `sudo`.
- Akses ke pengelola DNS domain `kopkarmjsmattel.com`.
- **[kantor]** Isi kedua berkas `.env.local` yang sekarang (`frontend/.env.local`, `anggota/.env.local`). Nilai **`VAPID_*` harus sama** di VPS; bila diganti, semua langganan notifikasi HP anggota putus dan harus diaktifkan ulang.
- **[kantor]** Akun SMTP koperasi (`smtp.emailarray.com`, lihat `docs/WORKLOG.md`) dan catatan SPF di DNS domain.
- **[kantor]** Google Cloud Console (masuk dengan Google): tambahkan alamat balik `https://anggota.kopkarmjsmattel.com/auth/google/callback` di OAuth client yang sama.
- VPS: minimal 2 GB RAM (build Next.js butuh sekitar 1,5 GB; tambah swap bila kurang) dan sekitar 8 GB disk kosong (image Docker ±1,5 GB, database ±1,5 GB, cadangan, log).

## 1. Periksa VPS lebih dulu

```bash
cat /etc/os-release          # panduan ini untuk Ubuntu 22.04 / 24.04 atau Debian 12
df -h /                      # ruang disk
free -h                      # memori
sudo ss -ltnp                # program apa yang sudah mendengarkan port 80, 443, 3100, 3200
```

Catat hasil `ss -ltnp`:
- Bila **port 80 dipakai Apache/httpd** (melayani API PHP), ikuti **jalur B** di langkah 8.
- Bila port 80 kosong, ikuti **jalur A**.
- PostgreSQL yang mungkin sudah terpasang di host **tidak dipakai** (database ada di container); biarkan saja.

```bash
sudo timedatectl set-timezone Asia/Jakarta
```

Bila RAM kurang dari 4 GB, tambah swap supaya build tidak gagal:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 2. Pasang Docker, Nginx, certbot

```bash
sudo apt update && sudo apt install -y git curl ca-certificates nginx certbot python3-certbot-nginx

# Docker Engine + plugin compose (skrip resmi Docker)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER          # keluar lalu masuk SSH lagi supaya berlaku
docker --version && docker compose version
```

## 3. Ambil kode

```bash
sudo mkdir -p /srv/kopkar && sudo chown $USER: /srv/kopkar
git clone https://github.com/ranranrasgar/koperasi-kopkar-v2.git /srv/kopkar
cd /srv/kopkar
```

Repo GitHub bersifat privat: pakai deploy key atau personal access token saat `git clone`.

## 4. Isi berkas lingkungan

### 4a. `.env` untuk docker compose

```bash
cd /srv/kopkar
cp .env.contoh .env
openssl rand -base64 32 | tr -d '/+='    # salin hasilnya ke DB_PASSWORD (huruf dan angka saja, aman di URL)
nano .env
chmod 600 .env
```

`DB_PASSWORD` dipakai container `db` saat pertama dibuat. **Jangan diganti setelah database dibuat** (sandi lama sudah tersimpan di volume); bila perlu diganti, ubah juga di dalam PostgreSQL (`ALTER ROLE kopkar PASSWORD ...`).

### 4b. `frontend/.env.local` (admin)

Buat rahasia sesi baru (berbeda untuk admin dan anggota):

```bash
openssl rand -base64 48      # jalankan dua kali: SESSION_SECRET dan ANGGOTA_SESSION_SECRET
```

```ini
SESSION_SECRET=<hasil openssl pertama>
ADMIN_URL=https://admin.kopkarmjsmattel.com
ANGGOTA_URL=https://anggota.kopkarmjsmattel.com

# Notifikasi HP: SAMA PERSIS dengan komputer kantor dan dengan anggota/.env.local
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:support@kopkarmjsmattel.com

# Email (sama dengan anggota/.env.local)
SMTP_HOST=smtp.emailarray.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@kopkarmjsmattel.com
SMTP_PASS=...
SMTP_FROM=Kopkar MJS <support@kopkarmjsmattel.com>
```

### 4c. `anggota/.env.local` (PWA anggota)

```ini
ANGGOTA_SESSION_SECRET=<hasil openssl kedua>
ANGGOTA_URL=https://anggota.kopkarmjsmattel.com
ADMIN_URL=https://admin.kopkarmjsmattel.com

VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:support@kopkarmjsmattel.com

SMTP_HOST=smtp.emailarray.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@kopkarmjsmattel.com
SMTP_PASS=...
SMTP_FROM=Kopkar MJS <support@kopkarmjsmattel.com>

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://anggota.kopkarmjsmattel.com/auth/google/callback
```

```bash
chmod 600 frontend/.env.local anggota/.env.local
sudo mkdir -p /var/backups/kopkar && sudo chown 1000:1000 /var/backups/kopkar   # pengguna node di container = uid 1000
```

Catatan:
- `PG_URL` **tidak perlu** diisi di kedua `.env.local`: `docker-compose.yml` mengaturnya ke layanan `db` (dan mengabaikan `PG_URL` yang mungkin tersalin dari kantor). `KOPKAR_BACKUP_DIR` juga diatur compose (`/backup`).
- **Jangan** isi `KOPKAR_UJI_ROLLBACK` di produksi (mengunci saklar Mode Uji / Live).
- Untuk menguji tanpa mengirim email sungguhan, kosongkan `SMTP_HOST` (email hanya dicatat di log).
- Kedua aplikasi menjalankan pekerja pengiriman email; itu aman (antrean memakai `SKIP LOCKED`).

## 5. Build image dan nyalakan database

```bash
cd /srv/kopkar
echo "KOPKAR_COMMIT=$(git rev-parse --short HEAD)" >> .env     # commit dicatat di manifest cadangan
docker compose build                     # 5-15 menit pertama kali (butuh internet: paket npm, font Google, pg client)
docker compose up -d db
docker compose ps                        # db: healthy
```

Bila build berhenti karena memori (`JavaScript heap out of memory` atau container dihentikan), tambah swap (langkah 1) lalu ulangi.

## 6. Pindahkan data (pertama kali, lewat perintah)

Pada pemasangan pertama database masih kosong, jadi **belum ada operator yang bisa login** ke menu Backup & Restore. Data pertama dipulihkan lewat perintah di container.

**[kantor]** Buat cadangan (atau pakai menu Backup & Restore lalu Unduh semua berkasnya ke satu folder):

```bash
npm run backup -- --ke G:/cadangan
```

**[kantor]** Salin seluruh folder hasilnya ke VPS (ganti nama folder dan pengguna):

```bash
scp -r "G:/cadangan/kopkar-kopkar_mjs_2000-20261024-0340" user@101.50.3.222:/var/backups/kopkar/
```

Di VPS (folder `/var/backups/kopkar` di host = `/backup` di container):

```bash
cd /srv/kopkar
sudo chown -R 1000:1000 /var/backups/kopkar
C=kopkar-kopkar_mjs_2000-20261024-0340                     # nama folder cadangan
docker compose run --rm -w /app admin npm run restore -- /backup/$C --periksa   # SHA-256 semua berkas cocok?
docker compose run --rm -w /app admin npm run restore -- /backup/$C --timpa --yakin kopkar_mjs_2000
docker compose run --rm -w /app admin npm run anggota:pasang      # tabel/kolom/FK khusus web (aman diulang)
docker compose run --rm -w /app admin npm run indeks:pasang       # indeks dari schema.sql yang belum ada (aman diulang)
docker compose run --rm -w /app admin npm run pengaturan:pasang   # tabel pengaturan_web dan izin Mode Aplikasi
docker compose run --rm -w /app admin npm run panduan:pasang      # artikel Pusat Panduan yang belum ada
```

- `--timpa --yakin kopkar_mjs_2000` diperlukan karena container `db` sudah membuat database kosong `kopkar_mjs_2000` (tanpa tabel; restore tetap aman).
- Hasil yang benar diakhiri `OK <n> tabel sama persis` dan `Selesai`.
- Ruang disk tidak dicek otomatis dari container (folder data PostgreSQL ada di container lain): pastikan `df -h /` di host masih lega (ukuran database + 1 GB).
- Operator dan password ikut dari cadangan: login admin di VPS memakai akun dan password yang sama dengan di kantor.

## 7. Nyalakan aplikasi

```bash
docker compose up -d
docker compose ps                        # db healthy, admin dan anggota running
docker compose logs --tail 50 admin anggota
curl -I http://127.0.0.1:3100/login      # 200
curl -I http://127.0.0.1:3200/masuk      # 200
```

Port 3100/3200 hanya dibuka di `127.0.0.1` (lihat `docker-compose.yml`); dari luar hanya lewat Nginx. Container menyala lagi otomatis setelah VPS restart (`restart: unless-stopped`, layanan docker aktif bawaan).

## 8. Nginx di host

### DNS

Di pengelola DNS `kopkarmjsmattel.com`:

| Nama | Tipe | Nilai |
| --- | --- | --- |
| `@` | A | IP VPS |
| `www` | CNAME | `kopkarmjsmattel.com` |
| `anggota` | A | IP VPS |
| `admin` | A | IP VPS |

Tunggu sampai `ping anggota.kopkarmjsmattel.com` menunjukkan IP VPS.

### Jalur A: port 80/443 belum dipakai

Lanjut ke konfigurasi di bawah (blok `default_server` untuk PHP boleh dihapus).

### Jalur B: Apache sedang melayani API PHP di port 80

Aplikasi Android lama memanggil `http://101.50.3.222/KopkarMJS2000_2026/...` lewat IP dan HTTP biasa, jadi alamat itu **harus tetap melayani PHP**. Pindahkan Apache ke port lokal, lalu Nginx yang meneruskan:

```bash
sudo sed -i 's/^Listen 80$/Listen 127.0.0.1:8080/' /etc/apache2/ports.conf
sudo sed -i 's/<VirtualHost \*:80>/<VirtualHost 127.0.0.1:8080>/' /etc/apache2/sites-enabled/*.conf
sudo apachectl configtest && sudo systemctl restart apache2
curl -I http://127.0.0.1:8080/KopkarMJS2000_2026/      # API PHP masih menjawab di port baru
```

Bila Apache juga memakai port 443, ubah juga atau serahkan HTTPS ke Nginx. Bila server memakai panel (cPanel, aaPanel, Plesk), ubah port lewat panelnya. Bila API PHP ternyata berjalan di container lain, arahkan `proxy_pass` di bawah ke port container itu.

### Konfigurasi

`/etc/nginx/sites-available/kopkar`:

```nginx
# IP langsung dan nama lain: API PHP lama (jalur B). Hapus blok ini pada jalur A tanpa PHP.
server {
    listen 80 default_server;
    server_name _;
    location /KopkarMJS2000_2026/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 10m;
    }
    location / { return 404; }
}

# Aplikasi anggota (+ domain utama)
server {
    listen 80;
    server_name kopkarmjsmattel.com www.kopkarmjsmattel.com anggota.kopkarmjsmattel.com;
    client_max_body_size 8m;                 # foto profil maks. 5 MB
    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin: sebaiknya hanya dari IP kantor / VPN
server {
    listen 80;
    server_name admin.kopkarmjsmattel.com;
    # allow 203.0.113.10;                    # IP publik kantor (isi lalu hapus tanda #)
    # deny all;
    client_max_body_size 12m;                # unggah cadangan dikirim per potongan 8 MB
    proxy_read_timeout 900s;                 # buat cadangan / pulihkan dari menu bisa beberapa menit
    proxy_send_timeout 900s;
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/kopkar /etc/nginx/sites-enabled/kopkar
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

`Host` dan `X-Forwarded-Host` wajib diteruskan: aplikasi mencocokkan asal permintaan (server action, unggah cadangan) dengan nama host.

## 9. HTTPS (wajib)

Cookie sesi di produksi bertanda `secure`, jadi **login hanya tersimpan lewat HTTPS**. Membuka `http://...` membuat login seolah berhasil lalu kembali ke halaman login.

```bash
sudo certbot --nginx -d kopkarmjsmattel.com -d www.kopkarmjsmattel.com -d anggota.kopkarmjsmattel.com -d admin.kopkarmjsmattel.com
sudo certbot renew --dry-run
```

Certbot menambahkan `listen 443 ssl` dan pengalihan HTTP -> HTTPS untuk ketiga nama. Blok `default_server` (API PHP lama lewat IP) tetap HTTP.

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

> Docker menulis aturan iptables sendiri dan bisa melewati ufw untuk port yang dipublikasikan. Karena itu `docker-compose.yml` hanya membuka port ke `127.0.0.1` dan database tidak dibuka sama sekali. Jangan ubah menjadi `"3100:3100"`.

## 10. Notifikasi dan Google

- Notifikasi HP (Web Push) hanya jalan lewat HTTPS, dengan `VAPID_*` yang sama dengan sebelumnya.
- Masuk dengan Google: `GOOGLE_REDIRECT_URI` harus sama persis dengan yang terdaftar di Google Console.

## 11. Uji setelah deploy

- [ ] `docker compose ps`: db healthy, admin dan anggota running; `docker compose logs --tail 100 admin anggota` tanpa galat berulang.
- [ ] `https://admin.kopkarmjsmattel.com`: login operator, buka Dashboard, Daftar Anggota, Buku Simpanan, Daftar Pinjaman.
- [ ] **Sistem & Pengaturan -> Mode Uji / Live** menunjukkan mode yang diinginkan (database dari kantor saat ini mode **Uji**; ubah ke Live hanya saat siap).
- [ ] `https://anggota.kopkarmjsmattel.com`: login anggota uji; Beranda, Simpanan, Pinjaman tampil.
- [ ] `https://kopkarmjsmattel.com` terbuka.
- [ ] **Jalur B**: aplikasi Android lama masih bisa login.
- [ ] **Backup & Restore -> Buat cadangan sekarang** berhasil; folder baru muncul di `/var/backups/kopkar` di host.
- [ ] Email: `docker compose run --rm -w /app admin npm run email:uji` (lihat `docs/WORKLOG.md`).

## 12. Cadangan otomatis

Cadangan harian pukul 02.00 dan hapus yang lebih dari 14 hari (`crontab -e` di host):

```cron
0 2 * * * cd /srv/kopkar && /usr/bin/docker compose exec -T -w /app admin npm run backup -- --ke /backup >> /var/log/kopkar-backup.log 2>&1
30 2 * * * find /var/backups/kopkar -maxdepth 1 -type d -name 'kopkar-*' -mtime +14 -exec rm -rf {} +
```

```bash
sudo touch /var/log/kopkar-backup.log && sudo chown $USER: /var/log/kopkar-backup.log
```

Cadangan otomatis tampil juga di menu Backup & Restore (folder yang sama). Simpan salinan **di luar VPS** secara berkala (Unduh dari menu, atau `scp`/`rsync` ke komputer kantor). Volume database (`kopkar_db-data`) bukan cadangan: ia ikut hilang bila VPS rusak.

## 13. Memperbarui aplikasi (setiap ada perubahan di GitHub)

```bash
cd /srv/kopkar
docker compose exec -T -w /app admin npm run backup -- --ke /backup     # cadangan sebelum memperbarui
git pull
sed -i "s/^KOPKAR_COMMIT=.*/KOPKAR_COMMIT=$(git rev-parse --short HEAD)/" .env
docker compose build
docker compose run --rm -w /app admin npm run anggota:pasang
docker compose run --rm -w /app admin npm run indeks:pasang
docker compose run --rm -w /app admin npm run pengaturan:pasang
docker compose run --rm -w /app admin npm run panduan:pasang
docker compose up -d                       # mengganti container admin dan anggota dengan image baru (putus beberapa detik)
docker image prune -f                      # buang image lama supaya disk tidak penuh
```

Database (container `db` dan volumenya) tidak tersentuh oleh pembaruan aplikasi.

**Kembali ke versi sebelumnya**: `git log --oneline` -> `git checkout <commit-lama>` -> `docker compose build` -> `docker compose up -d`. Bila data ikut rusak, pulihkan cadangan sebelum pembaruan (langkah 14).

## 14. Memindahkan data berikutnya (kantor <-> VPS)

Setelah VPS berjalan, pemindahan data tidak perlu lewat perintah lagi:

1. Di server **asal**: **Backup & Restore -> Buat cadangan sekarang**, lalu **Unduh** semua berkasnya (data.dump, media.dump, ...-manifest.json) ke satu folder.
2. Di server **tujuan**: **Backup & Restore -> Unggah cadangan dari komputer**, pilih semua berkas tadi, **Unggah**, tunggu pemeriksaan SHA-256, lalu **Pulihkan** (ketik nama database).

Pulihkan menimpa seluruh data di server tujuan, termasuk akun operator. Minta semua pengguna keluar dulu, dan buat cadangan server tujuan sebelum memulihkan. Komputer kantor (PostgreSQL 14.5) dan container `db` (postgres:14) memakai versi yang sama, jadi cadangan bisa dipindah ke dua arah.

## 15. Perintah sehari-hari

| Keperluan | Perintah (di `/srv/kopkar`) |
| --- | --- |
| Status | `docker compose ps` |
| Log | `docker compose logs -f --tail 100 admin` (atau `anggota`, `db`) |
| Mulai ulang aplikasi | `docker compose restart admin anggota` |
| Hentikan semua | `docker compose down` (data tetap di volume) |
| Masuk psql | `docker compose exec db psql -U kopkar kopkar_mjs_2000` |
| Perintah npm repo | `docker compose run --rm -w /app admin npm run <skrip>` |

**Jangan** menjalankan `docker compose down -v`: opsi `-v` menghapus volume database.

## 16. Masalah yang sering terjadi

| Gejala | Penyebab dan jalan keluar |
| --- | --- |
| Login berhasil tetapi kembali ke halaman login | Dibuka lewat HTTP. Pakai `https://`; cookie sesi produksi bertanda `secure`. |
| `502 Bad Gateway` | Container mati atau belum siap: `docker compose ps`, `docker compose logs admin`. |
| Server action gagal "Invalid Server Actions request" | Nginx tidak meneruskan `Host` / `X-Forwarded-Host` (langkah 8). |
| Unggah cadangan berhenti dengan galat 413 | `client_max_body_size` admin kurang dari 12m. |
| Pulihkan dari menu terputus / timeout | `proxy_read_timeout` admin kurang (900s). Pemulihan tetap berjalan di container; tunggu, muat ulang halaman, cek `docker compose logs admin`. |
| `EACCES` saat membuat cadangan | Folder cadangan di host belum milik uid 1000: `sudo chown -R 1000:1000 /var/backups/kopkar`. |
| `password authentication failed` | `DB_PASSWORD` di `.env` diubah setelah volume database dibuat; kembalikan atau ubah sandi di PostgreSQL. |
| `PostgreSQL tujuan versi X lebih lama dari sumber` | Server sumber memakai PostgreSQL lebih baru dari 14; samakan versinya. |
| Build gagal kehabisan memori | Tambah swap (langkah 1), lalu `docker compose build` lagi. |
| Disk penuh | `docker system df`, `docker image prune -f`, hapus cadangan lama di `/var/backups/kopkar`. |
| Notifikasi HP tidak muncul | Bukan HTTPS, atau `VAPID_*` berbeda dari sebelumnya (anggota perlu mengaktifkan ulang). |
| Email tidak terkirim | `SMTP_*` salah atau SPF belum diatur; cek dengan `npm run email:uji` (langkah 11). |
