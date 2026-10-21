import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.js';
import { setorSimpanan, ambilSimpanan } from '../src/posting/simpanan.js';
import { postJournal } from '../src/posting/journal.js';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
// Setiap uji berjalan di transaksi yang selalu di-rollback: database tidak berubah.
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};

test.after(() => pool.end());

test('paritas: setoran terakhir di produksi menghasilkan jurnal yang sama', async () => {
    const ref = (await pool.query(`SELECT s.id, s.no_bukti, s.kode_agt, s.jenis_simpanan, s.rp_setoran, s.tgl_transaksi, s.kas_perkiraan_id, s.opr
        FROM simpanan s WHERE s.rp_setoran > 0 AND s.kas_perkiraan_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM jurnal_umum j WHERE j.nomor_bukti = s.no_bukti) ORDER BY s.id DESC LIMIT 20`)).rows;
    assert.ok(ref.length > 0);
    for (const r of ref) {
        const old = (await pool.query(`SELECT kode_perkiraan, debit_jurnalumum d, kredit_jurnalumum k, deskripsi FROM jurnal_umum
            WHERE nomor_bukti = $1 ORDER BY urutan`, [r.no_bukti])).rows;
        await inTx(async (db) => {
            const res = await setorSimpanan(db, { kodeAgt: r.kode_agt, jenisSimpanan: r.jenis_simpanan, tanggal: r.tgl_transaksi,
                jumlah: r.rp_setoran, kasPerkiraanId: r.kas_perkiraan_id, opr: r.opr });
            const neu = (await db.query(`SELECT kode_perkiraan, debit_jurnalumum d, kredit_jurnalumum k, deskripsi FROM jurnal_umum
                WHERE nomor_bukti = $1 ORDER BY urutan`, [res.noBukti])).rows;
            assert.deepEqual(neu, old, r.no_bukti);
        });
    }
});

test('setor lalu ambil: saldo benar, jurnal seimbang, pengambilan melebihi saldo ditolak', async () => {
    const a = (await pool.query(`SELECT kode_agt FROM anggota ORDER BY id LIMIT 1`)).rows[0];
    await inTx(async (db) => {
        const kas = (await db.query(`SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'`)).rows[0].id;
        const base = { kodeAgt: a.kode_agt, jenisSimpanan: '03', tanggal: '2026-10-22', kasPerkiraanId: kas, opr: 'uji' };
        const before = (await db.query(`SELECT COALESCE(SUM(rp_setoran-rp_pengambilan),0) s FROM simpanan WHERE kode_agt=$1 AND jenis_simpanan='03'`, [a.kode_agt])).rows[0].s;
        const s = await setorSimpanan(db, { ...base, jumlah: 50000 });
        assert.equal(Number(s.saldoSetelah), Number(before) + 50000);
        const p = await ambilSimpanan(db, { ...base, jumlah: 20000 });
        assert.equal(Number(p.saldoSetelah), Number(before) + 30000);
        const bal = (await db.query(`SELECT SUM(debit_jurnalumum) d, SUM(kredit_jurnalumum) k FROM jurnal_umum WHERE nomor_bukti = ANY($1)`, [[s.noBukti, p.noBukti]])).rows[0];
        assert.equal(bal.d, bal.k);
        await db.query('SAVEPOINT x');
        await assert.rejects(ambilSimpanan(db, { ...base, jumlah: Number(before) + 30001 }), /kurang dari pengambilan/);
        await db.query('ROLLBACK TO x');
    });
});

test('jurnal tidak seimbang atau akun tidak ada ditolak', async () => {
    await inTx(async (db) => {
        const base = { nomorBukti: 'X-1', tanggal: '2026-10-22', deskripsi: 'x', opr: 'u', sumberTipe: 'kas', sumberId: 1 };
        await assert.rejects(postJournal(db, { ...base,
            lines: [{ kodePerkiraan: '1.1.01.41', debit: 100 }, { kodePerkiraan: '3.0.00.11', kredit: 90 }] }), /tidak seimbang/);
        await assert.rejects(postJournal(db, { ...base,
            lines: [{ kodePerkiraan: '9.9.99.99', debit: 100 }, { kodePerkiraan: '3.0.00.11', kredit: 100 }] }), /tidak ada di perkiraan/);
    });
});
