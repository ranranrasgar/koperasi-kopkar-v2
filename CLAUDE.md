# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Koperasi Kopkar MJS 2000, v2: npm workspaces monorepo di atas PostgreSQL (hasil migrasi dari MySQL desktop `kopkar_mjs_2000`). Bahasa UI, komentar, dan pesan commit: Indonesia.

## Alur kerja agent (wajib)
- **Sebelum mulai, baca `docs/WORKLOG.md`** (status terakhir, hal yang belum selesai, jebakan). **Di akhir setiap sesi kerja, tambahkan entri baru di atas daftar log** (tanggal, yang dikerjakan, hasil verifikasi, yang tersisa). Agent berikutnya bergantung pada log itu.
- `frontend/` memakai Next.js 16 dengan breaking changes dari versi yang dikenal; baca panduan di `node_modules/next/dist/docs/` sebelum menulis kode Next.js dan perhatikan deprecation (contoh: `PageProps<"/path">`, `proxy.ts` menggantikan middleware, `connection()` dari `next/server`).
- Commit hanya bila diminta pengguna.

## Perintah
- Uji backend + mobile-api: `PG_URL=postgres://postgres:@127.0.0.1:5432/kopkar_mjs_2000 npm test` (root). Satu workspace: `npm test -w backend`. Satu file: `cd backend && PG_URL=... npx tsx --test test/simpanan.test.ts`.
- Typecheck frontend: `npm run typecheck -w frontend`. Tidak ada lint script dan tidak ada uji frontend.
- Web: `npm run dev` (root) atau `npm run dev -w frontend` (port 3100; `PG_URL`, `SESSION_SECRET`, `KOPKAR_UJI_ROLLBACK` dari `frontend/.env.local`, gitignored). Jangan menjalankan dua dev server utama: port 3100 sering sudah dipakai.
- Mode uji: setiap simpan dijalankan lalu langsung di-rollback (`tx()` di `lib/db.ts`), cocok untuk cek validasi satu transaksi. Kelola akses, operator, ganti password, dan saklar mode tidak ikut rollback. Diatur dari **Sistem & Pengaturan → Mode Uji / Live** (`pengaturan_web.mode_uji`, dibaca setiap transaksi; izin menu `Mode Aplikasi (web)`: superadmin + grup admin). Tabel dipasang `npm run pengaturan:pasang`. `KOPKAR_UJI_ROLLBACK=1/0` di env **mengunci** mode dan mengalahkan saklar (server uji memakai `0`); jangan isi di `.env.local` server utama. `modeUji()` sekarang async.
- Database uji untuk menguji alur antar halaman (data benar-benar tersimpan): `npm run uji:reset` menyalin `kopkar_mjs_2000` ke `kopkar_mjs_2000_uji` (pg_dump/pg_restore, ±30 detik, sumber hanya dibaca), lalu `npm run dev:uji` menjalankan server kedua di port 3101 ke database uji (tanpa rollback, folder build `.next-uji`, `tsconfig.uji.json`, cookie `kopkar_sesi_uji`, banner ungu dan judul "[UJI]"). Bisa berjalan bersamaan dengan server utama; `uji:reset` boleh dijalankan saat server uji hidup.
- Pusat Panduan: `npm run panduan:pasang` membuat tabel `panduan_kategori`/`panduan` (`database/postgres/panduan.sql`, khusus web, tidak lewat `mapping.mjs`) dan menambahkan isi awal dari `database/panduan/NN-kategori/NN-artikel.md` yang belum ada (cocok lewat slug; suntingan admin tidak ditimpa). `-- --timpa` mengembalikan semua ke isi bawaan. Saat mengubah aturan transaksi atau halaman, perbarui juga artikel panduan terkait di `database/panduan`.
- API mobile: `PG_URL=... npm start -w mobile-api` (port 8099, `/v1/Api.php?apicall=...`).
- PWA anggota: `npm run dev:anggota` (port 3200; `PG_URL`, `ANGGOTA_SESSION_SECRET` dari `anggota/.env.local`) atau `npm run dev:anggota:uji` (port 3201, database uji). Typecheck: `npm run typecheck -w anggota`. PRD: `docs/prd-pwa-anggota.md`.
- Migrasi MySQL ke PostgreSQL: lihat `database/postgres/README.md` (jangan `--reset` pada database yang dipakai).
- Password operator: `npm run set-password -w frontend -- <nama>` (`--acak`, `--daftar`, `--buat-superadmin`). Mengubah database; jalankan hanya atas permintaan pengguna.

## Arsitektur
- `backend/src/posting/*`: satu-satunya tempat transaksi uang ditulis (simpanan, pinjaman tunai, KPR, angsuran, jurnal umum). Setiap posting satu transaksi lewat `withTx` (`backend/src/db.ts`) dan membuat jurnal ganda sendiri (`journal.ts`). Uang dihitung dengan `bigint` unit (`money.ts`), tidak pernah float. Impor antar file backend memakai ekstensi `.ts`.
- `frontend` memanggil mesin posting lewat server actions (`src/app/actions/transaksi.ts`); `actions/master.ts` dan `actions/pengajuan.ts` menulis data master/pengajuan dengan SQL langsung. Halaman membaca lewat `src/lib/queries/*` yang memakai `query()` dari `src/lib/db.ts` (numeric dan bigint menjadi `number` di sini; di backend tetap teks).
- Halaman bersifat server component per route di `src/app/dashboard/**` (tidak ada catch-all). Daftar generik memakai `ModuleConfig` di `src/config/modules.ts`; menu di `src/config/menu.ts`.
- **Hak akses**: setiap halaman wajib memanggil `wajibIzin("/dashboard/...")` (`src/lib/operator.ts`) karena layout tidak dijalankan ulang pada navigasi; server action memanggil `operatorAktif([MENU.x])`. Peta halaman ke nama menu desktop ada di `src/config/akses.ts` (`MENU`, `AKSES_HALAMAN`) dan harus sama persis dengan teks di tabel `opr_hak_akses`. Halaman baru = entri di `MENU`/`AKSES_HALAMAN` + `menu.ts`. Grup `superadmin` lolos semua izin.
- Login operator (tabel `opr`, hash scrypt) dengan cookie sesi bertanda tangan 12 jam (`lib/sesi.ts`); `proxy.ts` mengarahkan yang belum login ke `/login`.
- `mobile-api`: 17 endpoint baca dengan kontrak JSON lama Android (`database/contract/mobile-api-shapes.json`); uji kontrak membandingkan bentuk JSON. Query-nya ada di `backend/src/anggota/queries.ts` (dipakai juga PWA) dan menerima id, bukan `kode_agt`.
- `anggota/`: PWA anggota (Next.js, sesi `app_user` sendiri, tema sendiri). Aturan akun di `backend/src/anggota/akun.ts`. Setiap query data memakai `anggotaId` dari sesi (`lib/anggota.ts`), tidak pernah dari parameter. Relasi selalu lewat PK/FK id.
- `KOPKAR_UJI_ROLLBACK=1`: posting dijalankan lalu di-rollback (mode uji di web); kolom `opr` diisi nama operator yang login.

## Database
- Tabel memakai nama lama huruf kecil; tiap tabel punya `id bigint` dan FK `<induk>_id`, kunci bisnis lama (`kode_agt`, `no_pinjaman`) tetap `UNIQUE`. Uang `numeric(20,4)`, enum Y/N menjadi boolean, MySQL `user` menjadi `app_user`.
- Tidak ada ORM. SQL PostgreSQL: `$1`, `ILIKE`, `int / int` memotong (cast ke `numeric`), alias SELECT tidak bisa difilter.
- 16 tabel tidak dimigrasi (`SKIP_TABLES` di `database/postgres/mapping.mjs`: `absen`, `bukubesar`, `neraca_saldo`, ...); laporan diganti query langsung ke `jurnal_umum`. Halaman absensi hanya placeholder.
- Perubahan skema: ubah `mapping.mjs`, jalankan `generate-schema.mjs`, lalu `migrate.mjs`. Jangan edit `schema.sql` manual.
- Password anggota di `app_user`: sebagian besar masih MD5 tanpa salt dari aplikasi lama; diganti bcrypt `$2y$` saat anggota login di PWA. Hanya PWA (akun milik anggota sendiri) yang boleh menulisnya, jangan dari form admin. `opr.password_hash` format `scrypt$salt$hash`.
