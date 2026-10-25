#!/usr/bin/env bash
# Perbarui aplikasi di VPS dalam satu perintah: tarik kode, bangun ulang image, cadangkan database,
# pasang tabel/data baru (aman diulang), lalu jalankan ulang. Jalankan dari folder repo di VPS:
#
#   cd /srv/kopkar && ./update-vps.sh
#
# Database dan volumenya tidak disentuh. JANGAN `docker compose pull admin anggota mobile` selama GitHub Actions gagal
# (menimpa image hasil build ini dengan image lama).
set -euo pipefail
cd "$(dirname "$0")"

echo "==> 1/6 Tarik kode terbaru"
git pull --ff-only

echo "==> 2/6 Hentikan aplikasi (db tetap hidup untuk cadangan; bebaskan RAM untuk build)"
docker compose stop admin anggota mobile

echo "==> 3/6 Bangun ulang image (beberapa menit)"
KOPKAR_COMMIT="$(git rev-parse --short HEAD)" nice -n 19 docker compose build admin

echo "==> 4/6 Cadangan database sebelum perubahan skema"
docker compose up -d db
docker compose run --rm -w /app admin npm run backup -- --ke /backup

echo "==> 5/6 Pasang tabel, indeks, pengaturan, dan data baru"
for s in anggota:pasang indeks:pasang pengaturan:pasang shu:pasang panduan:pasang; do
    docker compose run --rm -w /app admin npm run "$s"
done

echo "==> 6/6 Jalankan ulang"
docker compose up -d
docker compose ps
echo "Selesai: $(git rev-parse --short HEAD)"
