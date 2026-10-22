import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.js';
import { toUnits } from '../src/posting/money.js';
import { cairkanKpr, bayarAngsuranKpr } from '../src/posting/kpr.js';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

test('paritas: jurnal angsuran KPR (akun titipan dan jumlah) = produksi', async () => {
    const rows = (await pool.query(`SELECT r.no_bukti, r.debit_pokok, k2.kode_perkiraan titipan
        FROM kpr_rincian r JOIN kpr k ON k.id = r.kpr_id JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id JOIN perkiraan k2 ON k2.id = jk.coa_kredit_id
        WHERE r.angsuran_ke > 0 AND r.no_bukti <> '' AND r.tanggal_angsuran >= '2025-01-01' ORDER BY r.id DESC LIMIT 300`)).rows;
    assert.ok(rows.length > 0);
    let cocok = 0; const selisih: string[] = [];
    for (const r of rows) {
        const prod = (await pool.query(`SELECT kode_perkiraan k, debit_jurnalumum d, kredit_jurnalumum c FROM jurnal_umum WHERE nomor_bukti = $1`, [r.no_bukti])).rows;
        const kredit = prod.filter((j) => Number(j.c) > 0), debit = prod.filter((j) => Number(j.d) > 0);
        const ok = kredit.length === 1 && debit.length === 1 && kredit[0].k === r.titipan
            && toUnits(kredit[0].c) === toUnits(r.debit_pokok) && toUnits(debit[0].d) === toUnits(r.debit_pokok);
        if (ok) cocok++; else selisih.push(`${r.no_bukti} titipan ${r.titipan} jumlah ${r.debit_pokok} prod ${JSON.stringify(prod)}`);
    }
    console.log(`jurnal KPR cocok ${cocok} dari ${rows.length}`);
    for (const s of selisih.slice(0, 5)) console.log('  ', s);
    assert.ok(cocok / rows.length > 0.97, `${selisih.length} selisih`);
});

test('paritas: angsuran bulanan KPR = rp_angsuran_per_bulan di produksi', async () => {
    const r = (await pool.query(`SELECT count(*) total, count(*) FILTER (WHERE r.debit_pokok = k.rp_angsuran_per_bulan) sama
        FROM kpr_rincian r JOIN kpr k ON k.id = r.kpr_id WHERE r.angsuran_ke > 0 AND r.tanggal_angsuran >= '2024-01-01'`)).rows[0];
    assert.equal(r.total, r.sama);
});

test('alur penuh KPR: cairkan, bayar sampai lunas (terakhir = sisa), jurnal seimbang', async () => {
    const a = (await pool.query(`SELECT kode_agt FROM anggota ORDER BY id LIMIT 1`)).rows[0];
    await inTx(async (db) => {
        const kas = (await db.query(`SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'`)).rows[0].id;
        const c = await cairkanKpr(db, { kodeAgt: a.kode_agt, kodeKredit: 'C10', tglPinjaman: '2026-10-22', pokok: 10000000, lama: 3, kasPerkiraanId: kas, opr: 'uji' });
        assert.match(c.noPinjaman, /^KPR-1026-\d+$/);
        assert.equal(c.angsuranPerBulan, '3333333.0000'); // dibulatkan ke rupiah
        const jr0 = (await db.query(`SELECT count(*) n FROM jurnal_umum WHERE nomor_bukti = $1`, [c.noPinjaman])).rows[0].n;
        assert.equal(jr0, '0'); // pencairan KPR tidak dijurnal (titipan)
        const hasil = [];
        for (let i = 0; i < 3; i++) hasil.push(await bayarAngsuranKpr(db, { noPinjaman: c.noPinjaman, tanggal: '2026-11-10', kasPerkiraanId: kas, opr: 'uji' }));
        assert.deepEqual(hasil.map((h) => h.jumlah), ['3333333.0000', '3333333.0000', '3333334.0000']);
        assert.equal(hasil[2].lunas, true);
        assert.equal(hasil[2].sisaPokok, '0.0000');
        const j = (await db.query(`SELECT SUM(debit_jurnalumum) d, SUM(kredit_jurnalumum) k, count(DISTINCT nomor_bukti) n FROM jurnal_umum WHERE nomor_bukti = ANY($1)`, [hasil.map((h) => h.noBukti)])).rows[0];
        assert.equal(j.d, j.k); assert.equal(j.n, '3');
        await db.query('SAVEPOINT x');
        await assert.rejects(bayarAngsuranKpr(db, { noPinjaman: c.noPinjaman, tanggal: '2026-12-10', kasPerkiraanId: kas, opr: 'u' }), /sudah lunas/);
        await db.query('ROLLBACK TO x');
    });
});

test('KPR ditolak: lama melebihi maksimum, jumlah melebihi sisa', async () => {
    const a = (await pool.query(`SELECT kode_agt FROM anggota ORDER BY id LIMIT 1`)).rows[0];
    await inTx(async (db) => {
        const kas = (await db.query(`SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'`)).rows[0].id;
        const base = { kodeAgt: a.kode_agt, kodeKredit: 'C10', tglPinjaman: '2026-10-22', kasPerkiraanId: kas, opr: 'u' };
        await db.query('SAVEPOINT x');
        await assert.rejects(cairkanKpr(db, { ...base, pokok: 1000, lama: 241 }), /melebihi maksimum/);
        await db.query('ROLLBACK TO x');
        const c = await cairkanKpr(db, { ...base, pokok: 1000000, lama: 2 });
        await assert.rejects(bayarAngsuranKpr(db, { noPinjaman: c.noPinjaman, tanggal: '2026-11-10', kasPerkiraanId: kas, opr: 'u', jumlah: 1000001 }), /melebihi sisa/);
    });
});
