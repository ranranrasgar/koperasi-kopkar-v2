# PRD: PWA Anggota Koperasi Kopkar MJS 2000

| | |
| --- | --- |
| Status | Draf 1, menunggu keputusan pengguna pada bagian 11 |
| Tanggal | 23 Oktober 2026 |
| Dasar | `docs/analisis-aplikasi-mobile-lama.md` (wajib dibaca dulu) |
| Pengganti | Aplikasi Android KopkarMJS2000 v5.6 + API PHP `KopkarMJS2000_2026` |

## 1. Latar belakang

Anggota memakai aplikasi Android v5.6 untuk melihat simpanan, pinjaman, potongan gaji, SHU, dan mengajukan kredit. Aplikasi itu bergantung pada API PHP di atas MySQL yang:
- memvalidasi pengajuan kredit hanya di HP dan menerima persen bunga/biaya dari HP;
- masih melayani request tanpa token (masa transisi), sehingga data anggota bisa dibaca orang lain;
- berjalan lewat HTTP tanpa TLS.

Sistem admin sedang dipindah ke v2 (PostgreSQL, monorepo ini). PWA anggota menggantikan aplikasi Android dengan **fungsi yang sama persis**, di atas data dan aturan v2, dan tanpa kelemahan di atas.

## 2. Tujuan dan ukuran keberhasilan

1. **Paritas fungsi** dengan Android v5.6: setiap layar dan aturan di bagian 6 dan 7 tersedia, dengan pesan galat yang sama maknanya.
2. **Angka sama**: untuk anggota contoh, total simpanan, sisa pinjaman, potongan, SHU, dan riwayat sama dengan API PHP pada data yang sama (uji paritas, bagian 10).
3. **Aman**: setiap data hanya bisa dibuka pemiliknya; semua aturan pengajuan dicek di server; HTTPS.
4. **Bisa dipasang** di Android dan iOS sebagai aplikasi layar utama, tanpa Play Store.
5. Anggota lama bisa langsung login dengan **username dan password lama** (MD5 maupun bcrypt).

## 3. Ruang lingkup

**Masuk:** daftar akun, login, wajib isi email, lupa password (email dan pertanyaan keamanan), beranda, profil + foto + ganti password + ganti email, simpanan + mutasi, pinjaman + riwayat angsuran + jadwal, pengajuan kredit, potongan bulanan + status terdebet, SHU per tahun buku, riwayat transaksi, notifikasi (riwayat + Web Push), himbauan/RAT, promo, logout.

**Tidak masuk:** PPOB, Toko, Produk, Pesanan, scanner QR (di aplikasi lama masih "segera hadir"); transaksi uang oleh anggota; pendaftaran menjadi anggota koperasi (lihat keputusan K5); fitur admin.

## 4. Pengguna

| Pengguna | Kebutuhan |
| --- | --- |
| Anggota aktif (±1.076 akun aktif) | Melihat data sendiri, mengajukan kredit |
| Karyawan Mattel yang belum anggota | Bisa daftar akun (aturan lama); apa yang bisa dilihat: keputusan K5 |
| Admin/pengurus (di aplikasi admin v2) | Menerima pengajuan di `/dashboard/loans/apply`; mengirim himbauan/notifikasi (keputusan K8) |

## 5. Arsitektur

**Keputusan: aplikasi terpisah di monorepo yang sama**, workspace baru `anggota/` (Next.js 16, App Router, Tailwind 4, sama dengan `frontend/`).

- **Satu sumber aturan dan data**: PostgreSQL yang sama; aturan bisnis anggota ditulis di `backend/src/anggota/` (baru) dan dipakai PWA. Query baca dipindah dari `mobile-api/src/queries.ts` ke `backend/src/anggota/queries.ts` supaya `mobile-api` (Android lama, selama transisi) dan PWA memakai kode yang sama.
- **Terpisah dari admin**: subdomain dan port sendiri (lihat 5.1), sesi sendiri (`app_user`, bukan `opr`), sehingga admin bisa tetap tidak terbuka ke internet.
- **Satu repo, satu `npm install`**: npm workspaces berbagi satu `node_modules` di akar; versi Next/React disamakan dengan `frontend/` (Next 16.2.10, React 19.2.4). Build dan proses berjalan dua (admin dan anggota), di satu VPS.
- **Server-side**: halaman server component + server actions (pola `frontend/`). Tidak ada API JSON publik baru kecuali yang dibutuhkan service worker.
- **PWA**: `manifest.webmanifest`, ikon dari logo koperasi (`/logo` aplikasi admin atau salinannya), service worker untuk cangkang aplikasi dan halaman luring "Tidak ada koneksi". Data keuangan **tidak** di-cache luring (selalu terbaru; menghindari data basi di HP bersama).
- **Mode uji**: menulis lewat `tx()` sehingga `KOPKAR_UJI_ROLLBACK` / saklar Mode Uji berlaku juga untuk pengajuan dari PWA.

### 5.1 Alamat dan penempatan (diputuskan 23 Oktober 2026, K11)

| Alamat | Isi | Proses | Akses |
| --- | --- | --- | --- |
| `kopkarmjsmattel.com` (+ `www.`) | Landing page: profil koperasi, tombol "Masuk Anggota" dan "Pasang Aplikasi" | dilayani aplikasi `anggota/` (rute landing) | umum |
| `anggota.kopkarmjsmattel.com` | PWA anggota | `anggota/`, port 3200 | umum |
| `admin.kopkarmjsmattel.com` | Aplikasi admin | `frontend/`, port 3100 | dibatasi (IP kantor/VPN) |

Alasan subdomain, bukan path `/anggota`: cookie sesi admin dan anggota terpisah otomatis (origin berbeda); admin bisa dibatasi utuh di Nginx; service worker dan `scope` PWA memiliki seluruh origin (path di bawah `/anggota` sering bermasalah di iOS); tanpa `basePath`; PWA bisa dipindah ke server lain cukup dengan DNS.

Penempatan: satu VPS. Nginx sebagai reverse proxy + HTTPS (Let's Encrypt, satu sertifikat untuk ketiga nama), dua proses Node dikelola PM2, satu PostgreSQL. Rincian di bagian 12.

Alasan tidak digabung ke `frontend/`: aplikasi anggota harus terbuka ke internet untuk ribuan pengguna, admin sebaiknya tidak; autentikasi, tampilan (mobile-first), dan siklus rilisnya berbeda. Alasan tidak repo terpisah: aturan dan perhitungan akan tersalin dan berbeda seiring waktu.

## 6. Kebutuhan fungsional

Nomor F dipakai untuk pelacakan. "Paritas" berarti mengikuti perilaku yang dirinci di dokumen analisis.

### F1. Daftar akun
- Isian: username, password, ulangi password, NIK, pertanyaan keamanan (dari `pertanyaan`), jawaban.
- Aturan server (paritas `user.php`): username/NIK sudah punya akun → tolak; NIK harus 6 karakter; NIK di `anggota` → akun untuk anggota itu; bukan anggota tetapi ada di `karyawan_mattel` → perilaku sesuai keputusan K5; selain itu tolak.
- Password disimpan bcrypt (format `$2y$`, bisa dibaca PHP). Jawaban disimpan scrypt dari jawaban yang di-trim dan huruf kecil (format migrasi v2).
- Tambahan dibanding lama: aturan panjang password (keputusan K6) dan pembatasan percobaan.

### F2. Login
- Username + password. Aturan: akun `status` aktif; anggota aktif; MD5 → cocokkan lalu ganti ke bcrypt; bcrypt → verifikasi.
- Pesan: tidak terdaftar / tidak aktif / password salah / data anggota tidak ditemukan (makna sama dengan lama; boleh disamarkan menjadi satu pesan, keputusan K7).
- Sesi: cookie httpOnly bertanda tangan (pola `frontend/src/lib/sesi.ts`, rahasia dan nama cookie sendiri), berlaku 30 hari (paritas token lama), diperiksa ulang ke database di setiap request (akun/anggota masih aktif, password belum diganti).
- Kunci sementara setelah 5 kali gagal (seperti login operator v2).
- Setelah login, bila email kosong atau kurang dari 5 karakter → wajib F3.

### F3. Wajib isi email
- Satu isian email. Email tidak boleh dipakai akun lain (*"Email ini sudah dipakai, gunakan email lain."*). Kirim email notifikasi (bila pengiriman email sudah disiapkan, keputusan K9).

### F4. Lupa password
- **Lewat email**: username + email cocok → kirim tautan reset bertanda tangan (berlaku 30 menit) → halaman atur password baru (min. sesuai K6, konfirmasi).
- **Lewat pertanyaan keamanan**: username → tampil pertanyaan → jawaban dicocokkan **di server** (tanpa beda huruf besar/kecil, di-trim) → password baru. Jawaban tidak pernah dikirim ke browser.
- Respons tidak boleh membocorkan apakah username ada (tambahan keamanan; pesan seragam).

### F5. Beranda
- Kartu: total simpanan (tanpa simpanan pokok; tombol sembunyikan nominal), sisa pinjaman, plafon kredit (`rp_grade`), potongan bulan ini, SHU (tahun buku terakhir).
- Kartu himbauan/RAT (`himbauan` aktif) dengan detail; slider promo (`promo` aktif).
- Menu: Profil, Ajuan Kredit, Simpanan, Pinjaman, SHU, Potongan, Riwayat, Notifikasi.
- Rumus paritas `dashboard.php` (analisis bagian 5).

### F6. Profil
- Biodata (data login lama: NIK, nama, jenis kelamin, alamat, kota, kode pos, telepon, HP, status perkawinan), keluarga/pekerjaan dari `anggota_detail` bila ada (nama suami/istri, tanggungan, anak, pekerjaan, perusahaan, jabatan, lama bekerja), rekening, grade dan plafon, simpanan bulanan (pokok/wajib/sukarela).
- Foto: unggah JPG/PNG/WEBP maks. 5 MB, jenis dicek dari isi file; disimpan di penyimpanan yang ditentukan (keputusan K10).
- Ganti password (password lama + baru ×2), ganti email (aturan F3).
- Logout.

### F7. Simpanan
- Saldo per jenis + total. Mutasi satu jenis, 12 per muatan, "muat lagi" (paritas `getsimpananrincipaginated`).
- Tambahan yang disarankan: saldo berjalan per baris (rumus Buku Simpanan admin v2).

### F8. Pinjaman
- Daftar pinjaman aktif dengan sisa, angsuran per bulan, cicilan ke-n dari n (paritas `getpinjaman`; lihat keputusan K3 untuk rumus sisa dan KPR).
- Rincian: riwayat angsuran bertahap; jadwal angsuran.

### F9. Pengajuan kredit
- Jenis kredit: `kunci_hanya_untuk_staff` sama dengan status staff anggota, `hide` = false, urut nama. Persen jasa tampil otomatis.
- Isian: tanggal realisasi (bawaan hari ini), jenis, lama (bawaan 12), besar pinjaman, keterangan.
- Estimasi angsuran: `besar / lama + besar × jasa% / 100` (paritas). Tambahan: tampilkan juga adm/provisi angsuran pertama memakai `backend/src/posting/pinjaman-calc.ts` (keputusan K4).
- **Validasi di server** (urutan dan pesan paritas analisis bagian 4): staff, grade, sisa pinjaman jenis sama (bila `kunci_jika_sisa`), lama 1..`mak_cicilan`, besar > 0. Persen bunga/adm/provisi/denda **diambil dari `jenis_kredit`**, tidak dari isian.
- Konfirmasi sebelum kirim. Simpan ke `pengajuan_pinjaman` (status P, `anggota_id`, `jenis_kredit_id`) lewat `tx()`.
- Tambahan: daftar pengajuan anggota sendiri dengan status Menunggu/Disetujui/Ditolak (data sudah ada; aplikasi lama hanya lewat riwayat).

### F10. Potongan bulanan
- Rekening, pokok, wajib, sukarela, koperasi, bank, KPR, admin bank, total; status "terdebet". Sumber data: keputusan K2.

### F11. SHU
- Daftar tahun buku; total SHU dan 4 komponen (sukarela, jasa uang, jasa barang, lama keanggotaan) + No. Reff. Rumus port v2 (bug filter tahun PHP sudah diperbaiki).
- Teks informasi lama dipertahankan: SHU dibagikan setelah RAT dan dikreditkan ke simpanan sukarela.

### F12. Riwayat transaksi
- Gabungan simpanan, angsuran pinjaman, angsuran KPR, pengajuan, SHU; terbaru dulu; bertahap (paritas `gethistory`).

### F13. Notifikasi
- Riwayat dari `log_notifikasi` (bertahap).
- Web Push: izin diminta setelah login; simpan langganan per perangkat (tabel baru, keputusan K8). iOS: hanya bila PWA dipasang ke layar utama (iOS 16.4+).

### F14. Pemasangan
- Manifest, ikon, warna tema; ajakan "Pasang aplikasi" di Android/desktop; petunjuk "Bagikan → Tambah ke Layar Utama" di iOS.

## 7. Aturan bisnis ringkas (server)

| Aturan | Nilai | Sumber |
| --- | --- | --- |
| Akun aktif | `app_user.status` = true | `user.php` |
| Anggota aktif | `anggota.aktif` = true | `user.php` |
| NIK daftar | tepat 6 karakter | `user.php isValidNik` |
| Satu akun per anggota/username | ya | `isNikUsernameExist` |
| Hash password | bcrypt `$2y$`; MD5 lama di-rehash saat login | `isLoginExist` |
| Token/sesi | 30 hari; reset 30 menit | `Auth.php` |
| Jenis kredit tampil | staff = `kunci_hanya_untuk_staff`, `hide` false | `getJenisKreditV1` |
| Kunci grade | besar ≤ `rp_grade` | Android |
| Kunci sisa | tidak ada pinjaman tunai jenis sama dengan saldo > 0 | Android + `getSaldoJenisPinjaman` |
| Tenor | 1..`mak_cicilan` | Android |
| Persen bunga/adm/provisi/denda | dari `jenis_kredit` | **baru** (lama dari HP) |
| Foto | JPG/PNG/WEBP, ≤ 5 MB, cek isi | `Api.php updateprofile` |
| Email unik | ya | `updateEmail` |

## 8. Kebutuhan non-fungsional

- **Keamanan**: HTTPS wajib; sesi httpOnly + SameSite; setiap query memakai `anggota_id` dari sesi, tidak pernah dari parameter; pembatasan percobaan login/daftar/lupa password; tidak ada jawaban keamanan atau hash di respons; header keamanan standar.
- **Kinerja**: layar utama < 1 detik di jaringan 4G untuk data satu anggota (query sudah per anggota dan berindeks); muat bertahap untuk daftar panjang.
- **Tampilan**: mobile-first (360-430 px), mode terang/gelap, Bahasa Indonesia, angka format Rupiah Indonesia, aksesibel (kontras, ukuran sentuh ≥ 44 px, label).
- **Keandalan**: tidak ada data keuangan di cache luring; galat jaringan ditampilkan jelas dengan tombol coba lagi.
- **Kompatibilitas**: Chrome Android 100+, Safari iOS 16.4+.

## 9. Ketergantungan dan transisi

1. **Cutover v2 (penentu utama).** Sistem live masih MySQL + desktop + PHP. PWA hanya boleh dipakai anggota setelah v2 menjadi sistem utama (admin mencatat transaksi di v2), atau bila diputuskan lain di K1.
2. Selama transisi, Android lama tetap memakai API PHP. Setelah cutover, Android lama bisa diarahkan ke `mobile-api` v2 (perlu endpoint tulis + autentikasi) atau dihentikan (K1).
3. Gambar himbauan/promo/foto profil di folder `images/` server PHP perlu dipindahkan.
4. Pengiriman email (Gmail SMTP di PHP) perlu kredensial untuk v2 (K9).
5. Disk dan sumber daya server produksi untuk aplikasi kedua.

## 10. Rencana kerja dan pengujian

| Tahap | Isi | Selesai bila |
| --- | --- | --- |
| 0 | Keputusan bagian 11 | Semua K terjawab |
| 1 | Workspace `anggota/`, pindah query ke `backend/src/anggota/`, sesi anggota, login (MD5/bcrypt), logout | Login anggota contoh berhasil; `mobile-api` tetap lolos uji kontrak |
| 2 | Beranda, profil, simpanan, pinjaman, jadwal, potongan, SHU, riwayat, notifikasi (baca) | Uji paritas: angka sama dengan `mobile-api`/PHP untuk ≥ 20 anggota contoh |
| 3 | Pengajuan kredit dengan validasi server | Uji per aturan (staff, grade, sisa, tenor, besar, persen dari DB); pengajuan muncul di admin `/dashboard/loans/apply` |
| 4 | Daftar akun, wajib email, lupa password (email + pertanyaan), ganti password/email, foto | Uji alur lengkap di database uji |
| 5 | PWA: manifest, service worker, Web Push, pasang di Android/iOS | Lighthouse PWA lolos; notifikasi uji terkirim |
| 6 | Keamanan dan beban | Uji akses silang antar anggota ditolak; pembatasan percobaan aktif |

Semua pengujian tulis dilakukan di **database uji** (`npm run uji:reset`, `npm run dev:uji`) atau mode uji. Panduan anggota ditambahkan ke Pusat Panduan (kategori baru "Aplikasi Anggota").

## 11. Keputusan yang dibutuhkan dari pengguna

| No | Pertanyaan | Usulan |
| --- | --- | --- |
| K1 | Kapan PWA dipakai anggota, dan apa yang terjadi pada Android lama? | Rilis bersamaan dengan cutover v2; Android lama dihentikan setelah masa transisi (mis. 1-2 bulan) |
| K2 | Potongan bulanan: dari snapshot generate desktop (`temp_potongan_all`, paritas) atau proyeksi langsung (seperti halaman admin)? | Proyeksi langsung setelah cutover (snapshot tidak diperbarui lagi bila desktop berhenti) |
| K3 | Sisa pinjaman: rumus aplikasi lama (pokok − pokok/lama × cicilan) atau saldo akuntansi dari rincian? KPR ikut ditampilkan? | Saldo dari rincian (sama dengan laporan admin) dan tampilkan KPR terpisah |
| K4 | Estimasi angsuran: rumus lama (tanpa adm/provisi) atau jadwal persis mesin posting? | Jadwal mesin posting (sama dengan pratinjau pencairan admin) |
| K5 | Karyawan Mattel yang belum anggota: boleh daftar akun? Bisa apa setelah login? | Boleh daftar; hanya melihat profil dan informasi cara menjadi anggota sampai admin mendaftarkannya |
| K6 | Aturan panjang password (lama: tidak ada saat daftar, 6 saat reset) | Minimal 8 karakter, huruf dan angka (sama dengan operator v2) |
| K7 | Pesan login dibedakan (lama) atau disamarkan (lebih aman)? | Disamarkan, kecuali "akun tidak aktif" |
| K8 | Siapa yang mengirim notifikasi (himbauan, persetujuan pengajuan)? Perlu fitur kirim notifikasi di admin? | Otomatis saat pengajuan diputuskan + menu kirim himbauan di admin |
| K9 | Akun email pengirim (SMTP) untuk reset password dan notifikasi | Pakai akun koperasi; kredensial di env server, bukan di kode |
| K10 | Lokasi penyimpanan foto profil dan gambar himbauan/promo | Kolom/berkas di server v2 (mirip logo koperasi) |
| K11 | Nama aplikasi, domain, warna tema | **Diputuskan (domain):** `kopkarmjsmattel.com` landing, `anggota.` PWA, `admin.` admin (bagian 5.1). Nama aplikasi dari Pengaturan Perusahaan; warna tema masih terbuka |

Keputusan lain yang sudah dijawab pengguna (23 Oktober 2026):
- API PHP tidak dipakai PWA; PHP tetap live sampai cutover lalu dimatikan (MySQL tidak diperbarui lagi setelah cutover). Nasib aplikasi Android lama tetap K1.
- PWA satu repo dengan admin (workspace `anggota/`), aplikasi dan proses terpisah, satu VPS.

## 12. Rencana penempatan (DNS, Nginx, proses)

Rencana untuk saat cutover. **Belum dijalankan**; server produksi saat ini masih melayani API PHP (`http://101.50.3.222/KopkarMJS2000_2026/`).

**DNS** (di pengelola domain `kopkarmjsmattel.com`):

| Nama | Tipe | Nilai |
| --- | --- | --- |
| `@` | A | IP VPS |
| `www` | CNAME | `kopkarmjsmattel.com` |
| `anggota` | A | IP VPS |
| `admin` | A | IP VPS |

**Proses** (PM2, dari akar repo setelah `npm ci` dan build kedua aplikasi):

| Nama | Perintah | Port |
| --- | --- | --- |
| `kopkar-admin` | `npm run start -w frontend` | 3100 |
| `kopkar-anggota` | `npm run start -w anggota` | 3200 |

Masing-masing membaca env sendiri (`PG_URL`, rahasia sesi berbeda: `SESSION_SECRET` untuk admin, rahasia sesi anggota untuk PWA). Port 3100/3200 hanya didengar di `127.0.0.1`.

**Nginx** (sketsa; sertifikat dari Let's Encrypt untuk keempat nama):

```nginx
# HTTP -> HTTPS
server {
    listen 80;
    server_name kopkarmjsmattel.com www.kopkarmjsmattel.com anggota.kopkarmjsmattel.com admin.kopkarmjsmattel.com;
    return 301 https://$host$request_uri;
}

# Landing + PWA anggota (aplikasi anggota/)
server {
    listen 443 ssl http2;
    server_name kopkarmjsmattel.com www.kopkarmjsmattel.com anggota.kopkarmjsmattel.com;
    ssl_certificate     /etc/letsencrypt/live/kopkarmjsmattel.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kopkarmjsmattel.com/privkey.pem;
    client_max_body_size 6m;   # foto profil maks. 5 MB
    location / {
        proxy_pass http://127.0.0.1:3200;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# Admin (aplikasi frontend/), dibatasi
server {
    listen 443 ssl http2;
    server_name admin.kopkarmjsmattel.com;
    ssl_certificate     /etc/letsencrypt/live/kopkarmjsmattel.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/kopkarmjsmattel.com/privkey.pem;
    allow <IP-kantor>;   # dan/atau jaringan VPN
    deny all;
    location / {
        proxy_pass http://127.0.0.1:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Aplikasi `anggota/` membedakan landing dan PWA dari nama host: `kopkarmjsmattel.com` / `www.` menampilkan landing; `anggota.` menampilkan PWA (manifest dan service worker hanya di `anggota.`). Cookie sesi anggota tanpa atribut `Domain` (hanya berlaku di `anggota.`).

Yang perlu disiapkan pengguna saat cutover: akses DNS domain, IP kantor/VPN untuk admin, akses root VPS (Nginx, PM2, certbot).
