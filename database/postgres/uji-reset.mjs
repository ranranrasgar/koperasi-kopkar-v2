// Buat ulang database uji sebagai salinan database utama, untuk mencoba alur transaksi lengkap tanpa menyentuh data asli.
//
//   npm run uji:reset                     sumber = PG_URL (env atau frontend/.env.local), tujuan = <nama sumber>_uji
//   PG_URL_UJI=postgres://.../nama_uji    tujuan lain (nama wajib berakhiran _uji)
//   KOPKAR_PG_BIN=C:/.../bin              folder pg_dump/pg_restore bila tidak ada di PATH atau di Laragon
//
// Sumber hanya dibaca (pg_dump), jadi server utama boleh tetap berjalan. Database uji dihapus paksa (memutus server uji).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import pg from 'pg';
import { cariBin as cariBinPg, jalan, namaDb, pgUrl } from './pg-alat.mjs';

const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s]`, ...a);
const gagal = (pesan) => { console.error(`Gagal: ${pesan}`); process.exit(1); };

/** URL database uji: PG_URL_UJI, atau sumber dengan nama database + '_uji'. */
export function urlUji(sumber) {
    if (process.env.PG_URL_UJI) return process.env.PG_URL_UJI;
    const u = new URL(sumber);
    u.pathname = `${u.pathname.replace(/^\//, '')}_uji`;
    return u.toString();
}

/** Folder bin PostgreSQL yang punya pg_dump dengan versi mayor sama dengan server. */
const cariBin = (mayor) => cariBinPg((v) => v === mayor, `versi ${mayor}`).bin;

const TABEL_CEK = ['anggota', 'simpanan', 'pinjaman_tunai', 'jurnal_umum', 'perkiraan', 'opr'];

async function hitung(url) {
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    const hasil = {};
    for (const t of TABEL_CEK) hasil[t] = Number((await c.query(`SELECT COUNT(*) AS n FROM ${t}`)).rows[0].n);
    await c.end();
    return hasil;
}

async function main() {
    const sumber = pgUrl();
    if (!sumber) gagal('PG_URL tidak diset dan tidak ada di frontend/.env.local');
    const tujuan = urlUji(sumber);
    const dbSumber = namaDb(sumber), dbUji = namaDb(tujuan);
    if (!dbUji.endsWith('_uji') || dbUji === dbSumber) gagal(`nama database uji harus berakhiran _uji dan berbeda dari sumber (dapat: ${dbUji})`);
    if (new URL(sumber).host !== new URL(tujuan).host) gagal('database uji harus di server PostgreSQL yang sama dengan sumber');

    const adminUrl = new URL(sumber);
    adminUrl.pathname = '/postgres';
    const admin = new pg.Client({ connectionString: adminUrl.toString() });
    await admin.connect();
    const mayor = Math.floor(Number((await admin.query('SHOW server_version_num')).rows[0].server_version_num) / 10000);
    const bin = cariBin(mayor);
    log(`Sumber ${dbSumber} -> uji ${dbUji} (PostgreSQL ${mayor}${bin ? `, ${bin}` : ''})`);

    log(`Hapus dan buat ulang ${dbUji}`);
    await admin.query(`DROP DATABASE IF EXISTS "${dbUji}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${dbUji}"`);
    await admin.end();

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kopkar-uji-'));
    const folderDump = path.join(tmp, 'dump');
    try {
        const paralel = String(Math.max(2, Math.min(8, os.cpus().length)));
        log(`pg_dump ${dbSumber} (hanya baca, ${paralel} proses)`);
        jalan(bin, 'pg_dump', ['--dbname', sumber, '--format=directory', '--jobs', paralel, '--no-owner', '--no-privileges', '--file', folderDump]);
        log(`pg_restore ke ${dbUji}`);
        jalan(bin, 'pg_restore', ['--dbname', tujuan, '--jobs', paralel, '--no-owner', '--no-privileges', '--exit-on-error', folderDump]);
    } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
    }

    log('Cocokkan jumlah baris');
    const [a, b] = await Promise.all([hitung(sumber), hitung(tujuan)]);
    let beda = 0;
    for (const t of TABEL_CEK) {
        const sama = a[t] === b[t];
        if (!sama) beda++;
        console.log(`  ${sama ? 'OK  ' : 'BEDA'} ${t.padEnd(16)} ${a[t]} / ${b[t]}`);
    }
    if (beda) gagal(`${beda} tabel berbeda jumlah barisnya (sumber berubah saat disalin?). Jalankan ulang.`);
    log(`Selesai. Jalankan server uji: npm run dev:uji (port 3101, database ${dbUji})`);
}

main().catch((e) => gagal(e.message));
