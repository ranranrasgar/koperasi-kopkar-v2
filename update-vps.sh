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
if [ "${KOPKAR_SUDAH_PULL:-}" != "1" ]; then
    sebelum="$(git rev-parse HEAD:update-vps.sh)"
    git pull --ff-only
    # Bash membaca skrip sedikit demi sedikit: bila git pull mengubah skrip ini, langkah berikutnya masih versi lama
    # (3 November: database tetap hidup selama build). Jalankan ulang versi baru tanpa pull lagi.
    if [ "$(git rev-parse HEAD:update-vps.sh)" != "$sebelum" ]; then
        echo "==> Skrip update ikut berubah; menjalankan versi baru"
        KOPKAR_SUDAH_PULL=1 exec "$0" "$@"
    fi
fi

# Build butuh RAM besar. Tanpa swap, VPS 2 GB dimatikan kernel di tengah build (pesan "Killed"); tambahkan swap 4 GB sekali saja:
#   sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
#   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
if [ "$(awk '/SwapTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 1500 ] && [ "$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 3500 ]; then
    echo "PERINGATAN: RAM kurang dari 3,5 GB dan swap kurang dari 1,5 GB; build kemungkinan 'Killed'. Tambahkan swap dulu (lihat komentar di skrip ini)." >&2
    read -r -p "Lanjut juga? [y/N] " jawab
    [ "${jawab:-N}" = "y" ] || exit 1
fi

# Bila langkah mana pun gagal setelah aplikasi dihentikan, nyalakan lagi versi yang lama supaya situs tidak mati.
# Bila build sudah selesai, image yang dinyalakan sudah versi baru, jadi langkah 4-5 tetap harus diselesaikan.
nyalakan_lama() { echo "==> GAGAL: menyalakan kembali aplikasi. Bila build sudah selesai, jalankan ulang skrip ini setelah penyebabnya dibereskan." >&2; docker compose up -d; }

# Disk penuh membuat PostgreSQL gagal menyala setelah build (6 November). Periksa sebelum aplikasi dihentikan; volume database tidak disentuh.
RUANG_MIN_GB=3
ruang_gb() { df --output=avail -BG "$(docker info --format '{{.DockerRootDir}}')" | tail -1 | tr -dc 0-9; }
bersihkan_docker() { docker builder prune -af >/dev/null; docker image prune -f >/dev/null; }
if [ "$(ruang_gb)" -lt "$RUANG_MIN_GB" ]; then
    echo "==> Ruang disk tinggal $(ruang_gb) GB, membersihkan cache build Docker"
    bersihkan_docker
fi
if [ "$(ruang_gb)" -lt "$RUANG_MIN_GB" ]; then
    echo "GAGAL: ruang disk tinggal $(ruang_gb) GB, perlu minimal $RUANG_MIN_GB GB. Aplikasi tidak dihentikan. Periksa: df -h, docker system df, du -sh /var/backups/kopkar" >&2
    exit 1
fi

echo "==> 2/6 Hentikan aplikasi dan database (bebaskan RAM untuk build; db dinyalakan lagi di langkah 4 untuk cadangan)"
# VPS OpenVZ 2 GB tanpa swap: dengan PostgreSQL tetap hidup, build Next.js dimatikan kernel ("Killed", 3 November).
docker compose stop admin anggota mobile db
trap nyalakan_lama ERR

echo "==> 3/6 Bangun ulang image (beberapa menit)"
KOPKAR_COMMIT="$(git rev-parse --short HEAD)" nice -n 19 docker compose build admin
# Cache build dan image lama dibuang sebelum database menyala, supaya disk tidak penuh. Build berikutnya mengulang npm ci.
bersihkan_docker

echo "==> 4/6 Cadangan database sebelum perubahan skema"
docker compose up -d db
docker compose run --rm -w /app admin npm run backup -- --ke /backup

echo "==> 5/6 Pasang tabel, indeks, pengaturan, dan data baru"
for s in anggota:pasang indeks:pasang pengaturan:pasang shu:pasang sequences:pasang panduan:pasang; do
    docker compose run --rm -w /app admin npm run "$s"
done

echo "==> 6/6 Jalankan ulang"
docker compose up -d
docker compose ps
echo "Selesai: $(git rev-parse --short HEAD)"
