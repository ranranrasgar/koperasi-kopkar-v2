# Satu image untuk aplikasi admin (frontend/) dan aplikasi anggota (anggota/), beserta skrip database
# (backup, restore, anggota:pasang, ...). docker-compose.yml menjalankannya sebagai dua layanan. Panduan: docs/DEPLOY-VPS.md.

FROM node:22-bookworm-slim AS dasar
# pg_dump/pg_restore versi 14, sama dengan layanan db (postgres:14): dipakai menu Backup & Restore dan npm run backup/restore.
# database/postgres/pg-alat.mjs menemukannya di /usr/lib/postgresql/14/bin.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg tzdata \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client-14 \
 && rm -rf /var/lib/apt/lists/*
ENV TZ=Asia/Jakarta
WORKDIR /app

FROM dasar AS bangun
# Paket dipasang dulu (lapisan ini disimpan selama package*.json tidak berubah), lalu kode, lalu build kedua aplikasi.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY mobile-api/package.json mobile-api/
COPY frontend/package.json frontend/
COPY anggota/package.json anggota/
RUN npm ci
COPY . .
# Modul database membuat pool saat dimuat (createPool melempar galat bila PG_URL kosong) tetapi tidak terhubung;
# halaman membaca database saat request, bukan saat build. Jadi build cukup diberi PG_URL palsu.
RUN PG_URL=postgres://bangun:bangun@127.0.0.1:5432/bangun npm run build -w frontend \
 && PG_URL=postgres://bangun:bangun@127.0.0.1:5432/bangun npm run build -w anggota

FROM dasar AS jalan
ENV NODE_ENV=production
ARG KOPKAR_COMMIT=""
ENV KOPKAR_COMMIT=$KOPKAR_COMMIT
# Seluruh repo hasil build (termasuk node_modules dan database/), dimiliki pengguna node supaya cache .next bisa ditulis.
COPY --from=bangun --chown=node:node /app /app
RUN install -d -o node -g node /backup
USER node
EXPOSE 3100 3200
