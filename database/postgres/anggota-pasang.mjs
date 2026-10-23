// Pasang tabel khusus PWA anggota (anggota-web.sql). Aman dijalankan ulang; hanya menambah tabel yang belum ada.
//
//   npm run anggota:pasang        database dari PG_URL di anggota/.env.local
//   PG_URL=... npm run anggota:pasang
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));

function envLokal() {
    try {
        return fs.readFileSync(path.join(here, '../../anggota/.env.local'), 'utf8');
    } catch {
        return '';
    }
}

async function main() {
    const url = process.env.PG_URL ?? envLokal().match(/^PG_URL=(.*)$/m)?.[1]?.trim();
    if (!url) throw new Error('PG_URL tidak diset dan tidak ada di anggota/.env.local');
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    try {
        await c.query(fs.readFileSync(path.join(here, 'anggota-web.sql'), 'utf8'));
        const db = decodeURIComponent(new URL(url).pathname.slice(1));
        const n = (await c.query('SELECT count(*) FROM app_user_foto')).rows[0].count;
        console.log(`${db}: tabel app_user_foto siap (${n} foto).`);
    } finally {
        await c.end();
    }
}

main().catch((e) => { console.error(`Gagal: ${e.message}`); process.exit(1); });
