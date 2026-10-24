// Pasang indeks dari schema.sql (bagian indexes) yang belum ada di database. Aman dijalankan ulang.
//
//   npm run indeks:pasang                  database dari PG_URL (lihat pg-alat.mjs)
//   npm run indeks:pasang -- --periksa     hanya laporkan indeks yang belum ada
//
// Untuk database yang dimigrasi sebelum indeks baru ditambahkan ke mapping.mjs (EXTRA_INDEXES): migrate.mjs hanya
// memasang indeks saat tabel dibuat. Hanya indeks biasa (bukan UNIQUE), jadi tidak bisa gagal karena data ganda.
// CREATE INDEX CONCURRENTLY: tabel tetap bisa dibaca dan ditulis selama indeks dibuat.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { pgUrl } from './pg-alat.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const PERIKSA = process.argv.includes('--periksa');

const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
const bagian = sql.split(/^-- @@ section: /m).find((b) => b.startsWith('indexes')) ?? '';
// `isi`: daftar kolom dan, untuk indeks parsial, klausa WHERE-nya.
const indeks = [...bagian.matchAll(/^CREATE INDEX (\w+) ON (\w+) (\(.+\)(?: WHERE .+)?);\s*$/gm)].map(([, nama, tabel, isi]) => ({ nama, tabel, isi }));

const db = new pg.Client({ connectionString: pgUrl() });
await db.connect();
const ada = new Set((await db.query(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`)).rows.map((r) => r.indexname));
const tabel = new Set((await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)).rows.map((r) => r.tablename));
const kurang = indeks.filter((i) => !ada.has(i.nama) && tabel.has(i.tabel));
console.log(`${db.database}: ${indeks.length} indeks di schema.sql, ${kurang.length} belum ada`);
for (const i of kurang) {
    if (PERIKSA) { console.log(`  belum ada: ${i.nama} ON ${i.tabel} ${i.isi}`); continue; }
    const t = Date.now();
    await db.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${i.nama} ON ${i.tabel} ${i.isi}`);
    console.log(`  dipasang: ${i.nama} (${Date.now() - t} ms)`);
}
if (!PERIKSA) for (const t of new Set(kurang.map((i) => i.tabel))) await db.query(`ANALYZE ${t}`);
await db.end();
