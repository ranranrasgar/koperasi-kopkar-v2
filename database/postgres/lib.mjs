// Pustaka bersama generate-schema.mjs dan migrate.mjs: membaca metadata MySQL dan menurunkan rencana tabel PostgreSQL.
import mariadb from 'mariadb';
import {
    SKIP_TABLES, RENAME_TABLE, DROP_COLUMNS, KEEP_LEGACY_ID, EXTRA_COLUMNS,
    RENAME_COLUMN, TRANSFORMS, FKS, COLUMN_COMMENTS,
} from './mapping.mjs';

// MySQL_URL default = Laragon (sama dengan src/lib/prisma.ts). Hanya SELECT yang dijalankan terhadap MySQL.
export function mysqlConfig(url = process.env.MYSQL_URL || 'mysql://root:@127.0.0.1:3306/kopkar_mjs_2000') {
    const u = new URL(url);
    return {
        host: u.hostname, port: Number(u.port || 3306),
        user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
        database: u.pathname.slice(1),
        dateStrings: true, bigIntAsNumber: true, decimalAsNumber: true, insertIdAsNumber: true,
    };
}

export async function connectMysql(url) {
    const conn = await mariadb.createConnection(mysqlConfig(url));
    await conn.query('SET SESSION TRANSACTION READ ONLY');
    return conn;
}

export async function readMeta(conn) {
    const cols = await conn.query(`SELECT TABLE_NAME t, COLUMN_NAME c, ORDINAL_POSITION o, DATA_TYPE dt, COLUMN_TYPE ct,
        IS_NULLABLE n, COLUMN_DEFAULT d, CHARACTER_MAXIMUM_LENGTH ml, EXTRA e
        FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION`);
    const idx = await conn.query(`SELECT TABLE_NAME t, INDEX_NAME i, NON_UNIQUE nu, SEQ_IN_INDEX s, COLUMN_NAME c
        FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`);
    return { cols, idx };
}

const RESERVED = new Set(['user', 'order', 'group', 'table', 'desc', 'asc', 'limit', 'offset', 'end', 'check', 'default', 'primary',
    'references', 'select', 'from', 'where', 'all', 'analyse', 'analyze', 'and', 'any', 'array', 'as', 'both', 'case', 'cast', 'collate',
    'column', 'constraint', 'create', 'distinct', 'do', 'else', 'except', 'fetch', 'for', 'foreign', 'grant', 'having', 'in', 'initially',
    'intersect', 'into', 'leading', 'not', 'null', 'only', 'or', 'placing', 'returning', 'some', 'symmetric', 'then', 'to', 'trailing',
    'union', 'unique', 'using', 'variadic', 'when', 'window', 'with']);
export const ident = (n) => (RESERVED.has(n) ? `"${n}"` : n);

export const newTableName = (legacy) => RENAME_TABLE[legacy] || legacy;

function kindOf(c) {
    const { dt, ct } = c;
    if (dt === 'enum') {
        const vals = (ct.match(/'([^']*)'/g) || []).map((s) => s.slice(1, -1));
        return vals.length === 2 && vals.every((v) => ['Y', 'N', 'T'].includes(v)) ? 'bool' : 'text';
    }
    if (dt === 'tinyint' && /^tinyint\(1\)/.test(ct)) return 'bool';
    if (['tinyint', 'smallint', 'mediumint', 'int'].includes(dt)) return /unsigned/.test(ct) ? 'bigint' : 'int';
    if (dt === 'bigint') return 'bigint';
    if (['double', 'float', 'decimal'].includes(dt)) return /persen|prosentase|bunga_kredit/i.test(c.c) ? 'pct' : 'money';
    if (dt === 'varchar' || dt === 'char') return 'varchar';
    if (['text', 'mediumtext', 'longtext', 'tinytext'].includes(dt)) return 'text';
    if (dt === 'date') return 'date';
    if (dt === 'datetime' || dt === 'timestamp') return 'datetime';
    if (dt === 'time') return 'time';
    if (['longblob', 'blob', 'mediumblob', 'tinyblob'].includes(dt)) return 'bytes';
    throw new Error(`Tipe kolom belum dipetakan: ${c.t}.${c.c} ${ct}`);
}

// Uang: DOUBLE di MySQL; 17 kolom berisi lebih dari 2 desimal (mis. simpanan.rp_setoran), jadi skala 4 agar saldo tidak bergeser.
const PG_TYPES = { bool: 'boolean', int: 'integer', bigint: 'bigint', money: 'numeric(20,4)', pct: 'numeric(12,6)', text: 'text', date: 'date', datetime: 'timestamp', time: 'time', bytes: 'bytea' };

function pgType(kind, c) {
    return kind === 'varchar' ? `varchar(${c.ml})` : PG_TYPES[kind];
}

function pgDefault(kind, c) {
    if (c.d === null || c.d === undefined) return null;
    if (/DEFAULT_GENERATED/.test(c.e || '') && /CURRENT_TIMESTAMP/i.test(c.d)) return 'now()';
    const d = String(c.d);
    if (kind === 'bool') {
        if (c.dt === 'enum') return d === 'Y' ? 'true' : 'false';
        return d === '0' ? 'false' : 'true';
    }
    if (['int', 'bigint', 'money', 'pct'].includes(kind)) return /^-?\d+(\.\d+)?$/.test(d) ? d : null;
    if (kind === 'varchar' || kind === 'text') return `'${d.replace(/'/g, "''")}'`;
    return null; // date/time/blob: default lama '0000-00-00' tidak dibawa
}

export function planTables(meta) {
    const byTable = new Map();
    for (const c of meta.cols) {
        if (!byTable.has(c.t)) byTable.set(c.t, []);
        byTable.get(c.t).push(c);
    }
    const plans = [];
    for (const [legacy, cols] of byTable) {
        if (SKIP_TABLES.includes(legacy)) continue;
        const name = newTableName(legacy);
        const drop = (DROP_COLUMNS[legacy] || []).map((x) => x.toLowerCase());
        const keepId = KEEP_LEGACY_ID.includes(legacy);
        const columns = [];
        const taken = new Set(['id']);
        for (const c of cols) {
            const lname = c.c.toLowerCase();
            if (drop.includes(lname)) continue;
            if (keepId && lname === 'id') continue; // jadi PK `id`
            const key = `${legacy}.${lname}`;
            const transform = TRANSFORMS[key] || null;
            const newName = RENAME_COLUMN[key] || lname;
            if (taken.has(newName)) throw new Error(`Nama kolom bentrok setelah huruf kecil: ${legacy}.${c.c}`);
            taken.add(newName);
            const kind = transform === 'hash-jawaban' ? 'varchar' : kindOf(c);
            columns.push({
                legacy: c.c, name: newName, kind, transform,
                pgType: transform === 'hash-jawaban' ? 'varchar(255)' : pgType(kind, c),
                notNull: c.n === 'NO' && !transform,
                default: transform ? null : pgDefault(kind, c),
            });
        }
        for (const e of EXTRA_COLUMNS[legacy] || []) {
            if (taken.has(e.name)) throw new Error(`Kolom tambahan bentrok: ${legacy}.${e.name}`);
            taken.add(e.name);
            columns.push({ legacy: null, name: e.name, kind: 'extra', pgType: e.type, notNull: false, default: null });
        }
        const fks = (FKS[legacy] || []).map((f) => {
            if (taken.has(f.col)) throw new Error(`Kolom FK bentrok: ${legacy}.${f.col}`);
            taken.add(f.col);
            return f;
        });

        // indeks unik lama (PRIMARY dan UNIQUE) menjadi UNIQUE; PRIMARY pada `id` yang dipertahankan tidak perlu
        const groups = new Map();
        for (const r of meta.idx) {
            if (r.t !== legacy || Number(r.nu) !== 0) continue;
            if (!groups.has(r.i)) groups.set(r.i, []);
            groups.get(r.i).push(r.c);
        }
        const uniques = [];
        const seen = new Set();
        const orderBy = [];
        for (const [iname, icols] of groups) {
            const lcols = icols.map((x) => x.toLowerCase());
            if (iname === 'PRIMARY') orderBy.push(...icols);
            if (keepId && lcols.length === 1 && lcols[0] === 'id') continue;
            const key = lcols.join(',');
            if (seen.has(key)) continue;
            seen.add(key);
            uniques.push(lcols.map((x) => RENAME_COLUMN[`${legacy}.${x}`] || x));
        }
        plans.push({ legacy, name, keepId, columns, fks, uniques, orderBy });
    }
    return plans;
}

export const commentFor = (table, col) => COLUMN_COMMENTS[`${table}.${col}`];
export { COLUMN_COMMENTS };
