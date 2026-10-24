// Pasang tabel SHU per tahun (shu_tahun, shu_anggota) dan impor SHU dari temp_shu_backup desktop. Aman dijalankan ulang.
//
//   npm run shu:pasang           database tujuan: PG_URL di frontend/.env.local (atau variabel lingkungan PG_URL)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    let env = '';
    try { env = fs.readFileSync(path.join(here, '../../frontend/.env.local'), 'utf8'); } catch { /* tidak ada */ }
    const url = process.env.PG_URL ?? env.match(/^PG_URL=(.*)$/m)?.[1]?.trim();
    if (!url) throw new Error('PG_URL tidak diset dan tidak ada di frontend/.env.local');
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    try {
        await c.query('BEGIN');
        await c.query(fs.readFileSync(path.join(here, 'shu-web.sql'), 'utf8'));
        const r = (await c.query(`SELECT t.tahun, t.status, COUNT(a.*) anggota, COUNT(*) FILTER (WHERE a.status = 1) cair, ROUND(t.rp_shu_anggota) kolam
            FROM shu_tahun t LEFT JOIN shu_anggota a ON a.tahun = t.tahun GROUP BY t.tahun ORDER BY t.tahun`)).rows;
        await c.query('COMMIT');
        console.log(`${decodeURIComponent(new URL(url).pathname.slice(1))}: tabel SHU terpasang.`);
        for (const x of r) console.log(`  ${x.tahun} (${x.status}): ${x.anggota} anggota, ${x.cair} dicairkan, kolam ${x.kolam}`);
    } catch (e) {
        await c.query('ROLLBACK');
        throw e;
    } finally {
        await c.end();
    }
}

main().catch((e) => { console.error(`Gagal: ${e.message}`); process.exit(1); });
