// PG_URL=... node database/postgres/apply-sequences.mjs
import pg from 'pg';
import { readFileSync } from 'node:fs';
const c = new pg.Client({ connectionString: process.env.PG_URL });
await c.connect();
await c.query(readFileSync(new URL('./sequences.sql', import.meta.url), 'utf8'));
for (const s of ['seq_simpanan_urut', 'seq_jurnal_urutan', 'seq_jurnal_urut', 'seq_pinjaman_rincian_urut', 'seq_pinjaman_tagih_urut', 'seq_pinjaman_no', 'seq_kpr_no', 'seq_kpr_rincian_urut'])
    console.log(s, (await c.query(`select last_value, is_called from ${s}`)).rows[0]);
await c.end();
