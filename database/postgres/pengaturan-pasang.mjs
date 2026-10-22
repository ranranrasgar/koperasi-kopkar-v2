// Pasang tabel pengaturan_web dan izin menu Mode Aplikasi untuk grup admin. Aman dijalankan ulang.
//
//   npm run pengaturan:pasang                 nilai awal mode_uji dari KOPKAR_UJI_ROLLBACK di frontend/.env.local (bawaan 0 = live)
//   npm run pengaturan:pasang -- --mode=uji   nilai awal mode uji (atau --mode=live); tidak mengubah nilai yang sudah ada
//   PG_URL=...                                database tujuan (bawaan: PG_URL di frontend/.env.local)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
// Harus sama dengan MENU.modeAplikasi di frontend/src/config/akses.ts.
const MENU_MODE = 'Mode Aplikasi (web)';
const GRUP_IZIN = ['admin'];

function envLokal() {
    try {
        return fs.readFileSync(path.join(here, '../../frontend/.env.local'), 'utf8');
    } catch {
        return '';
    }
}

async function main() {
    const env = envLokal();
    const url = process.env.PG_URL ?? env.match(/^PG_URL=(.*)$/m)?.[1]?.trim();
    if (!url) throw new Error('PG_URL tidak diset dan tidak ada di frontend/.env.local');
    const arg = process.argv.find((a) => a.startsWith('--mode='))?.slice(7);
    if (arg && arg !== 'uji' && arg !== 'live') throw new Error('--mode harus uji atau live');
    const awal = arg ? (arg === 'uji' ? '1' : '0') : (env.match(/^KOPKAR_UJI_ROLLBACK=(.*)$/m)?.[1]?.trim() === '1' ? '1' : '0');

    const c = new pg.Client({ connectionString: url });
    await c.connect();
    try {
        await c.query('BEGIN');
        await c.query(fs.readFileSync(path.join(here, 'pengaturan-web.sql'), 'utf8'));
        const r = await c.query(`INSERT INTO pengaturan_web (kunci, nilai, diubah_oleh) VALUES ('mode_uji', $1, 'pemasangan')
            ON CONFLICT (kunci) DO NOTHING RETURNING nilai`, [awal]);
        const mode = (await c.query("SELECT nilai FROM pengaturan_web WHERE kunci = 'mode_uji'")).rows[0].nilai;
        // Izin menu Mode Aplikasi untuk grup admin (superadmin selalu lolos). Pola sama dengan setAksesAction.
        const grup = (await c.query('SELECT id, urut, nama_grup FROM opr_grup WHERE nama_grup = ANY($1)', [GRUP_IZIN])).rows;
        for (const g of grup)
            await c.query(`INSERT INTO opr_hak_akses (urut, id_opr, menu, akses, grup_id) VALUES (nextval('seq_opr_hak_akses_urut'), $1, $2, 'T', $3)
                ON CONFLICT (grup_id, menu) DO UPDATE SET akses = 'T'`, [g.urut, MENU_MODE, g.id]);
        await c.query('COMMIT');
        const db = decodeURIComponent(new URL(url).pathname.slice(1));
        console.log(`${db}: mode ${mode === '1' ? 'UJI' : 'LIVE'}${r.rows[0] ? ' (baru dipasang)' : ' (sudah ada, tidak diubah)'}; izin "${MENU_MODE}" untuk grup: ${grup.map((g) => g.nama_grup).join(', ') || '-'}`);
    } catch (e) {
        await c.query('ROLLBACK');
        throw e;
    } finally {
        await c.end();
    }
}

main().catch((e) => { console.error(`Gagal: ${e.message}`); process.exit(1); });
