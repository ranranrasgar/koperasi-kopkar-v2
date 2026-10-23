// Pasang tabel khusus PWA anggota (anggota-web.sql). Aman dijalankan ulang.
//
//   npm run anggota:pasang                  database dari PG_URL di anggota/.env.local
//   npm run anggota:pasang -- --periksa     hanya laporkan FK yang hilang dan baris yatim, tanpa mengubah apa pun
//   PG_URL=... npm run anggota:pasang
//
// Selain membuat tabel/kolom yang belum ada, skrip ini memasang ulang foreign key ke tabel hasil migrasi (app_user,
// anggota, opr). FK itu hilang bila migrasi ulang (migrate.mjs --reset) membuat ulang tabel induk: DROP ... CASCADE
// ikut membuang FK dari tabel web, sedangkan CREATE TABLE IF NOT EXISTS tidak memasangnya lagi. Sebelum FK dipasang,
// baris yatim (menunjuk baris induk yang sudah tidak ada) dibereskan mengikuti aturan FK-nya:
//   ON DELETE CASCADE  -> baris yatim dihapus (memang akan terhapus bila FK ada)
//   ON DELETE SET NULL -> kolomnya diisi NULL
//   tanpa ON DELETE    -> tidak disentuh; bila ada baris yatim, FK itu tidak dipasang dan dilaporkan
// Semua perubahan dalam satu transaksi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const PERIKSA = process.argv.includes('--periksa');

function envLokal() {
    try {
        return fs.readFileSync(path.join(here, '../../anggota/.env.local'), 'utf8');
    } catch {
        return '';
    }
}

/** FK yang dideklarasikan di anggota-web.sql (kolom "... REFERENCES induk(kolom) [ON DELETE ...]" di CREATE TABLE). */
export function daftarFk(sql) {
    const fk = [];
    for (const [, tabel, isi] of sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\);/g)) {
        for (const baris of isi.split('\n')) {
            const m = baris.match(/^\s*(\w+)\s[^,]*?REFERENCES (\w+)\((\w+)\)(?: ON DELETE (CASCADE|SET NULL))?/);
            if (m) fk.push({ tabel, kolom: m[1], induk: m[2], kolomInduk: m[3], aturan: m[4] ?? null, nama: `fk_${tabel}_${m[1]}` });
        }
    }
    return fk;
}

const adaFk = async (c, f) => (await c.query(
    `SELECT 1 FROM pg_constraint k JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
      WHERE k.contype = 'f' AND k.conrelid = $1::regclass AND k.confrelid = $2::regclass AND a.attname = $3 AND array_length(k.conkey, 1) = 1`,
    [f.tabel, f.induk, f.kolom])).rowCount > 0;

const syaratYatim = (f) => `t.${f.kolom} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ${f.induk} i WHERE i.${f.kolomInduk} = t.${f.kolom})`;
const hitungYatim = async (c, f) => Number((await c.query(`SELECT count(*) n FROM ${f.tabel} t WHERE ${syaratYatim(f)}`)).rows[0].n);

async function main() {
    const url = process.env.PG_URL ?? envLokal().match(/^PG_URL=(.*)$/m)?.[1]?.trim();
    if (!url) throw new Error('PG_URL tidak diset dan tidak ada di anggota/.env.local');
    const db = decodeURIComponent(new URL(url).pathname.slice(1));
    const sql = fs.readFileSync(path.join(here, 'anggota-web.sql'), 'utf8');
    const semuaFk = daftarFk(sql);
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    try {
        await c.query('BEGIN');
        if (!PERIKSA) await c.query(sql);
        const laporan = [];
        let gagal = 0;
        for (const f of semuaFk) {
            if (!(await c.query('SELECT to_regclass($1) t', [f.tabel])).rows[0].t) { laporan.push(`  ${f.nama}: tabel ${f.tabel} belum ada`); continue; }
            if (await adaFk(c, f)) continue;
            const yatim = await hitungYatim(c, f);
            const ket = `${f.tabel}.${f.kolom} -> ${f.induk}(${f.kolomInduk}) ${f.aturan ? `ON DELETE ${f.aturan}` : 'tanpa ON DELETE'}`;
            if (PERIKSA) {
                const tindakan = !yatim ? 'tanpa baris yatim' : f.aturan === 'CASCADE' ? `${yatim} baris yatim akan dihapus`
                    : f.aturan === 'SET NULL' ? `${yatim} baris yatim akan diisi NULL` : `${yatim} baris yatim, FK TIDAK akan dipasang`;
                laporan.push(`  hilang: ${ket}; ${tindakan}`);
                continue;
            }
            if (yatim && !f.aturan) {
                gagal++;
                laporan.push(`  TIDAK dipasang: ${ket}; ${yatim} baris yatim (tidak dihapus, periksa manual)`);
                continue;
            }
            let beres = '';
            if (yatim && f.aturan === 'CASCADE') {
                beres = `, ${(await c.query(`DELETE FROM ${f.tabel} t WHERE ${syaratYatim(f)}`)).rowCount} baris yatim dihapus`;
            } else if (yatim && f.aturan === 'SET NULL') {
                beres = `, ${(await c.query(`UPDATE ${f.tabel} t SET ${f.kolom} = NULL WHERE ${syaratYatim(f)}`)).rowCount} baris yatim diisi NULL`;
            }
            await c.query(`ALTER TABLE ${f.tabel} ADD CONSTRAINT ${f.nama} FOREIGN KEY (${f.kolom}) REFERENCES ${f.induk}(${f.kolomInduk})${f.aturan ? ` ON DELETE ${f.aturan}` : ''}`);
            laporan.push(`  dipasang: ${ket}${beres}`);
        }
        await c.query(PERIKSA ? 'ROLLBACK' : 'COMMIT');
        console.log(`${db}: ${PERIKSA ? 'PERIKSA, tidak ada yang diubah' : 'tabel web siap'}; ${semuaFk.length} FK dideklarasikan, `
            + (laporan.length ? `${laporan.length} ${PERIKSA ? 'hilang' : 'ditangani'}:` : 'semua sudah terpasang.'));
        for (const l of laporan) console.log(l);
        if (gagal) process.exitCode = 2;
    } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        throw e;
    } finally {
        await c.end();
    }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    main().catch((e) => { console.error(`Gagal: ${e.message}`); process.exit(1); });
}
