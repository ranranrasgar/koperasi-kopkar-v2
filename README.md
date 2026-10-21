# Kopkar MJS 2000 v2

- `backend/`    mesin posting (simpanan, pinjaman, jurnal) di atas PostgreSQL; semua posting dalam satu transaksi.
- `mobile-api/` API untuk aplikasi Android dengan kontrak JSON lama (`database/contract`).
- `frontend/`   web untuk kasir (belum dimulai).
- `database/`   skema, migrasi MySQL ke PostgreSQL, rekonsiliasi, kontrak.

Uji backend: `PG_URL=postgres://postgres:@127.0.0.1:5432/kopkar_mjs_2000 npm test`
