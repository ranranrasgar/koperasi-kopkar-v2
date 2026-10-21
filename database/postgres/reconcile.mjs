// Rekonsiliasi saldo MySQL vs PostgreSQL: query lama (kunci teks) dibandingkan dengan query baru (kolom *_id).
//   PG_URL=postgres://... node database/postgres/reconcile.mjs
// Yang dibandingkan: saldo simpanan per anggota per jenis, dan saldo pinjaman tunai / KPR per nomor pinjaman (dari tabel rincian).
// Hanya data milik anggota yang ada: baris yatim yang sengaja dihapus di PostgreSQL (keputusan 22 Okt 2026) tidak dibandingkan.
// Selisih di atas toleransi (default Rp 0,01) dicetak. MySQL hanya dibaca.
import pg from 'pg';
import { connectMysql } from './lib.mjs';

const TOL = Number(process.env.TOLERANCE || 0.01);
if (!process.env.PG_URL) { console.error('Set PG_URL'); process.exit(2); }
const pgc = new pg.Client({ connectionString: process.env.PG_URL });
await pgc.connect();
const my = await connectMysql();

const toMap = (rows, key) => new Map(rows.map((r) => [key(r), Number(r.v)]));

async function compare(label, mysqlRows, pgRows, keyFn) {
    const a = toMap(mysqlRows, keyFn);
    const b = toMap(pgRows, keyFn);
    const diffs = [];
    let onlyMy = 0, onlyPg = 0, same = 0;
    for (const [k, v] of a) {
        if (!b.has(k)) { onlyMy++; if (Math.abs(v) > TOL) diffs.push([k, v, null]); continue; }
        if (Math.abs(v - b.get(k)) > TOL) diffs.push([k, v, b.get(k)]); else same++;
    }
    for (const [k, v] of b) if (!a.has(k)) { onlyPg++; if (Math.abs(v) > TOL) diffs.push([k, null, v]); }
    console.log(`${label}: ${a.size} kunci MySQL, ${b.size} kunci PostgreSQL, ${same} sama, ${diffs.length} selisih (> Rp ${TOL}); hanya di MySQL ${onlyMy}, hanya di PostgreSQL ${onlyPg}`);
    for (const d of diffs.slice(0, 10)) console.log(`   ${d[0]}  MySQL=${d[1]}  PostgreSQL=${d[2]}`);
    return diffs.length;
}

let bad = 0;

// 1. saldo simpanan per anggota per jenis (baris tanpa anggota di PostgreSQL = yatim, tidak ikut)
bad += await compare('Simpanan per anggota/jenis',
    await my.query(`SELECT s.kode_agt k, s.jenis_simpanan j, SUM(s.rp_setoran - s.rp_pengambilan) v
        FROM simpanan s INNER JOIN anggota a ON a.KODE_AGT = s.kode_agt GROUP BY s.kode_agt, s.jenis_simpanan`),
    (await pgc.query(`SELECT a.kode_agt k, j.kode_simpanan j, SUM(s.rp_setoran - s.rp_pengambilan)::float8 v
        FROM simpanan s JOIN anggota a ON a.id = s.anggota_id JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id GROUP BY 1, 2`)).rows,
    (r) => `${r.k}|${r.j}`);

// 2. saldo pinjaman tunai per nomor pinjaman (kredit - debit pada rincian)
bad += await compare('Pinjaman tunai per nomor',
    await my.query(`SELECT NO_PINJAMAN k, SUM(KREDIT_POKOK + KREDIT_BUNGA - DEBIT_POKOK - DEBIT_BUNGA) v
        FROM pinjaman_tunai_rincian WHERE NO_PINJAMAN IN (SELECT pt.NO_PINJAMAN FROM pinjaman_tunai pt INNER JOIN anggota a ON a.KODE_AGT = pt.KODE_AGT) GROUP BY NO_PINJAMAN`),
    (await pgc.query(`SELECT p.no_pinjaman k, SUM(r.kredit_pokok + r.kredit_bunga - r.debit_pokok - r.debit_bunga)::float8 v
        FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai p ON p.id = r.pinjaman_tunai_id GROUP BY p.no_pinjaman`)).rows,
    (r) => r.k);

// 3. saldo KPR per nomor pinjaman
bad += await compare('KPR per nomor',
    await my.query(`SELECT NO_PINJAMAN k, SUM(KREDIT_POKOK + KREDIT_BUNGA - DEBIT_POKOK - DEBIT_BUNGA) v
        FROM kpr_rincian WHERE NO_PINJAMAN IN (SELECT k.NO_PINJAMAN FROM kpr k INNER JOIN anggota a ON a.KODE_AGT = k.KODE_AGT) GROUP BY NO_PINJAMAN`),
    (await pgc.query(`SELECT p.no_pinjaman k, SUM(r.kredit_pokok + r.kredit_bunga - r.debit_pokok - r.debit_bunga)::float8 v
        FROM kpr_rincian r JOIN kpr p ON p.id = r.kpr_id GROUP BY p.no_pinjaman`)).rows,
    (r) => r.k);

// 4. SHU per anggota per tahun buku
bad += await compare('SHU (sukarela+jasa uang+jasa barang) per anggota/tahun',
    await my.query(`SELECT t.kode_agt k, YEAR(t.tgl_tutup_buku) y, SUM(t.rp_sukarela + t.rp_jasa_uang + t.rp_jasa_barang) v
        FROM temp_shu_backup t INNER JOIN anggota a ON a.KODE_AGT = t.kode_agt GROUP BY t.kode_agt, YEAR(t.tgl_tutup_buku)`),
    (await pgc.query(`SELECT a.kode_agt k, EXTRACT(YEAR FROM t.tgl_tutup_buku)::int y, SUM(t.rp_sukarela + t.rp_jasa_uang + t.rp_jasa_barang)::float8 v
        FROM temp_shu_backup t JOIN anggota a ON a.id = t.anggota_id GROUP BY 1, 2`)).rows,
    (r) => `${r.k}|${r.y}`);

await my.end();
await pgc.end();
console.log(bad === 0 ? 'REKONSILIASI OK: saldo query lama dan query baru sama.' : `REKONSILIASI: ${bad} selisih; periksa daftar di atas.`);
process.exitCode = bad === 0 ? 0 : 1;
