// Cadangan database lengkap: data + media (gambar), siap dipindah ke server lain dan dipulihkan dengan restore.mjs.
//
//   npm run backup                              PG_URL dari env/.env.local, ke folder KOPKAR_BACKUP_DIR atau ./backup
//   npm run backup -- --ke G:/cadangan          folder tujuan lain (disarankan disk lain / disk luar)
//   npm run backup -- --potong 200              ukuran potongan berkas dalam MB (bawaan 500; 0 = tidak dipotong)
//   npm run backup -- --tanpa-media             tanpa tabel media (gambar), lebih kecil
//
// Isi folder cadangan (kopkar-<db>-<tanggal>-<jam>/):
//   data.dump(.001, .002, ...)   pg_dump format custom (terkompresi): skema semua tabel + data, KECUALI isi tabel media
//   media.dump(.001, ...)        isi tabel media saja (foto profil, gambar pengumuman); bisa sangat besar
//   manifest.json                versi PostgreSQL, commit aplikasi, jumlah baris per tabel, ukuran dan SHA-256 tiap potongan
//
// Semua media aplikasi (foto anggota, gambar himbauan/promo/notifikasi, logo) disimpan di database, jadi cadangan ini
// sudah mencakup "storage". Yang TIDAK ikut: .env.local (rahasia; simpan terpisah) dan file kode (ada di git).
//
// Supaya tidak gagal karena besar berkas: dikompres, dipotong (mudah diunggah / disalin ke flashdisk FAT32 maks. 4 GB),
// tiap potongan punya SHA-256 untuk diperiksa sebelum restore, ruang disk dicek sebelum mulai, dan database sumber
// hanya dibaca (aplikasi boleh tetap berjalan). Jumlah baris, data, dan media diambil dari satu snapshot transaksi yang
// sama (pg_export_snapshot + pg_dump --snapshot), jadi ketiganya persis serasi walau ada transaksi saat pencadangan.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { cariBin, jalan, namaDb, pgUrl, ruangKosong, ukuranBaca } from './pg-alat.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const akarRepo = path.join(here, '../..');

/** Tabel yang isinya media biner besar; dicadangkan terpisah dari data (lihat anggota-web.sql). */
const TABEL_MEDIA = ['app_user_foto', 'pengumuman_gambar'];

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s]`, ...a);

function opsi() {
    const a = process.argv.slice(2);
    const nilai = (nama) => { const i = a.indexOf(nama); return i >= 0 ? a[i + 1] : undefined; };
    const potong = Number(nilai('--potong') ?? 500);
    if (!Number.isFinite(potong) || potong < 0) throw new Error('--potong harus angka MB (0 = tidak dipotong)');
    return {
        ke: path.resolve(nilai('--ke') ?? process.env.KOPKAR_BACKUP_DIR ?? path.join(akarRepo, 'backup')),
        potongByte: Math.round(potong * 1024 * 1024),
        media: !a.includes('--tanpa-media'),
    };
}

const cap = () => {
    const d = new Date(), p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

/** Potong berkas menjadi nama.001, .002, ... (bila lebih besar dari batas) dan hitung SHA-256 tiap potongan dan keseluruhan. */
async function potongDanHitung(berkas, batas) {
    const ukuran = fs.statSync(berkas).size;
    const nama = path.basename(berkas);
    const semua = crypto.createHash('sha256');
    if (!batas || ukuran <= batas) {
        for await (const b of fs.createReadStream(berkas)) semua.update(b);
        const h = semua.digest('hex');
        return { nama, ukuran, sha256: h, potongan: [{ nama, ukuran, sha256: h }] };
    }
    const potongan = [];
    let ke = 0, tulis = null, hash = null, isi = 0, namaP = '';
    const tutup = async () => {
        if (!tulis) return;
        await new Promise((r, j) => tulis.end((e) => (e ? j(e) : r())));
        potongan.push({ nama: namaP, ukuran: isi, sha256: hash.digest('hex') });
        tulis = null;
    };
    for await (let b of fs.createReadStream(berkas, { highWaterMark: 1 << 20 })) {
        semua.update(b);
        while (b.length) {
            if (!tulis) {
                ke++; isi = 0; namaP = `${nama}.${String(ke).padStart(3, '0')}`;
                tulis = fs.createWriteStream(path.join(path.dirname(berkas), namaP)); hash = crypto.createHash('sha256');
            }
            const ambil = b.subarray(0, batas - isi);
            if (!tulis.write(ambil)) await new Promise((r) => tulis.once('drain', r));
            hash.update(ambil); isi += ambil.length; b = b.subarray(ambil.length);
            if (isi >= batas) await tutup();
        }
    }
    await tutup();
    fs.rmSync(berkas);
    return { nama, ukuran, sha256: semua.digest('hex'), potongan };
}

async function main() {
    const o = opsi();
    const url = pgUrl();
    if (!url) throw new Error('PG_URL tidak diset dan tidak ada di frontend/.env.local atau anggota/.env.local');
    const db = namaDb(url);

    const c = new pg.Client({ connectionString: url });
    await c.connect();
    const versiServer = (await c.query('SHOW server_version')).rows[0].server_version;
    const mayor = Number(versiServer.split('.')[0]);
    const ukuranDb = Number((await c.query('SELECT pg_database_size(current_database()) b')).rows[0].b);
    const tabel = (await c.query(`SELECT c.relname t FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1`)).rows.map((r) => r.t);
    const media = TABEL_MEDIA.filter((t) => tabel.includes(t));
    const ukuranMedia = media.length ? Number((await c.query(
        `SELECT sum(pg_total_relation_size(x::regclass)) b FROM unnest($1::text[]) x`, [media])).rows[0].b ?? 0) : 0;

    // Ruang disk: dump terkompresi biasanya 15-35% ukuran database; minta 60% + 200 MB supaya aman (pemotongan butuh
    // ruang dua kali sesaat untuk berkas terbesar).
    fs.mkdirSync(o.ke, { recursive: true });
    const perlu = Math.round(ukuranDb * 0.6) + 200 * 1024 * 1024, ada = ruangKosong(o.ke);
    log(`Database ${db}: ${ukuranBaca(ukuranDb)} (media ${ukuranBaca(ukuranMedia)}), PostgreSQL ${versiServer}`);
    if (ada !== null && ada < perlu) {
        await c.end();
        throw new Error(`ruang kosong di ${o.ke} hanya ${ukuranBaca(ada)}, perlu sekitar ${ukuranBaca(perlu)}. Pakai --ke ke disk lain.`);
    }

    // Satu snapshot untuk hitungan baris dan kedua pg_dump; transaksi ini dibiarkan terbuka sampai dump selesai.
    await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const snapshot = (await c.query('SELECT pg_export_snapshot() s')).rows[0].s;
    const baris = {};
    for (const t of tabel) baris[t] = Number((await c.query(`SELECT count(*) n FROM "${t}"`)).rows[0].n);

    const { bin } = cariBin((v) => v === mayor, `versi ${mayor} (sama dengan server)`);
    const folder = path.join(o.ke, `kopkar-${db}-${cap()}`);
    fs.mkdirSync(folder);
    const dasar = ['--dbname', url, '--format=custom', '--compress=6', '--no-owner', '--no-privileges', `--snapshot=${snapshot}`];

    try {
        log(`pg_dump data -> ${folder}`);
        jalan(bin, 'pg_dump', [...dasar, ...media.flatMap((t) => [`--exclude-table-data=public.${t}`]), '--file', path.join(folder, 'data.dump')]);
        const berkas = [await potongDanHitung(path.join(folder, 'data.dump'), o.potongByte)];
        if (o.media && media.length) {
            log(`pg_dump media (${media.join(', ')})`);
            jalan(bin, 'pg_dump', [...dasar, '--data-only', ...media.flatMap((t) => ['--table', `public.${t}`]), '--file', path.join(folder, 'media.dump')]);
            berkas.push(await potongDanHitung(path.join(folder, 'media.dump'), o.potongByte));
        }

        const commit = spawnSync('git', ['-C', akarRepo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout?.trim() || null;
        const manifest = {
            format: 'kopkar-backup-1',
            dibuat: new Date().toISOString(),
            database: db,
            postgres: { versi: versiServer, mayor },
            commitAplikasi: commit,
            ukuranDatabase: ukuranDb,
            media: o.media ? media : [],
            tanpaMedia: !o.media,
            baris,
            berkas,
        };
        fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2));
        const total = berkas.reduce((t, b) => t + b.ukuran, 0);
        log(`Selesai: ${folder}`);
        for (const b of berkas) log(`  ${b.nama}: ${ukuranBaca(b.ukuran)} dalam ${b.potongan.length} berkas`);
        log(`  total ${ukuranBaca(total)}; ${Object.keys(baris).length} tabel. Pulihkan: npm run restore -- "${folder}"`);
    } catch (e) {
        fs.rmSync(folder, { recursive: true, force: true }); // jangan tinggalkan cadangan setengah jadi
        throw e;
    } finally {
        await c.query('COMMIT').catch(() => undefined);
        await c.end().catch(() => undefined);
    }
}

main().catch((e) => { console.error(`Gagal: ${e.message}`); process.exit(1); });
