import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import { createPool } from '../src/db.js';
import { createServer } from '../src/server.js';

// Bentuk respons (nama kunci dan tipe) harus sama dengan mobile-api-shapes.json, yaitu apa yang dibaca Android.
const expected = JSON.parse(fs.readFileSync(new URL('../../database/contract/mobile-api-shapes.json', import.meta.url), 'utf8'));
const BELUM_ADA = new Set<string>(); // endpoint baca yang belum diimplementasikan

const shape = (v: unknown): unknown => v === null ? 'null' : Array.isArray(v) ? (v.length ? [shape(v[0])] : [])
    : typeof v === 'object' ? Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, shape(x)])) : typeof v;

const pool = createPool();
const server = createServer(pool);
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
test.after(() => { server.close(); return pool.end(); });

const get = async (p: string) => (await fetch(base + p)).json() as Promise<any>;

// anggota dengan pinjaman aktif; getpinjaman sendiri yang menentukan "aktif"
const pick = async () => {
    const c = (await pool.query(`SELECT DISTINCT a.kode_agt FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id
        WHERE p.jml_cicilan < p.lama_angsuran AND p.lama_angsuran > 1 ORDER BY 1 DESC LIMIT 30`)).rows;
    for (const { kode_agt } of c) {
        const pj = (await get(`/v1/Api.php?apicall=getpinjaman&kdAnggota=${kode_agt}`)).pinjaman;
        if (pj?.length) return { kd: kode_agt as string, no: pj[0].no_pinjaman as string };
    }
    throw new Error('tidak ada anggota dengan pinjaman aktif');
};

test('bentuk JSON semua endpoint baca = kontrak Android', async () => {
    const { kd, no } = await pick();
    const A = '/v1/Api.php?apicall=';
    const paths: Record<string, string> = {
        getanggota: `${A}getanggota`,
        getpertanyaan: `${A}getpertanyaan`,
        isuserexist: `${A}isuserexist&username=tidakada_xyz`,
        getsimpanan: `${A}getsimpanan&kdAnggota=${kd}`,
        getsimpananrincipaginated: `${A}getsimpananrincipaginated&kdAnggota=${kd}&jenisSimpanan=03&offset=0&limit=3`,
        getSaldoJenisPinjaman: `${A}getSaldoJenisPinjaman&kdAnggota=${kd}`,
        getpinjaman: `${A}getpinjaman&kdAnggota=${kd}`,
        getpinjamanrincipaginated: `${A}getpinjamanrincipaginated&noPinjaman=${no}&offset=0&limit=3`,
        getjadwalangsuran: `${A}getjadwalangsuran&noPinjaman=${no}`,
        getjeniskreditv1: `${A}getjeniskreditv1&statusStaff=Staff`,
        getpotonganbulanan: `${A}getpotonganbulanan&kdAnggota=${kd}`,
        isterdebet: `${A}isterdebet&kdAnggota=${kd}`,
        getshu: `${A}getshu&kdAnggota=${kd}&tahun=2025`,
        gettahunshu: `${A}gettahunshu`,
        getlognotifikasi: `${A}getlognotifikasi&kdAnggota=${kd}&offset=0&limit=3`,
        gethistory: `${A}gethistory&kdAnggota=${kd}&offset=0&limit=3`,
        'dashboard.php': `/v1/dashboard.php?kdAnggota=${kd}`,
    };
    const beda: string[] = [];
    let diperiksa = 0;
    for (const name of Object.keys(expected).filter((k) => !k.startsWith('_') && !BELUM_ADA.has(k))) {
        const got = shape(await get(paths[name]));
        diperiksa++;
        if (JSON.stringify(got) !== JSON.stringify(expected[name])) beda.push(`${name}\n  diharapkan ${JSON.stringify(expected[name]).slice(0, 400)}\n  didapat    ${JSON.stringify(got).slice(0, 400)}`);
    }
    for (const b of beda) console.log('BEDA', b);
    console.log(`kontrak: ${diperiksa} endpoint diperiksa, ${beda.length} beda`);
    assert.equal(beda.length, 0);
});

test('nama apicall tidak peka huruf besar-kecil; parameter wajib dan apicall tak dikenal ditolak seperti server lama', async () => {
    const a = await get('/v1/Api.php?apicall=getSaldoJenisPinjaman&kdAnggota=x');
    const b = await get('/v1/Api.php?apicall=getsaldojenispinjaman&kdAnggota=x');
    assert.deepEqual(a, b);
    assert.deepEqual(await get('/v1/Api.php?apicall=getsimpanan'), { error: true, message: 'Parameter kdAnggota tidak valid/tidak ditemukan' });
    assert.deepEqual(await get('/v1/Api.php?apicall=xyz'), { error: true, message: "API call 'xyz' tidak dikenali" });
    assert.deepEqual(await get('/v1/Api.php'), { error: true, message: 'Invalid API Call' });
});

test('data sama dengan database: saldo simpanan per jenis', async () => {
    const { kd } = await pick();
    const api = (await get(`/v1/Api.php?apicall=getsimpanan&kdAnggota=${kd}`)).simpanan as { jenis_simpanan: string; total: number }[];
    const db = (await pool.query(`SELECT js.kode_simpanan j, SUM(s.rp_setoran - s.rp_pengambilan) t FROM simpanan s JOIN anggota a ON a.id = s.anggota_id
        JOIN jenis_simpanan js ON js.id = s.jenis_simpanan_id WHERE a.kode_agt = $1 GROUP BY 1`, [kd])).rows;
    assert.equal(api.length, db.length);
    for (const r of db) assert.equal(api.find((x) => x.jenis_simpanan === r.j)!.total, r.t);
});
