// Membuat schema.sql dari metadata MySQL + mapping.mjs.
//   node database/postgres/generate-schema.mjs            (MYSQL_URL opsional, default Laragon)
// schema.sql di-commit supaya bisa dibaca dan ditinjau; jalankan ulang bila mapping.mjs berubah.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectMysql, readMeta, planTables, ident, commentFor } from './lib.mjs';
import { EXTRA_INDEXES, UNIQUE_WHEN_SET, SKIP_TABLES } from './mapping.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const conn = await connectMysql();
const meta = await readMeta(conn);
await conn.end();
const plans = planTables(meta);

const name63 = (s) => (s.length > 63 ? s.slice(0, 55) + '_' + Math.abs(hash(s)).toString(36).slice(0, 7) : s);
function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; }
const q = (s) => s.replace(/'/g, "''");
const colList = (cols) => cols.map((c) => (c.includes('(') ? c : ident(c))).join(', ');

const tables = [];
const indexes = [];
const fks = [];
const required = [];

for (const p of plans) {
    const lines = ['    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY'];
    for (const c of p.columns) {
        lines.push(`    ${ident(c.name)} ${c.pgType}${c.notNull ? ' NOT NULL' : ''}${c.default ? ` DEFAULT ${c.default}` : ''}`);
    }
    for (const f of p.fks) lines.push(`    ${f.col} bigint`);
    tables.push(`CREATE TABLE ${p.name} (\n${lines.join(',\n')}\n);`);
    tables.push(`COMMENT ON TABLE ${p.name} IS 'Legacy MySQL: ${p.legacy}${p.keepId ? " (id lama dipertahankan)" : ''}';`);
    for (const c of p.columns) {
        const cm = commentFor(p.name, c.name);
        if (cm) tables.push(`COMMENT ON COLUMN ${p.name}.${ident(c.name)} IS '${q(cm)}';`);
    }
    tables.push('');

    for (const u of p.uniques) indexes.push(`CREATE UNIQUE INDEX ${name63(`uq_${p.name}_${u.join('_')}`)} ON ${p.name} (${colList(u)});`);
    for (const f of p.fks) {
        indexes.push(`CREATE INDEX ${name63(`ix_${p.name}_${f.col}`)} ON ${p.name} (${f.col});`);
        fks.push(`ALTER TABLE ${p.name} ADD CONSTRAINT ${name63(`fk_${p.name}_${f.col}`)} FOREIGN KEY (${f.col}) REFERENCES ${f.ref} (id) ON DELETE ${f.onDelete};`);
        if (f.required) required.push(`${p.name}.${f.col}`);
    }
}
const names = new Set(plans.map((p) => p.name));
for (const [t, cols, parsial] of EXTRA_INDEXES) {
    if (!names.has(t)) throw new Error(`EXTRA_INDEXES: tabel ${t} tidak ada`);
    const label = cols.map((c) => c.replace(/[^a-z0-9_]/gi, '')).join('_') + (parsial ? `_${parsial.nama}` : '');
    indexes.push(`CREATE INDEX ${name63(`ix_${t}_${label}`)} ON ${t} (${colList(cols)})${parsial ? ` WHERE ${parsial.where}` : ''};`);
}
const parents = new Set();
for (const p of plans) for (const f of p.fks) { if (!names.has(f.ref)) throw new Error(`FK ${p.name}.${f.col}: tabel induk ${f.ref} tidak ada`); parents.add(f.ref); }

const optionalUnique = UNIQUE_WHEN_SET.map(([t, c]) => {
    const cols = Array.isArray(c) ? c : [c];
    const where = cols.length === 1 ? ` WHERE ${cols[0]} IS NOT NULL` : '';
    return `CREATE UNIQUE INDEX ${name63(`uq_${t}_${cols.join('_')}`)} ON ${t} (${cols.join(', ')})${where};`;
});

const out = [
    '-- Skema PostgreSQL Koperasi Kopkar Mattel MJS 2000',
    '-- DIBUAT OTOMATIS oleh generate-schema.mjs dari MySQL kopkar_mjs_2000 + mapping.mjs. Jangan diedit tangan; ubah mapping.mjs lalu jalankan ulang.',
    `-- ${plans.length} tabel dibawa; ${SKIP_TABLES.length} tabel sengaja tidak dibawa (lihat README.md).`,
    '-- Kolom lama dibiarkan apa adanya (huruf kecil); kolom baru: id (PK) dan <induk>_id (FK).',
    '',
    '-- @@ section: tables',
    ...tables,
    'CREATE TABLE migration_report (',
    '    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,',
    '    step text NOT NULL,',
    '    item text NOT NULL,',
    '    detail jsonb,',
    '    created_at timestamptz NOT NULL DEFAULT now()',
    ');',
    "COMMENT ON TABLE migration_report IS 'Hasil setiap proses migrasi: jumlah baris per tabel, baris yatim per relasi, analisis, dan verifikasi terhadap MySQL.';",
    '',
    '-- @@ section: indexes',
    ...indexes,
    '',
    '-- @@ section: foreign_keys',
    '-- Kolom berikut dijadikan NOT NULL oleh migrate.mjs hanya bila tidak ada baris yatim:',
    ...required.map((r) => `--   ${r}`),
    ...fks,
    '',
    '-- @@ section: optional_unique',
    '-- Dicoba satu per satu. Gagal berarti ada duplikat data yang perlu dibereskan (dicatat di migration_report).',
    ...optionalUnique,
    '',
];
fs.writeFileSync(path.join(here, 'schema.sql'), out.join('\n'));
console.log(`schema.sql: ${plans.length} tabel, ${indexes.length} indeks, ${fks.length} foreign key, ${required.length} FK wajib`);
