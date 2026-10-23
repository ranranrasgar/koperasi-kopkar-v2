// Pulihkan cadangan dari backup.mjs (data + media) ke database PostgreSQL, mis. di VPS.
//
//   npm run restore -- <folder-cadangan> --periksa                 hanya periksa kelengkapan dan SHA-256 tiap potongan
//   npm run restore -- <folder-cadangan>                           ke PG_URL (env/.env.local); database tujuan harus kosong/belum ada
//   npm run restore -- <folder> --timpa --yakin <nama_db>          timpa database yang sudah berisi (ketik ulang namanya)
//   npm run restore -- <folder> --timpa --yakin <nama_db> --langsung
//                                                                  hapus database lama DULU lalu pulihkan (bila ruang disk tidak cukup)
//   npm run restore -- <folder> --tanpa-media                      pulihkan data saja; tabel media kosong
//   PG_URL=postgres://.../nama npm run restore -- <folder>         tujuan lain
//
// Urutan aman (bawaan): semua potongan diperiksa -> dipulihkan ke database sementara <nama>_pulih -> jumlah baris
// dicocokkan dengan manifest -> baru database lama dihapus dan database sementara diganti namanya. Bila gagal di
// tengah jalan, database lama tidak tersentuh. Butuh ruang disk kira-kira sebesar database asli.
//
// Supaya file besar tidak gagal dipulihkan: tiap potongan diperiksa SHA-256-nya sebelum apa pun diubah, potongan
// digabung ke satu berkas sementara di folder cadangan (pg_restore tidak bisa membaca format custom dari pipa di Windows;
// berkas utuh juga bisa dipulihkan paralel) lalu dihapus, versi PostgreSQL tujuan dicek (harus sama atau lebih baru dari
// sumber), dan ruang disk dicek untuk berkas gabungan maupun folder data server bila servernya di komputer ini.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { cariBin, jalan, namaDb, pgUrl, ruangKosong, ukuranBaca, urlAdmin } from './pg-alat.mjs';

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s]`, ...a);

function opsi() {
    const a = process.argv.slice(2);
    const nilai = (nama) => { const i = a.indexOf(nama); return i >= 0 ? a[i + 1] : undefined; };
    const folder = a.find((x, i) => !x.startsWith('--') && !['--yakin'].includes(a[i - 1]));
    if (!folder) throw new Error('sebutkan folder cadangan: npm run restore -- <folder>');
    return {
        folder: path.resolve(folder), periksa: a.includes('--periksa'), timpa: a.includes('--timpa'), yakin: nilai('--yakin'),
        langsung: a.includes('--langsung'), media: !a.includes('--tanpa-media'),
    };
}

/** Periksa tiap potongan (ada, ukuran, SHA-256) dan SHA-256 keseluruhan berkas. Mengembalikan daftar path potongan. */
async function periksaBerkas(folder, b) {
    const semua = crypto.createHash('sha256');
    const jalur = [];
    for (const p of b.potongan) {
        const f = path.join(folder, p.nama);
        if (!fs.existsSync(f)) throw new Error(`potongan ${p.nama} tidak ada di ${folder}`);
        const uk = fs.statSync(f).size;
        if (uk !== p.ukuran) throw new Error(`${p.nama} berukuran ${uk} byte, seharusnya ${p.ukuran} (salinan tidak lengkap?)`);
        const h = crypto.createHash('sha256');
        for await (const x of fs.createReadStream(f, { highWaterMark: 1 << 20 })) { h.update(x); semua.update(x); }
        if (h.digest('hex') !== p.sha256) throw new Error(`${p.nama}: SHA-256 tidak cocok (berkas rusak saat disalin/diunggah)`);
        jalur.push(f);
    }
    if (semua.digest('hex') !== b.sha256) throw new Error(`${b.nama}: SHA-256 keseluruhan tidak cocok (urutan potongan salah?)`);
    return jalur;
}

/** Gabungkan potongan menjadi satu berkas (bila lebih dari satu). Mengembalikan path berkas dan apakah sementara. */
async function gabungkan(folder, b, jalur) {
    if (jalur.length === 1) return { berkas: jalur[0], sementara: false };
    const kosong = ruangKosong(folder);
    if (kosong !== null && kosong < b.ukuran + 50 * 1024 * 1024) {
        throw new Error(`ruang kosong di ${folder} hanya ${ukuranBaca(kosong)}; perlu ${ukuranBaca(b.ukuran)} untuk menggabung ${b.nama}`);
    }
    const berkas = path.join(folder, `${b.nama}.gabungan`);
    const tulis = fs.createWriteStream(berkas);
    for (const f of jalur) {
        for await (const x of fs.createReadStream(f, { highWaterMark: 1 << 20 })) {
            if (!tulis.write(x)) await new Promise((r) => tulis.once('drain', r));
        }
    }
    await new Promise((r, j) => tulis.end((e) => (e ? j(e) : r())));
    if (fs.statSync(berkas).size !== b.ukuran) throw new Error(`hasil gabungan ${b.nama} tidak sama ukurannya dengan manifest`);
    return { berkas, sementara: true };
}

async function pakaiAdmin(url, fn) {
    const c = new pg.Client({ connectionString: urlAdmin(url) });
    await c.connect();
    try { return await fn(c); } finally { await c.end(); }
}

async function hitungBaris(url, tabel) {
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    const hasil = {};
    try {
        for (const t of tabel) hasil[t] = Number((await c.query(`SELECT count(*) n FROM "${t}"`)).rows[0].n);
    } finally { await c.end(); }
    return hasil;
}

async function main() {
    const o = opsi();
    const mf = path.join(o.folder, 'manifest.json');
    if (!fs.existsSync(mf)) throw new Error(`manifest.json tidak ada di ${o.folder}`);
    const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
    if (m.format !== 'kopkar-backup-1') throw new Error(`format cadangan tidak dikenal: ${m.format}`);
    log(`Cadangan ${m.database} (${m.dibuat}), PostgreSQL ${m.postgres.versi}, commit ${m.commitAplikasi ?? '-'}, ukuran asli ${ukuranBaca(m.ukuranDatabase)}`);

    const data = m.berkas.find((b) => b.nama === 'data.dump');
    const media = m.berkas.find((b) => b.nama === 'media.dump');
    if (!data) throw new Error('data.dump tidak tercatat di manifest');
    log('Periksa potongan dan SHA-256');
    const jalurData = await periksaBerkas(o.folder, data);
    const jalurMedia = media && o.media ? await periksaBerkas(o.folder, media) : null;
    for (const b of [data, ...(jalurMedia ? [media] : [])]) log(`  OK ${b.nama}: ${ukuranBaca(b.ukuran)}, ${b.potongan.length} potongan`);
    if (o.periksa) { log('Cadangan lengkap dan utuh. Tidak ada yang diubah (--periksa).'); return; }

    const url = pgUrl();
    if (!url) throw new Error('PG_URL tidak diset dan tidak ada di frontend/.env.local atau anggota/.env.local');
    const tujuan = namaDb(url);
    const sementara = `${tujuan}_pulih`;
    const urlSementara = (() => { const u = new URL(url); u.pathname = `/${sementara}`; return u.toString(); })();

    // Versi: server tujuan harus sama atau lebih baru dari sumber; pg_restore memakai versi server tujuan.
    const { mayor, ada, berisi, dataDir } = await pakaiAdmin(url, async (c) => {
        const mayor = Math.floor(Number((await c.query('SHOW server_version_num')).rows[0].server_version_num) / 10000);
        const ada = (await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [tujuan])).rowCount > 0;
        const dataDir = (await c.query('SHOW data_directory').catch(() => ({ rows: [] }))).rows[0]?.data_directory ?? null;
        let berisi = false;
        if (ada) {
            const t = new pg.Client({ connectionString: url });
            await t.connect();
            berisi = Number((await t.query("SELECT count(*) n FROM pg_tables WHERE schemaname = 'public'")).rows[0].n) > 0;
            await t.end();
        }
        return { mayor, ada, berisi, dataDir };
    });
    if (mayor < m.postgres.mayor) throw new Error(`PostgreSQL tujuan versi ${mayor} lebih lama dari sumber ${m.postgres.mayor}; pasang PostgreSQL ${m.postgres.mayor} atau lebih baru`);
    const { bin } = cariBin((v) => v === mayor, `versi ${mayor} (sama dengan server tujuan)`);

    if (berisi && !o.timpa) throw new Error(`database ${tujuan} sudah berisi tabel. Untuk menimpa: --timpa --yakin ${tujuan}`);
    if (berisi && o.yakin !== tujuan) throw new Error(`untuk menimpa, ketik ulang nama database: --yakin ${tujuan}`);

    // Ruang disk server (bila servernya di komputer ini dan folder datanya terbaca).
    const kosong = dataDir && fs.existsSync(dataDir) ? ruangKosong(dataDir) : null;
    const perlu = Math.round(m.ukuranDatabase * 1.15);
    const lewatSementara = !(berisi && o.langsung);
    if (kosong !== null) {
        log(`Ruang kosong di folder data PostgreSQL: ${ukuranBaca(kosong)}, perlu sekitar ${ukuranBaca(perlu)}`);
        if (kosong < perlu) {
            if (berisi && !o.langsung) throw new Error(`ruang disk tidak cukup untuk memulihkan ke database sementara dulu. Kosongkan disk, atau tambahkan --langsung (database ${tujuan} dihapus lebih dulu)`);
            if (!berisi) throw new Error('ruang disk tidak cukup untuk memulihkan database ini');
        }
    } else {
        log('Ruang disk server tidak bisa dibaca dari sini (server di komputer lain); pastikan cukup sekitar ' + ukuranBaca(perlu));
    }

    // Gabungkan potongan lebih dulu, sebelum database apa pun diubah.
    const gabungData = await gabungkan(o.folder, data, jalurData);
    const gabungMedia = jalurMedia ? await gabungkan(o.folder, media, jalurMedia) : null;
    const hapusGabungan = () => { for (const g of [gabungData, gabungMedia]) if (g?.sementara) fs.rmSync(g.berkas, { force: true }); };

    const target = lewatSementara && berisi ? sementara : tujuan;
    const urlTarget = target === tujuan ? url : urlSementara;
    await pakaiAdmin(url, async (c) => {
        if (target === sementara) await c.query(`DROP DATABASE IF EXISTS "${sementara}" WITH (FORCE)`);
        if (target === tujuan && berisi) { log(`--langsung: hapus database ${tujuan}`); await c.query(`DROP DATABASE "${tujuan}" WITH (FORCE)`); }
        if (target === tujuan && ada && !berisi) await c.query(`DROP DATABASE "${tujuan}" WITH (FORCE)`); // kosong: buat ulang bersih
        await c.query(`CREATE DATABASE "${target}"`);
    });

    try {
        // Bagian skema, data, media, lalu indeks/constraint terakhir: FK ke tabel media baru dipasang setelah media masuk.
        const paralel = String(Math.max(2, Math.min(8, os.cpus().length)));
        const pulihkan = (berkas, args, nama) => {
            jalan(bin, 'pg_restore', ['--dbname', urlTarget, '--no-owner', '--no-privileges', '--exit-on-error', ...args, '--jobs', paralel, berkas]);
            log(`  selesai: ${nama}`);
        };
        log(`Pulihkan ke ${target}`);
        pulihkan(gabungData.berkas, ['--section=pre-data'], 'skema');
        pulihkan(gabungData.berkas, ['--section=data'], 'data');
        if (gabungMedia) pulihkan(gabungMedia.berkas, ['--data-only'], 'media');
        pulihkan(gabungData.berkas, ['--section=post-data'], 'indeks dan constraint');

        log('Cocokkan jumlah baris dengan manifest');
        const tabel = Object.keys(m.baris);
        const n = await hitungBaris(urlTarget, tabel);
        const lewati = new Set(jalurMedia ? [] : (m.media ?? []));
        const beda = tabel.filter((t) => !lewati.has(t) && n[t] !== m.baris[t]);
        for (const t of beda) console.log(`  BEDA ${t}: ${n[t]} / manifest ${m.baris[t]}`);
        if (beda.length) throw new Error(`${beda.length} tabel berbeda jumlah barisnya`);
        log(`  OK ${tabel.length - lewati.size} tabel sama persis${lewati.size ? ` (media dilewati: ${[...lewati].join(', ')})` : ''}`);

        if (target === sementara) {
            await pakaiAdmin(url, async (c) => {
                log(`Ganti ${tujuan} dengan hasil pemulihan`);
                await c.query(`DROP DATABASE "${tujuan}" WITH (FORCE)`);
                await c.query(`ALTER DATABASE "${sementara}" RENAME TO "${tujuan}"`);
            });
        }
    } catch (e) {
        hapusGabungan();
        if (target === sementara) {
            await pakaiAdmin(url, (c) => c.query(`DROP DATABASE IF EXISTS "${sementara}" WITH (FORCE)`)).catch(() => undefined);
            throw new Error(`${e.message}. Database ${tujuan} tidak diubah.`);
        }
        throw new Error(`${e.message}. Database ${tujuan} mungkin setengah terisi; ulangi restore dengan --timpa --yakin ${tujuan}.`);
    }

    hapusGabungan();
    log(`Selesai: ${tujuan} dipulihkan dari cadangan ${m.dibuat}.`);
    log('Berikutnya: jalankan "npm run anggota:pasang" bila kode aplikasi lebih baru dari cadangan, lalu jalankan ulang aplikasi admin dan anggota.');
}

main().catch((e) => { console.error(`Gagal: ${e.message}`); process.exit(1); });
