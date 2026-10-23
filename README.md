# Kopkar MJS 2000 v2

- `backend/`    mesin posting (simpanan, pinjaman, jurnal) di atas PostgreSQL; semua posting dalam satu transaksi.
- `mobile-api/` API untuk aplikasi Android dengan kontrak JSON lama (`database/contract`).
- `frontend/`   web kasir/pengurus (Next.js 16), membaca PostgreSQL langsung dan memposting lewat `backend/src/posting/`.
- `anggota/`    PWA anggota (Next.js 16), lihat `docs/prd-pwa-anggota.md`.
- `database/`   skema, migrasi MySQL ke PostgreSQL, rekonsiliasi, kontrak, backup/restore.

**Deploy ke VPS (Docker)**: langkah demi langkah di [`docs/DEPLOY-VPS.md`](docs/DEPLOY-VPS.md) (`Dockerfile`, `docker-compose.yml`, `.env.contoh`).

Uji backend: `PG_URL=postgres://postgres:@127.0.0.1:5432/kopkar_mjs_2000 npm test`

Jalankan API mobile: `PG_URL=... npm start -w mobile-api` (port 8099, `/v1/Api.php?apicall=...`).
Uji kontrak: `npm test -w mobile-api` membandingkan bentuk JSON dengan `database/contract/mobile-api-shapes.json`.

Jalankan web: `npm run dev -w frontend` (port 3100), `PG_URL` dibaca dari `frontend/.env.local`.
Impor antar file backend memakai ekstensi `.ts` supaya bisa dibundel Turbopack dan dijalankan tsx.
Form transaksi web memanggil mesin posting lewat server actions (`frontend/src/app/actions/transaksi.ts`).
Kolom `opr` diisi nama operator yang login; `KOPKAR_UJI_ROLLBACK=1` menjalankan posting lalu membatalkannya (mode uji).

Login operator (tabel `opr`): sesi cookie bertanda tangan 12 jam, wajib `SESSION_SECRET` (min. 32 karakter) di `frontend/.env.local`.
Password awal diset admin: `npm run set-password -w frontend -- <nama>` (atau `--acak`, `--daftar`); operator wajib menggantinya saat login pertama.
Hak akses: `opr_hak_akses` per grup (akses T) dengan nama menu desktop; peta halaman web ke menu desktop ada di `frontend/src/config/akses.ts`.
Superadmin: operator di grup `superadmin` lolos semua izin dan mengelola hak akses (/dashboard/settings/akses) serta operator (/dashboard/settings/operator). Buat dengan `npm run set-password -w frontend -- <nama> --buat-superadmin`.
