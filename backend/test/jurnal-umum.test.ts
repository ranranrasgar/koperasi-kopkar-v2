import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { postJurnalUmum } from '../src/posting/jurnal-umum.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

test('jurnal umum: nomor JU baru, tahun berawalan JU, keterangan per baris, seimbang', async () => {
    await inTx(async (db) => {
        const res = await postJurnalUmum(db, { tanggal: '2026-10-22', deskripsi: 'Beban listrik', opr: 'uji', lines: [
            { kodePerkiraan: '5.1.00.95', debit: '251500', deskripsi: 'BEBAN LISTRIK OKTOBER' },
            { kodePerkiraan: '1.1.01.21', kredit: '251500' },
        ] });
        assert.match(res.nomorBukti, /^JU\/261022\/\d+$/);
        const rows = (await db.query(`SELECT tahun, deskripsi, debit_jurnalumum d, kredit_jurnalumum k, sumber_tipe, sumber_id
            FROM jurnal_umum WHERE nomor_bukti = $1 ORDER BY urutan`, [res.nomorBukti])).rows;
        assert.deepEqual(rows, [
            { tahun: 'JU261022', deskripsi: 'BEBAN LISTRIK OKTOBER', d: '251500.0000', k: '0.0000', sumber_tipe: 'jurnal', sumber_id: null },
            { tahun: 'JU261022', deskripsi: 'Beban listrik', d: '0.0000', k: '251500.0000', sumber_tipe: 'jurnal', sumber_id: null },
        ]);
        // Nomor sequence selalu di atas nomor JU lama, jadi tidak menimpa jurnal desktop.
        const maxLama = (await db.query(`SELECT MAX(substring(nomor_bukti FROM '[0-9]+$')::bigint) m FROM jurnal_umum
            WHERE nomor_bukti LIKE 'JU/%' AND sumber_tipe IS NULL`)).rows[0].m;
        assert.ok(Number(res.nomorBukti.split('/')[2]) > Number(maxLama));
    });
});

test('jurnal umum: tidak seimbang dan tanpa keterangan ditolak', async () => {
    await inTx(async (db) => {
        await db.query('SAVEPOINT a');
        await assert.rejects(postJurnalUmum(db, { tanggal: '2026-10-22', deskripsi: 'x', opr: 'uji', lines: [
            { kodePerkiraan: '5.1.00.95', debit: 100 }, { kodePerkiraan: '1.1.01.21', kredit: 90 }] }), /tidak seimbang/);
        await db.query('ROLLBACK TO a');
        await assert.rejects(postJurnalUmum(db, { tanggal: '2026-10-22', deskripsi: ' ', opr: 'uji', lines: [] }), /wajib diisi/);
    });
});
