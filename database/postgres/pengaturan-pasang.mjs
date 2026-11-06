// Pasang tabel pengaturan_web, tabel periode Potongan Gaji, izin menu Mode Aplikasi untuk grup admin, dan izin menu sidebar yang dipecah. Aman dijalankan ulang.
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
// Menu sidebar yang dulu berbagi izin. Izin barunya diisi sekali dari izin lama supaya tidak ada grup yang kehilangan akses;
// setelah ada barisnya, isinya milik Kelola Hak Akses dan tidak disentuh lagi. Nama harus sama dengan MENU di frontend/src/config/akses.ts.
const IZIN_DETAIL_PINJAMAN = ['Lap. Pinjaman Koperasi', 'Pencairan Pinjaman Koperasi', 'Setoran Angsuran Pinjaman Koperasi', 'Lap. Tunggakan Pinjaman Koperasi',
    'Pengajuan Pinjaman', 'Lap. Pinjaman Bank / Pihak Lain', 'Pencairan Pinjaman Bank', 'Setoran Angsuran Pinjaman Bank', 'Lap. Tunggakan Bank / Pihak Lain'];
const PECAHAN_IZIN = {
    'Kartu Simpanan (web)': ['Lap. Buku Simpanan'],
    'Cari Pinjaman (web)': IZIN_DETAIL_PINJAMAN,
    'Setoran Titipan Escrow (web)': ['Setoran Titipan Angsuran Pinjaman'],
    'Generate & Posting Potongan (web)': ['Potongan Keseluruhan (Bank)'],
    'Jurnal Penyesuaian (web)': ['Jurnal Umum'],
    'Jurnal Bermasalah (web)': ['Jurnal Umum'],
    'Buku Besar Kas (web)': ['Buku Kas && Bank (Bank Book)'],
    'Neraca Lajur (web)': ['Neraca Saldo'],
    'Grade Anggota (web)': ['Jenis Pinjaman'],
    'Audit Data (web)': [MENU_MODE], // menu baru, bukan pecahan: awalnya sama dengan penerima Mode Aplikasi (grup admin)
    'Buku Pinjaman (web)': ['Lap. Pinjaman Koperasi', 'Lap. Pinjaman Bank / Pihak Lain', 'Lap. Pinjaman KPR'],
    'Aktivitas Pengguna (web)': [MENU_MODE], // menu baru: awalnya sama dengan Audit Data
    'Batal Transaksi (web)': [], // mengubah saldo: awalnya hanya superadmin, grup lain diberi lewat Kelola Hak Akses
};

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
        await c.query(fs.readFileSync(path.join(here, 'potongan-gaji.sql'), 'utf8')); // periode Potongan Gaji bulanan
        const r = await c.query(`INSERT INTO pengaturan_web (kunci, nilai, diubah_oleh) VALUES ('mode_uji', $1, 'pemasangan')
            ON CONFLICT (kunci) DO NOTHING RETURNING nilai`, [awal]);
        const mode = (await c.query("SELECT nilai FROM pengaturan_web WHERE kunci = 'mode_uji'")).rows[0].nilai;
        // Izin menu Mode Aplikasi untuk grup admin (superadmin selalu lolos). Pola sama dengan setAksesAction.
        const grup = (await c.query('SELECT id, urut, nama_grup FROM opr_grup WHERE nama_grup = ANY($1)', [GRUP_IZIN])).rows;
        for (const g of grup)
            await c.query(`INSERT INTO opr_hak_akses (urut, id_opr, menu, akses, grup_id) VALUES (nextval('seq_opr_hak_akses_urut'), $1, $2, 'T', $3)
                ON CONFLICT (grup_id, menu) DO UPDATE SET akses = 'T'`, [g.urut, MENU_MODE, g.id]);
        let pecahan = 0;
        for (const [menu, asal] of Object.entries(PECAHAN_IZIN))
            pecahan += (await c.query(`INSERT INTO opr_hak_akses (urut, id_opr, menu, akses, grup_id)
                SELECT nextval('seq_opr_hak_akses_urut'), g.urut, $1::varchar,
                       CASE WHEN EXISTS (SELECT 1 FROM opr_hak_akses h WHERE h.grup_id = g.id AND h.menu = ANY($2) AND h.akses = 'T') THEN 'T' ELSE 'F' END, g.id
                  FROM opr_grup g
                 WHERE g.nama_grup IS DISTINCT FROM 'superadmin' AND NOT EXISTS (SELECT 1 FROM opr_hak_akses WHERE menu = $1)`, [menu, asal])).rowCount;
        await c.query('COMMIT');
        const db = decodeURIComponent(new URL(url).pathname.slice(1));
        console.log(`${db}: mode ${mode === '1' ? 'UJI' : 'LIVE'}${r.rows[0] ? ' (baru dipasang)' : ' (sudah ada, tidak diubah)'}; izin "${MENU_MODE}" untuk grup: ${grup.map((g) => g.nama_grup).join(', ') || '-'}; izin menu sidebar baru: ${pecahan} baris`);
    } catch (e) {
        await c.query('ROLLBACK');
        throw e;
    } finally {
        await c.end();
    }
}

main().catch((e) => { console.error(`Gagal: ${e.message}`); process.exit(1); });
