// Migrasi MySQL (kopkar_mjs_2000) -> PostgreSQL. Aman diulang: MySQL hanya dibaca (SELECT), PostgreSQL dibuat ulang dengan --reset.
//
//   PG_URL=postgres://user:pass@host:5432/kopkar node database/postgres/migrate.mjs [--reset] [--skip-derive]
//   MYSQL_URL=mysql://user:pass@host:3306/kopkar_mjs_2000   (opsional; default Laragon)
//
// Urutan: tabel -> muat data -> analisis -> isi kolom *_id -> indeks -> turunkan sumber jurnal -> FK -> NOT NULL -> unik opsional -> verifikasi.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { connectMysql, readMeta, planTables, ident } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const SKIP_DERIVE = args.includes('--skip-derive');
const PG_URL = process.env.PG_URL;
if (!PG_URL) {
    console.error('Set PG_URL, contoh: PG_URL=postgres://postgres@127.0.0.1:5432/kopkar node database/postgres/migrate.mjs --reset');
    process.exit(2);
}

const scrypt = promisify(crypto.scrypt);
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(0).padStart(4)}s]`, ...a);

// ---------- schema.sql per bagian ----------
function readSections() {
    const text = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
    const out = {};
    let cur = null;
    for (const line of text.split('\n')) {
        const m = line.match(/^-- @@ section: (\w+)/);
        if (m) { cur = m[1]; out[cur] = []; continue; }
        if (cur) out[cur].push(line);
    }
    return out;
}
const statements = (lines) => lines.join('\n').split(/;\s*(?:\n|$)/).map((s) => s.replace(/^(\s*--.*\n)+/g, '').trim()).filter(Boolean);

// ---------- koneksi ----------
const pgc = new pg.Client({ connectionString: PG_URL });
await pgc.connect();
const my = await connectMysql();
const meta = await readMeta(my);
const plans = planTables(meta);
const tableNames = plans.map((p) => p.name);
const sections = readSections();

const q = (sql, params) => pgc.query(sql, params);
const one = async (sql, params) => (await q(sql, params)).rows[0];

async function note(step, item, detail) {
    await q('INSERT INTO migration_report (step, item, detail) VALUES ($1, $2, $3)', [step, item, detail === undefined ? null : JSON.stringify(detail)]);
}

// ---------- 0. siapkan database ----------
const existing = await one(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1)`,
    [[...tableNames, 'migration_report']]);
if (existing.n > 0) {
    if (!RESET) {
        console.error(`Database tujuan sudah berisi ${existing.n} tabel hasil migrasi. Jalankan dengan --reset untuk membuat ulang (hanya tabel migrasi yang dihapus).`);
        process.exit(3);
    }
    log(`--reset: menghapus ${existing.n} tabel migrasi lama`);
    for (const t of [...tableNames, 'migration_report']) await q(`DROP TABLE IF EXISTS ${t} CASCADE`);
}
log(`membuat ${plans.length} tabel`);
await q(sections.tables.join('\n'));

// ---------- 1. konversi nilai ----------
const ZERO_DATE = /^0000-|-00(?:-|$| )/;
function conv(col, v) {
    if (v === null || v === undefined) return null;
    switch (col.kind) {
        case 'bool':
            if (typeof v === 'boolean') return v;
            if (typeof v === 'number') return v !== 0;
            return String(v) === 'Y';
        case 'money': case 'pct': case 'int': case 'bigint':
            return typeof v === 'number' ? v : Number(v);
        case 'varchar': case 'text':
            return String(v).replace(/\u0000/g, '');
        case 'date': case 'datetime':
            return ZERO_DATE.test(String(v)) ? null : String(v);
        case 'time':
            return String(v);
        case 'bytes':
            return v;
        default:
            return v;
    }
}
async function hashJawaban(v) {
    const norm = String(v ?? '').trim().toLowerCase();
    if (!norm) return null;
    const salt = crypto.randomBytes(16);
    const hash = await scrypt(norm, salt, 32, { N: 16384, r: 8, p: 1 });
    return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

// ---------- 2. muat data ----------
async function loadTable(p) {
    const cols = p.columns.filter((c) => c.legacy);
    const selectCols = [...(p.keepId ? ['id'] : []), ...cols.map((c) => c.legacy)].map((c) => `\`${c}\``).join(', ');
    const order = p.orderBy.length ? ` ORDER BY ${p.orderBy.map((c) => `\`${c}\``).join(', ')}` : '';
    const insCols = [...(p.keepId ? ['id'] : []), ...cols.map((c) => ident(c.name))];
    const perBatch = Math.max(1, Math.min(1000, Math.floor(60000 / insCols.length)));
    const sqlHead = `INSERT INTO ${p.name} (${insCols.join(', ')})${p.keepId ? ' OVERRIDING SYSTEM VALUE' : ''} VALUES `;
    const hashCol = cols.find((c) => c.transform === 'hash-jawaban');
    // simpanan.coa_kas dipindah apa adanya; koreksi nilai negatif dilakukan lewat kas_perkiraan_id (lihat mapping.mjs)

    let batch = [];
    let total = 0;
    const flush = async () => {
        if (!batch.length) return;
        const hashed = hashCol ? await Promise.all(batch.map((r) => hashJawaban(r[hashCol.legacy]))) : null;
        const vals = [];
        const ph = [];
        batch.forEach((raw, i) => {
            const row = [];
            if (p.keepId) row.push(raw.id);
            for (const c of cols) row.push(c === hashCol ? hashed[i] : conv(c, raw[c.legacy]));
            const start = vals.length;
            vals.push(...row);
            ph.push('(' + row.map((_, k) => '$' + (start + k + 1)).join(',') + ')');
        });
        await q(sqlHead + ph.join(','), vals);
        total += batch.length;
        batch = [];
    };
    await q('BEGIN');
    try {
        const stream = my.queryStream(`SELECT ${selectCols} FROM \`${p.legacy}\`${order}`);
        for await (const row of stream) {
            batch.push(row);
            if (batch.length >= perBatch) await flush();
        }
        await flush();
        await q('COMMIT');
    } catch (e) {
        await q('ROLLBACK');
        throw new Error(`Gagal memuat ${p.legacy}: ${e.message}`);
    }
    if (p.keepId) await q(`SELECT setval(pg_get_serial_sequence('${p.name}', 'id'), (SELECT COALESCE(MAX(id), 0) FROM ${p.name}) + 1, false)`);
    const [{ n }] = await my.query(`SELECT COUNT(*) n FROM \`${p.legacy}\``);
    await note('muat', p.name, { mysql: Number(n), postgres: total });
    log(`muat ${p.legacy.padEnd(30)} ${String(total).padStart(8)} baris${Number(n) !== total ? `  (MySQL ${n}!)` : ''}`);
    return total;
}
for (const p of plans) await loadTable(p);

// ---------- 3. analisis data (tidak ada baris yang diubah atau dipindah) ----------
// kpr_rincian_tagih berisi jadwal untuk nomor pinjaman yang ternyata milik pinjaman_tunai, dengan isi berbeda dari jadwal pinjaman tunai itu.
// Itu bukan salah tabel atau duplikat, jadi tidak digabung; dibiarkan tanpa induk (kpr_id NULL) sampai ada keputusan.
async function analyze() {
    const r = await one(`SELECT count(*)::int baris, count(DISTINCT t.no_pinjaman)::int nomor,
            count(*) FILTER (WHERE x.id IS NOT NULL)::int punya_jadwal_sama_di_pinjaman_tunai
        FROM kpr_rincian_tagih t
        LEFT JOIN pinjaman_tunai_rincian_tagih x ON x.no_pinjaman = t.no_pinjaman AND x.angsuran_ke = t.angsuran_ke
        WHERE EXISTS (SELECT 1 FROM pinjaman_tunai p WHERE p.no_pinjaman = t.no_pinjaman)
          AND NOT EXISTS (SELECT 1 FROM kpr k WHERE k.no_pinjaman = t.no_pinjaman)`);
    await note('analisis', 'kpr_rincian_tagih bentrok dengan nomor pinjaman_tunai', r);
    log(`analisis: ${r.baris} jadwal KPR tanpa induk memakai ${r.nomor} nomor milik pinjaman_tunai (${r.punya_jadwal_sama_di_pinjaman_tunai} angsuran_ke bertabrakan); tidak digabung`);
}
await analyze();

// ---------- 4. isi kolom *_id ----------
const EMPTY = (expr) => `(${expr})::text NOT IN ('', '0', '-')`;
async function fkStat(p, f) {
    const from = f.fromExpr || `c.${ident(f.from)}`;
    // syarat untuk menghitung "yatim": sumber terisi (bukan kosong/0/-) dan syarat tambahan yang tidak memakai tabel induk
    const ow = f.orphanWhere ?? (f.where && !/p\./.test(f.where) ? f.where : null);
    const owSql = ow ? ` AND ${ow}` : '';
    return one(`SELECT count(*)::int total,
            count(*) FILTER (WHERE ${EMPTY(from)}${owSql})::int terisi_sumber,
            count(${f.col})::int terpetakan,
            count(*) FILTER (WHERE ${EMPTY(from)}${owSql} AND ${f.col} IS NULL)::int yatim
        FROM ${p.name} c`);
}
async function fillFks() {
    for (const p of plans) {
        for (const f of p.fks) {
            const from = f.fromExpr || `c.${ident(f.from)}`;
            const cond = f.ci
                ? `lower(btrim(${from})) = lower(btrim(p.${ident(f.to)}))`
                : `${from} = p.${ident(f.to)}`;
            const extra = f.where ? ` AND ${f.where}` : '';
            await q(`UPDATE ${p.name} c SET ${f.col} = p.id FROM ${f.ref} p WHERE ${EMPTY(from)} AND ${cond}${extra}`);
            const st = await fkStat(p, f);
            await note('fk', `${p.name}.${f.col}`, { ref: f.ref, ...st, tidak_wajib_cocok: !!f.expectMiss });
            log(`fk   ${`${p.name}.${f.col}`.padEnd(46)} terpetakan ${String(st.terpetakan).padStart(7)}  yatim ${st.yatim}`);
        }
    }
}
await fillFks();

// Keputusan 22 Oktober 2026: data milik kode anggota yang tidak ada di tabel anggota (atau kode kosong) dihapus:
// simpanan, pinjaman tunai berkode "true", KPR 2507-6108 (lunas), pengajuan, anggota_detail, dan akun aplikasi tanpa anggota.
// Hanya di PostgreSQL; MySQL dan dump tidak berubah. Jurnal tidak ikut dihapus.
// Pengaman: bila SALAH SATU tabel melebihi batasnya (tanda pemetaan salah), tidak ada yang dihapus.
const planByName = new Map(plans.map((x) => [x.name, x]));
const delCount = {}; // tabel PostgreSQL -> jumlah baris dihapus
const delSum = {};   // 'tabel|kolom' -> jumlah kolom uang pada baris yang dihapus
const REDACT = ['password_hash', 'jawaban_hash', 'fcm_token', 'logo'];
const DEL_SPECS = [
    // [tabel, where, batas, anak yang ikut dihapus lebih dulu: [tabel, kolom induk]]
    ['simpanan', 'anggota_id IS NULL', 200, []],
    ['pinjaman_tunai', 'anggota_id IS NULL', 5, [['pinjaman_tunai_rincian', 'pinjaman_tunai_id'], ['pinjaman_tunai_rincian_tagih', 'pinjaman_tunai_id'], ['pinjaman_tunai_titipan', 'pinjaman_tunai_id']]],
    ['kpr', 'anggota_id IS NULL', 5, [['kpr_rincian', 'kpr_id'], ['kpr_rincian_tagih', 'kpr_id']]],
    ['pengajuan_pinjaman', 'anggota_id IS NULL', 50, []],
    ['anggota_detail', 'anggota_id IS NULL', 100, []],
    ['app_user', 'anggota_id IS NULL AND karyawan_mattel_id IS NULL', 5, []],
];
async function removeRows(table, where, label, extra = {}) {
    const p = planByName.get(table);
    const money = p.columns.filter((c) => c.kind === 'money').map((c) => c.name);
    const agg = await one(`SELECT count(*)::int n${money.map((c) => `, COALESCE(SUM(${c}), 0)::float8 AS "${c}"`).join('')} FROM ${table} WHERE ${where}`);
    if (agg.n === 0) return;
    const redact = REDACT.map((k) => `- '${k}'`).join(' ');
    const rows = (await q(`SELECT to_jsonb(t) ${redact} AS r FROM ${table} t WHERE ${where} ORDER BY t.id`)).rows.map((r) => r.r);
    const sums = Object.fromEntries(money.map((c) => [c, agg[c]]));
    await note('keputusan', label, { tabel: table, baris: agg.n, jumlah_uang: sums, ...extra, daftar: rows });
    await q(`DELETE FROM ${table} WHERE ${where}`);
    delCount[table] = (delCount[table] || 0) + agg.n;
    for (const c of money) delSum[`${table}|${c}`] = (delSum[`${table}|${c}`] || 0) + agg[c];
    log(`hapus ${table.padEnd(30)} ${String(agg.n).padStart(5)} baris (${label})`);
}
async function dropOrphans() {
    for (const [table, where, max] of DEL_SPECS) {
        const { n } = await one(`SELECT count(*)::int n FROM ${table} WHERE ${where}`);
        if (n > max) {
            await note('keputusan', 'penghapusan baris yatim DIBATALKAN: melebihi batas pengaman', { tabel: table, baris: n, batas: max });
            log(`PENGHAPUSAN DIBATALKAN: ${table} punya ${n} baris yatim (batas ${max}); tidak ada yang dihapus`);
            return;
        }
    }
    const label = 'yatim dihapus (keputusan 22 Okt 2026)';
    for (const [table, where, , children] of DEL_SPECS) {
        for (const [child, col] of children) {
            await removeRows(child, `${col} IN (SELECT id FROM ${table} WHERE ${where})`, `${label}: anak dari ${table}`);
        }
        await removeRows(table, where, label);
    }
    // catatan FK dibuat sebelum penghapusan; hitung ulang agar ringkasan akhir tidak menampilkan baris yang sudah dihapus
    for (const p of plans) {
        if (!delCount[p.name]) continue;
        for (const f of p.fks) {
            const st = await fkStat(p, f);
            await q(`UPDATE migration_report SET detail = detail || $1::jsonb WHERE step = 'fk' AND item = $2`, [JSON.stringify({ ...st, dihapus: delCount[p.name] }), `${p.name}.${f.col}`]);
        }
    }
}
await dropOrphans();

// ---------- 5. indeks ----------
const indexStmts = statements(sections.indexes);
const deferred = indexStmts.filter((s) => /sumber_tipe/.test(s));
log(`membuat ${indexStmts.length - deferred.length} indeks`);
for (const s of indexStmts) if (!deferred.includes(s)) await q(s);

// ---------- 6. turunkan sumber jurnal ----------
async function deriveJurnal() {
    const sources = [
        ['pinjaman_tunai', 'no_pinjaman', 'pinjaman_tunai'],
        ['kpr', 'no_pinjaman', 'kpr'],
        ['simpanan', 'no_bukti', 'simpanan'],
        ['pinjaman_tunai_rincian', 'no_bukti', 'pinjaman_tunai_rincian'],
        ['kpr_rincian', 'no_bukti', 'kpr_rincian'],
        ['temp_shu_backup', 'no_reff', 'shu'],
        ['kas', 'no_bukti', 'kas'],
    ];
    for (const [table, col, tipe] of sources) {
        const r = await q(`UPDATE jurnal_umum j SET sumber_tipe = $1, sumber_id = s.id FROM ${table} s
            WHERE j.sumber_tipe IS NULL AND s.${col} <> '' AND s.${col} <> '-' AND j.nomor_bukti = s.${col}`, [tipe]);
        log(`jurnal -> ${tipe.padEnd(24)} ${r.rowCount} baris`);
    }
    const dist = (await q(`SELECT COALESCE(sumber_tipe, '(tanpa sumber)') tipe, count(*)::int baris, count(DISTINCT nomor_bukti)::int bukti FROM jurnal_umum GROUP BY 1 ORDER BY 2 DESC`)).rows;
    await note('jurnal', 'sumber_tipe', dist);
    for (const d of dist) log(`  jurnal ${d.tipe.padEnd(24)} ${String(d.baris).padStart(8)} baris, ${d.bukti} bukti`);
    // arah sebaliknya: dokumen tanpa jurnal
    const rev = {};
    for (const [table, col] of [['simpanan', 'no_bukti'], ['pinjaman_tunai_rincian', 'no_bukti'], ['kpr_rincian', 'no_bukti'], ['pinjaman_tunai', 'no_pinjaman']]) {
        rev[table] = (await one(`SELECT count(*)::int n FROM ${table} s WHERE NOT EXISTS (SELECT 1 FROM jurnal_umum j WHERE j.nomor_bukti = s.${col})`)).n;
    }
    await note('jurnal', 'dokumen_tanpa_jurnal', rev);
    log('  dokumen tanpa jurnal:', JSON.stringify(rev));
}
if (SKIP_DERIVE) log('turunkan sumber jurnal: dilewati (--skip-derive)');
else await deriveJurnal();
for (const s of deferred) await q(s);

// ---------- 7. foreign key + NOT NULL ----------
const fkStmts = statements(sections.foreign_keys).filter((s) => /^ALTER TABLE/i.test(s));
log(`memasang ${fkStmts.length} foreign key`);
for (const s of fkStmts) await q(s);
for (const p of plans) {
    for (const f of p.fks.filter((x) => x.required)) {
        const { n } = await one(`SELECT count(*)::int n FROM ${p.name} WHERE ${f.col} IS NULL`);
        if (n === 0) await q(`ALTER TABLE ${p.name} ALTER COLUMN ${f.col} SET NOT NULL`);
        else {
            await note('wajib', `${p.name}.${f.col}`, { baris_null: n, status: 'tetap boleh NULL sampai baris yatim dibereskan' });
            log(`WAJIB belum bisa: ${p.name}.${f.col} masih ${n} baris NULL`);
        }
    }
}

// ---------- 8. unik opsional ----------
for (const s of statements(sections.optional_unique)) {
    try { await q(s); }
    catch (e) {
        await note('unik', s.slice(0, 120), { gagal: e.message });
        log(`UNIK gagal (ada duplikat): ${s.match(/INDEX (\w+)/)?.[1]} - ${e.message}`);
    }
}
await q('ANALYZE');

// ---------- 9. verifikasi terhadap MySQL ----------
async function verify() {
    log('verifikasi MySQL vs PostgreSQL');
    let bad = 0;
    for (const p of plans) {
        const [{ n }] = await my.query(`SELECT COUNT(*) n FROM \`${p.legacy}\``);
        const pgN = (await one(`SELECT count(*)::int n FROM ${p.name}`)).n;
        const expected = Number(n) - (delCount[p.name] || 0);
        if (pgN !== expected) { bad++; log(`  BEDA jumlah ${p.legacy}: MySQL ${n} (diharapkan ${expected}) vs PostgreSQL ${pgN}`); }
    }
    const sums = [
        ['simpanan', 'SUM(rp_setoran)', 'SUM(rp_setoran)'], ['simpanan', 'SUM(rp_pengambilan)', 'SUM(rp_pengambilan)'],
        ['pinjaman_tunai_rincian', 'SUM(kredit_pokok)', 'SUM(KREDIT_POKOK)'], ['pinjaman_tunai_rincian', 'SUM(debit_pokok)', 'SUM(DEBIT_POKOK)'],
        ['pinjaman_tunai_rincian', 'SUM(kredit_bunga)', 'SUM(KREDIT_BUNGA)'], ['pinjaman_tunai_rincian', 'SUM(debit_bunga)', 'SUM(DEBIT_BUNGA)'],
        ['kpr_rincian', 'SUM(debit_pokok)', 'SUM(DEBIT_POKOK)'], ['kpr_rincian', 'SUM(kredit_pokok)', 'SUM(KREDIT_POKOK)'],
        ['jurnal_umum', 'SUM(debit_jurnalumum)', 'SUM(debit_jurnalumum)'], ['jurnal_umum', 'SUM(kredit_jurnalumum)', 'SUM(kredit_jurnalumum)'],
        ['kas', 'SUM(rp_debet)', 'SUM(rp_debet)'], ['kas', 'SUM(rp_kredit)', 'SUM(rp_kredit)'],
        ['pinjaman_tunai', 'SUM(rp_pinjaman_pokok)', 'SUM(RP_PINJAMAN_POKOK)'], ['temp_shu_backup', 'SUM(rp_pencairan)', 'SUM(rp_pencairan)'],
    ];
    const rows = [];
    for (const [t, pgExpr, myExpr] of sums) {
        const [m] = await my.query(`SELECT COALESCE(${myExpr}, 0) v FROM \`${t}\``);
        const pv = await one(`SELECT COALESCE(${pgExpr}, 0)::float8 v FROM ${t}`);
        const adj = delSum[`${t}|${(pgExpr.match(/\((\w+)\)/) || [])[1]}`] || 0;
        const diff = Math.abs(Number(m.v) - adj - pv.v);
        rows.push({ item: `${t}.${pgExpr}`, mysql: Number(m.v), postgres: pv.v, selisih: diff });
        if (diff > 1) { bad++; log(`  BEDA total ${t}.${pgExpr}: MySQL ${m.v} vs PostgreSQL ${pv.v} (selisih ${diff})`); }
    }
    await note('verifikasi', 'total', rows);
    const maxDiff = Math.max(...rows.map((r) => r.selisih));
    log(`  ${rows.length} total dibandingkan; selisih terbesar Rp ${maxDiff.toFixed(4)}`);
    // pemeriksaan tipe dan rahasia
    const checks = [];
    const [mAktif] = await my.query(`SELECT SUM(AKTIF = 'Y') y, SUM(AKTIF = 'T') t FROM anggota`);
    const pAktif = await one(`SELECT count(*) FILTER (WHERE aktif)::int y, count(*) FILTER (WHERE NOT aktif)::int t FROM anggota`);
    checks.push(['anggota.aktif Y/T', `${mAktif.y}/${mAktif.t}`, `${pAktif.y}/${pAktif.t}`]);
    // akun tanpa anggota maupun karyawan Mattel sengaja dihapus (keputusan 22 Okt 2026), jadi tidak dihitung
    const [mJaw] = await my.query(`SELECT COUNT(*) n FROM \`user\` u WHERE u.jawaban IS NOT NULL AND TRIM(u.jawaban) <> ''
        AND (u.KODE_AGT IN (SELECT KODE_AGT FROM anggota) OR u.KODE_AGT IN (SELECT nik FROM karyawan_mattel))`);
    const pJaw = await one(`SELECT count(*)::int n FROM app_user WHERE jawaban_hash LIKE 'scrypt$%'`);
    checks.push(['app_user jawaban di-hash', String(mJaw.n), String(pJaw.n)]);
    const pPlain = await one(`SELECT count(*)::int n FROM opr WHERE password_hash IS NOT NULL`);
    checks.push(['opr.password_hash terisi (harus 0)', '0', String(pPlain.n)]);
    const [mNeg] = await my.query(`SELECT COUNT(*) n FROM simpanan WHERE coa_kas < 0`);
    const pNeg = await one(`SELECT count(*) FILTER (WHERE coa_kas < 0 AND kas_perkiraan_id IS NOT NULL)::int n FROM simpanan`);
    checks.push(['simpanan coa_kas negatif terkoreksi', String(mNeg.n), String(pNeg.n)]);
    for (const [item, mysql, postgres] of checks) {
        if (mysql !== postgres) { bad++; log(`  BEDA ${item}: MySQL ${mysql} vs PostgreSQL ${postgres}`); }
    }
    await note('verifikasi', 'tipe_dan_rahasia', checks.map(([item, mysql, postgres]) => ({ item, mysql, postgres })));
    log(`  ${checks.length} pemeriksaan tipe dan rahasia selesai`);
    // karakter rusak (mojibake) pada kolom teks utama
    const moji = await one(`SELECT count(*)::int n FROM anggota WHERE nama ~ '[ÃÂ]' OR alamat ~ '[ÃÂ]' OR nama LIKE '%' || chr(65533) || '%'`);
    await note('verifikasi', 'karakter_rusak_anggota', moji);
    if (moji.n > 0) log(`  PERIKSA: ${moji.n} anggota dengan karakter mencurigakan di nama/alamat`);
    return bad;
}
const bad = await verify();

const orphans = (await q(`SELECT item, detail->>'yatim' yatim FROM migration_report WHERE step = 'fk' AND (detail->>'yatim')::int > 0 AND NOT COALESCE((detail->>'tidak_wajib_cocok')::boolean, false) ORDER BY (detail->>'yatim')::int DESC`)).rows;
log(orphans.length ? `baris yatim yang tersisa (lihat migration_report):` : 'tidak ada baris yatim');
for (const o of orphans) log(`  ${o.item.padEnd(46)} ${o.yatim}`);
log(bad === 0 ? 'SELESAI: jumlah dan total cocok dengan MySQL.' : `SELESAI dengan ${bad} perbedaan; periksa log di atas.`);

await my.end();
await pgc.end();
process.exitCode = bad === 0 ? 0 : 1;
