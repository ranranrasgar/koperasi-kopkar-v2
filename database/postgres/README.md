# Migrasi MySQL → PostgreSQL

Skema PostgreSQL dan skrip migrasi untuk database `kopkar_mjs_2000`, mengikuti PRD "Struktur Database Kopkar MJS 2000".
**MySQL hanya dibaca (SELECT).** Semua perubahan terjadi di PostgreSQL, jadi aplikasi desktop dan API mobile yang sekarang berjalan tidak terpengaruh.

## Isi folder

| File | Fungsi |
| --- | --- |
| `mapping.mjs` | Satu-satunya tempat aturan: tabel yang dibawa, nama baru, kolom yang dibuang, relasi (FK), indeks tambahan |
| `lib.mjs` | Membaca metadata MySQL dan menurunkan rencana tabel (tipe, default, indeks unik) |
| `generate-schema.mjs` | Membuat `schema.sql` dari MySQL + `mapping.mjs` |
| `schema.sql` | Skema hasil generate (di-commit supaya bisa ditinjau). Terbagi: `tables`, `indexes`, `foreign_keys`, `optional_unique` |
| `migrate.mjs` | Membuat skema, memuat data, mengisi kolom `*_id`, memasang FK, lalu memverifikasi terhadap MySQL |
| `reconcile.mjs` | Membandingkan saldo (simpanan, pinjaman, KPR, SHU) dari query lama MySQL dengan query baru PostgreSQL |

## Cara menjalankan

Prasyarat: Node 20+, dependensi proyek (`npm install`), PostgreSQL 14 atau lebih baru, dan database kosong.

> **Driver MySQL**: `migrate.mjs` dan `reconcile.mjs` memakai paket `mariadb`, yang tidak tercantum di `package.json`. Bila muncul `Cannot find package 'mariadb'`, pasang tanpa mengubah `package.json`: `npm install --no-save mariadb`.

> **Menimpa database yang sudah dipakai aplikasi baru**: `--reset` menghapus tabel hasil migrasi, termasuk operator dan grup yang dibuat aplikasi baru (mis. grup `superadmin` dan operator berpassword). Sebelum menjalankan ulang, ekspor baris `opr` (beserta `password_hash`) dan `opr_grup` yang tidak ada di MySQL, lalu buat ulang setelah migrasi. Tabel web (`anggota-web.sql`, `pengaturan-web.sql`, panduan) tidak terhapus, tetapi **foreign key-nya ke tabel yang dibuat ulang ikut hilang** (DROP ... CASCADE); `npm run anggota:pasang` memasangnya lagi (cek dulu dengan `npm run anggota:pasang -- --periksa`). Jalankan ulang `npm run anggota:pasang`, `pengaturan:pasang`, dan `panduan:pasang` untuk memastikan kolom dan izin terpasang.

```bash
createdb kopkar
PG_URL=postgres://user:pass@127.0.0.1:5432/kopkar node database/postgres/migrate.mjs --reset
```

- `MYSQL_URL` (opsional) default ke Laragon: `mysql://root:@127.0.0.1:3306/kopkar_mjs_2000`.
- Tanpa `--reset`, skrip berhenti jika tabel hasil migrasi sudah ada. Dengan `--reset`, **hanya** tabel migrasi yang dihapus dan dibuat ulang; tabel lain di database itu tidak disentuh.
- `--skip-derive` melewati penurunan `jurnal_umum.sumber_tipe/sumber_id` (langkah paling lama).
- Setelah mengubah `mapping.mjs`: `node database/postgres/generate-schema.mjs`.
- MySQL berisi tabel MyISAM, jadi tidak ada snapshot yang konsisten. Jalankan saat tidak ada transaksi, atau terhadap salinan database.

Skrip bisa diulang sebanyak yang diperlukan (latihan migrasi, lalu sekali lagi saat cutover).

## Yang dilakukan skrip

1. Membuat 42 tabel + `migration_report` (hasil tiap langkah).
2. Memuat data dari MySQL (streaming, batch), mengubah tipe: `ENUM('Y','N')` jadi `boolean`, tanggal `0000-00-00` jadi `NULL`, `DOUBLE` jadi `numeric`.
3. **Analisis (tidak mengubah data)**: mencatat jadwal di `kpr_rincian_tagih` yang nomor pinjamannya milik `pinjaman_tunai`. Jadwal itu tidak digabung (lihat "Temuan data").
4. Mengisi kolom FK baru (`anggota_id`, `pinjaman_tunai_id`, …) dengan mencocokkan kunci lama.
5. Membuat indeks, menurunkan `jurnal_umum.sumber_tipe/sumber_id`, memasang foreign key.
6. Menjadikan kolom FK `NOT NULL` hanya jika tidak ada baris yatim; sisanya dilaporkan.
7. Membandingkan jumlah baris, 14 total uang, tipe boolean, dan hash rahasia dengan MySQL. Hasil tiap langkah ada di tabel `migration_report`.

## Keputusan desain

- **Setiap tabel punya `id bigint GENERATED ALWAYS AS IDENTITY`.** Pada empat tabel yang `id` lamanya sudah surrogate (`himbauan`, `promo`, `pengajuan_pinjaman`, `user`), nilainya dipertahankan.
- **Kolom dan relasi lama dibiarkan** (huruf kecil). FK dibuat di kolom baru `<induk>_id → <induk>.id`. Kunci bisnis di tabel induk (`kode_agt`, `no_pinjaman`, `no_bukti`, `kode_perkiraan`) tetap `UNIQUE`.
- **Uang memakai `numeric(20,4)`, bukan `numeric(18,2)` seperti draf PRD.** Di MySQL ada 17 kolom uang dengan lebih dari 2 desimal (mis. 8.776 baris `simpanan.rp_setoran`). Skala 2 akan membulatkan saldo anggota. Persentase memakai `numeric(12,6)`.
- **`user` menjadi `app_user`** (`user` kata cadangan).
- **Rahasia tidak dibawa apa adanya**: `opr.PASSWORD` (teks biasa) dibuang, operator menetapkan password baru (`password_hash` kosong, `wajib_ganti_password = true`). Jawaban pertanyaan keamanan (`user`, `opr`) disimpan sebagai `scrypt$<salt hex>$<hash hex>` dari jawaban yang di-`trim` dan dijadikan huruf kecil (N=16384, r=8, p=1, 32 byte). `user.token` tidak dibawa (campuran token login dan token FCM); gantinya `app_user.fcm_token`, diisi ulang aplikasi mobile saat login.
- **`temp_shu_backup.no_reff` menunjuk ke `jurnal_umum.nomor_bukti`**, bukan ke `simpanan` (terbukti: 995 dari 995). Karena satu bukti punya beberapa baris jurnal, tidak dipasang FK; tersedia indeks pada kedua kolom.
- **`jurnal_umum.sumber_tipe/sumber_id`** diturunkan dari `nomor_bukti` dengan prioritas: `pinjaman_tunai`, `kpr`, `simpanan`, `pinjaman_tunai_rincian`, `kpr_rincian`, `shu`, `kas`. Baris tanpa dokumen sumber dibiarkan `NULL`.
- **`simpanan.coa_kas` bertipe `TINYINT` di MySQL**, sehingga akun 177 dan 179 tersimpan sebagai −79 dan −77. `kas_perkiraan_id` memperbaikinya (nilai negatif + 256).
- **`perkiraan.pr_parent`**: akun induk teratas menunjuk dirinya sendiri di MySQL; di `parent_id` menjadi `NULL`.
- **`ON DELETE RESTRICT`** untuk semua relasi, kecuali `anggota_detail`/`opr_hak_akses` (`CASCADE`) dan `app_user.pertanyaan_id` (`SET NULL`).
- Kolom `pinjaman_tunai.rp_bayar_pokok` dan `rp_bayar_bunga` berisi **sisa**, bukan jumlah terbayar; sudah diberi `COMMENT` di database. Saldo yang benar dihitung dari `pinjaman_tunai_rincian`.

### Tabel yang tidak dibawa (16)

| Tabel | Alasan |
| --- | --- |
| `bukubesar`, `laba_rugi`, `jurnal_temp`, `income_statement`, `neraca_saldo`, `tunggakan_per_sp` | Laporan olahan; diganti query/view |
| `temp_potongan_agt`, `temp_potongan_pinjaman` | Tabel kerja potongan |
| `absen`, `absensi`, `karyawan`, `bukti_transaksi`, `tabel_jatuh_tempo`, `set_tgl_angsuran` | Modul lama, kosong atau tidak dipakai |
| `simpanan_buku`, `log_notifikasi_io` | 2 baris / kosong |

Menambahkan kembali satu tabel: hapus namanya dari `SKIP_TABLES` di `mapping.mjs`, tambah relasinya di `FKS`, lalu generate ulang.

## Hasil uji

Diuji 22 Oktober 2026 pada salinan lokal Laragon: MySQL 8.0.30 (data 278 MB) ke PostgreSQL 14.5. Belum diuji di PostgreSQL 17.

- Waktu: sekitar 7 menit; `jurnal_umum` (1,1 juta baris) paling lama.
- 42 tabel, **jumlah baris sama dengan MySQL di semua tabel**; 14 total uang dibandingkan, selisih terbesar Rp 0,03.
- `reconcile.mjs`: 8.031 saldo simpanan per anggota dan jenis, 22.686 saldo pinjaman tunai, 441 saldo KPR, dan 1.032 SHU per anggota **semuanya sama** (toleransi Rp 0,01).
- 54 foreign key terpasang; 19 kolom FK wajib sudah `NOT NULL`, 8 kolom belum karena masih ada baris yatim (tabel di bawah).
- Rahasia: 0 password operator yang dibawa, semua jawaban pertanyaan keamanan ter-hash, 14 akun kas negatif terkoreksi.

## Backup dan restore (pindah server, cadangan rutin)

Satu cadangan berisi seluruh database PostgreSQL: data, akun, operator, pengaturan, panduan, dan **media** (foto anggota, gambar himbauan/promo/notifikasi, logo), karena semua media aplikasi disimpan di database, bukan di folder. Yang tidak ikut: `.env.local` (rahasia, simpan terpisah) dan kode (ada di git).

```
npm run backup -- --ke G:/cadangan                  # buat cadangan (database sumber hanya dibaca, aplikasi boleh berjalan)
npm run restore -- <folder-cadangan> --periksa      # periksa kelengkapan dan SHA-256 tanpa mengubah apa pun
npm run restore -- <folder-cadangan>                # pulihkan ke PG_URL (database tujuan kosong atau belum ada)
npm run restore -- <folder> --timpa --yakin <nama_db>   # timpa database yang sudah berisi
```

- **Isi folder** `kopkar-<db>-<tanggal>-<jam>/`: `data.dump` (pg_dump format custom terkompresi, tanpa isi tabel media), `media.dump` (isi `app_user_foto` dan `pengumuman_gambar`), dan `manifest.json` (versi PostgreSQL, commit aplikasi, jumlah baris per tabel, ukuran dan SHA-256 tiap potongan). Hitungan baris, data, dan media diambil dari satu snapshot transaksi, jadi serasi walau ada transaksi saat pencadangan.
- **Ukuran**: database 1,49 GB (Oktober 2026) menjadi cadangan **40 MB** (indeks dibangun ulang saat restore, sisanya terkompresi); backup ±14 detik, restore ±20 detik. Berkas dipotong per 500 MB (`--potong <MB>`, `0` = tidak dipotong) supaya mudah diunggah atau disalin ke flashdisk FAT32. `--tanpa-media` untuk cadangan tanpa gambar.
- **Supaya restore tidak gagal**: sebelum database apa pun diubah, tiap potongan diperiksa ukuran dan SHA-256-nya (berkas terpotong atau rusak saat disalin langsung ketahuan), potongan digabung ke satu berkas sementara (dicek ruang disknya, dihapus setelah selesai), versi PostgreSQL tujuan harus sama atau lebih baru dari sumber, dan ruang disk folder data PostgreSQL dicek bila servernya di komputer itu. Restore jalan per bagian (skema, data, media, lalu indeks dan constraint), jadi FK ke tabel media dipasang setelah media masuk.
- **Menimpa database berisi** (bawaan): dipulihkan ke `<nama>_pulih` dulu, jumlah baris dicocokkan dengan manifest, baru database lama dihapus dan `_pulih` diganti namanya. Bila gagal, database lama tidak tersentuh. Butuh ruang kira-kira sebesar database. Bila ruang tidak cukup: `--langsung` menghapus database lama lebih dulu (pastikan cadangannya sudah `--periksa` OK).
- `pg_restore` tidak bisa membaca format custom dari pipa di Windows ("unsupported version in file header"), karena itu potongan digabung ke berkas, bukan dialirkan.
- Folder `backup/` di akar repo ada di `.gitignore` (berisi data anggota). Simpan cadangan di disk lain atau disk luar; disk C komputer pengembangan hampir penuh.

**Dari aplikasi admin**: menu **Sistem & Pengaturan → Backup & Restore** (`/dashboard/settings/backup`, izin `Backup & Restore (web)`, bawaan hanya superadmin) menjalankan skrip yang sama: buat cadangan (dengan/tanpa media), daftar cadangan di folder server (`KOPKAR_BACKUP_DIR` atau `backup/`), unduh tiap berkas (dialirkan dari disk), periksa (`--periksa`), hapus, dan pulihkan (lewat database sementara; nama database harus diketik ulang; opsi `--langsung` sengaja tidak ada di web). Satu proses pada satu waktu. **Unggah cadangan dari komputer** (untuk pindah data kantor <-> VPS lewat browser): berkas dikirim per potongan 8 MB ke `/dashboard/settings/backup/unggah` (proxy Next.js memotong isi permintaan di atas 10 MB tanpa galat, `proxyClientMaxBodySize`), ditulis berurutan ke folder sementara `.unggah-<id>` (kiriman ulang potongan yang sama diterima, potongan meloncat ditolak, Origin dicek), lalu manifest disimpan, folder diberi nama `kopkar-...-unggah`, dan SHA-256 diperiksa dengan `restore.mjs --periksa`; bila tidak cocok folder dibuang. Unggahan setengah jadi lebih dari sehari dihapus saat halaman dibuka.

- Ruang disk untuk restore: ukuran database (saat dicadangkan) x 1,15 **+ 1 GB** cadangan untuk WAL dan berkas sementara.
- Database `kopkar_mjs_2000` berukuran 1,5 GB tetapi salinan hasil restore dengan isi yang sama hanya 582 MB: sisanya ruang kosong bekas pembaruan (bloat). `VACUUM FULL` (mengunci tabel, jalankan di luar jam kerja) atau satu kali restore memperkecilnya.

**Pindah ke VPS**: (1) di komputer ini `npm run backup -- --ke <folder>`; (2) salin seluruh folder cadangan ke VPS; (3) di VPS: `git pull`, `npm install`, buat `frontend/.env.local` dan `anggota/.env.local` (PG_URL VPS, rahasia sesi, SMTP, VAPID sama dengan sebelumnya, Google); (4) `npm run restore -- <folder> --periksa`, lalu `npm run restore -- <folder>`; (5) `npm run anggota:pasang` bila kode lebih baru dari cadangan; (6) build dan jalankan ulang aplikasi. PostgreSQL di VPS harus versi 14 atau lebih baru, dengan `pg_dump`/`pg_restore` versi yang sama dengan servernya (`KOPKAR_PG_BIN` bila tidak di PATH).

## Migrasi data produksi 22 Oktober 2026

Sumber: `db_backup_kopkar_22_10_2026.sql` (dump HeidiSQL dari MySQL 5.7 produksi). Cara memakainya tanpa menyentuh database yang sudah ada:

```bash
mysql -uroot -e "CREATE DATABASE kopkar_20261022 CHARACTER SET latin1"
mysql -uroot --max_allowed_packet=256M kopkar_20261022 < db_backup_kopkar_22_10_2026.sql
MYSQL_URL=mysql://root:@127.0.0.1:3306/kopkar_20261022 PG_URL=postgres://postgres@127.0.0.1:5432/kopkar_mjs_2000 node database/postgres/migrate.mjs --reset
MYSQL_URL=mysql://root:@127.0.0.1:3306/kopkar_20261022 PG_URL=postgres://postgres@127.0.0.1:5432/kopkar_mjs_2000 node database/postgres/reconcile.mjs
```

Catatan impor: dump berisi `DROP TABLE IF EXISTS` untuk 58 tabel, jadi **jangan** diimpor ke database yang masih dipakai. Di akhir dump ada 5 trigger yang ditulis dengan nama schema `kopkar_mjs_2000`; saat diimpor ke database lain, `CREATE TRIGGER` itu gagal ("Trigger already exists") setelah seluruh data termuat, dan itu tidak berbahaya. Trigger tidak dibawa ke PostgreSQL (lihat PRD, bagian Aplikasi desktop).

Hasil: 42 tabel termuat, jumlah baris dan 14 total uang cocok (selisih terbesar Rp 0,03); rekonsiliasi 8.031 saldo simpanan, 22.948 pinjaman tunai, 441 KPR, dan 1.032 SHU semuanya sama. Waktu 9,5 menit; ukuran database PostgreSQL 1,5 GB. Baris yatim sama dengan data sebelumnya kecuali `log_notifikasi` (bertambah mengikuti data baru).

## Keputusan 22 Oktober 2026 yang sudah diterapkan di migrasi

- **Data milik kode anggota yang tidak ada (atau kode kosong) dihapus**, hanya di PostgreSQL; MySQL dan dump tidak berubah. Rinciannya: 58 baris `simpanan` (saldo bersih Rp 26.185.950; 40 punya jurnal), pinjaman berkode `true` CR-1217-719 (Rp 22,5 juta, 0 cicilan, tanpa rincian) beserta 27 baris jadwal, KPR lunas CR-1217-936 milik 2507-6108 beserta 9 rincian dan 8 jadwal, 4 `pengajuan_pinjaman` ditolak, 23 `anggota_detail`, dan 1 `app_user` (akun `asol`). **Jurnal tidak ikut dihapus.** Isi baris yang dihapus tersimpan di `migration_report` (`step = 'keputusan'`; hash dan token disamarkan). Ada pengaman: bila satu tabel melebihi batas jumlah baris yatim (simpanan 200, pinjaman dan KPR 5, pengajuan 50, `anggota_detail` 100, `app_user` 5), tidak ada yang dihapus. Setelah ini kolom FK wajib pada tabel-tabel itu menjadi `NOT NULL`.
- **1.242 jadwal di `kpr_rincian_tagih` dibiarkan** tanpa induk (`kpr_id` `NULL`); itu disengaja dan tidak dihitung sebagai baris yatim.
- Tabel `simpanan_buku` dan modul penjualan lama tetap tidak dibawa.
- Rekonsiliasi (`reconcile.mjs`) hanya membandingkan data milik anggota yang ada, jadi tetap lolos setelah penghapusan.

## Temuan data

| Relasi | Baris yatim | Keterangan |
| --- | --- | --- |
| `simpanan.anggota_id` | 58 | 52 kode anggota tidak ada (mis. 2011-0042) dan 6 kosong |
| `kpr_rincian_tagih.kpr_id` | 1.242 | **Bukan salah tabel dan bukan duplikat.** Jadwal untuk 36 nomor pinjaman yang di MySQL milik `pinjaman_tunai`, dengan isi berbeda (contoh CR-1217-1009 angsuran ke-41: Rp 511.700 tanpa bukti, sedangkan di `pinjaman_tunai_rincian_tagih` Rp 272.727 dengan bukti). Tidak digabung agar tidak menimpa jadwal pinjaman lain |
| `pinjaman_tunai_rincian_tagih.pinjaman_tunai_id` | 149 | Tagihan tahun 2019 tanpa pinjaman (104 nomor) |
| `anggota_detail.anggota_id` | 23 | 8 kode anggota tidak ada di `anggota` |
| `kpr_rincian.kpr_id` | 32 | Nomor pinjaman kosong |
| `pengajuan_pinjaman.anggota_id` | 4 | Kode 0622-1699 tidak ada di `anggota` |
| `pinjaman_tunai.anggota_id`, `kpr.anggota_id`, `app_user.anggota_id` | 1 | Masing-masing satu kode salah (satu berisi teks `true`) |
| `log_notifikasi.anggota_id` | 10.631 | Opsional: kolom `kode_agt` berisi tanggal (mis. 01/03/2022) |
| `kas.operator_id` | 30 | Operator bernama "Administrator" tidak ada di `opr` |
| `variable_akun.perkiraan_id` | 5 | Kode akun lama (2.1.26, 3.0.01, …) tidak ada di `perkiraan` |
| `anggota.karyawan_mattel_id` | (wajar) | 331 anggota cocok; sisanya bukan karyawan Mattel |

Temuan lain:

- **1.175 dari 1.179 password anggota masih MD5 tanpa salt**; hanya 4 yang bcrypt. Aplikasi baru perlu memverifikasi MD5 lalu menggantinya dengan hash baru saat login.
- `jurnal_umum`: 40.479 baris (14.346 bukti) tidak punya dokumen sumber: bukti `BB` 26.332 baris, `JU` 8.655, `SHU` 2.458, `ANGS` 2.240, `TBT` (tutup buku) 794.
- Dokumen tanpa jurnal: 9.233 baris `simpanan`, 1.634 `pinjaman_tunai_rincian`, 678 `kpr_rincian`, 1.257 pencairan `pinjaman_tunai`.

## Belum dikerjakan

- Pembersihan baris yatim di atas (butuh keputusan); setelah itu kolom FK wajib dijadikan `NOT NULL` dengan menjalankan ulang migrasi.
- `prisma db pull` terhadap PostgreSQL dan mengganti adapter di `src/lib/prisma.ts` (`@prisma/adapter-pg`); `pg` sudah ditambahkan sebagai devDependency.
- Latihan migrasi terhadap salinan data produksi terbaru, dan pengujian di PostgreSQL 17.
