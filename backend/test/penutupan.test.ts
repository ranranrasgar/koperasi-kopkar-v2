import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { batalTutupPinjaman, tutupPinjaman } from '../src/posting/penutupan.ts';
import { bayarAngsuran, cairkanPinjaman } from '../src/posting/pinjaman.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

test('tutup pinjaman tanpa jurnal: lunas, jurnal dan buku tetap, bisa dibatalkan', async () => {
    const a = (await pool.query(`SELECT kode_agt FROM anggota WHERE rp_grade >= 1000000 ORDER BY id LIMIT 1`)).rows[0];
    await inTx(async (db) => {
        const kas = (await db.query(`SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'`)).rows[0].id;
        const c = await cairkanPinjaman(db, { kodeAgt: a.kode_agt, kodeKredit: 'C01', tglPinjaman: '2026-10-22', pokok: 1000000, lama: 10, kasPerkiraanId: kas, opr: 'uji' } as never);
        const no = c.noPinjaman;
        await bayarAngsuran(db, { noPinjaman: no, tanggal: '2026-11-01', kasPerkiraanId: kas, opr: 'uji' } as never);
        const jejak = async () => (await db.query(`SELECT (SELECT count(*) FROM jurnal_umum)::int jurnal, (SELECT count(*) FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai p ON p.id = r.pinjaman_tunai_id WHERE p.no_pinjaman = $1)::int rincian,
            (SELECT COALESCE(SUM(r.kredit_pokok - r.debit_pokok), 0)::text FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai p ON p.id = r.pinjaman_tunai_id WHERE p.no_pinjaman = $1) sisa`, [no])).rows[0];
        const cicilan = async () => (await db.query('SELECT jml_cicilan, sisa_cicilan FROM pinjaman_tunai WHERE no_pinjaman = $1', [no])).rows[0];
        const awal = await jejak(), sebelum = await cicilan();
        assert.equal(sebelum.jml_cicilan, 1);

        await db.query('SAVEPOINT a');
        await assert.rejects(tutupPinjaman(db, { noPinjaman: no, alasan: 'x', opr: 'uji' }), /Alasan wajib/);
        await db.query('ROLLBACK TO SAVEPOINT a');
        await assert.rejects(tutupPinjaman(db, { noPinjaman: 'CR-TIDAK-ADA', alasan: 'lunas di bank', opr: 'uji' }), /tidak ditemukan/);

        const h = await tutupPinjaman(db, { noPinjaman: no, alasan: 'Lunas langsung ke bank', opr: 'uji' });
        assert.ok(Number(h.sisaBuku) > 100, 'sisa buku tercatat');
        assert.deepEqual(await cicilan(), { jml_cicilan: 10, sisa_cicilan: 0 });
        assert.deepEqual(await jejak(), awal, 'jurnal, rincian, dan sisa buku tidak berubah');
        await assert.rejects(tutupPinjaman(db, { noPinjaman: no, alasan: 'Lunas langsung ke bank', opr: 'uji' }), /sudah lunas/);

        await batalTutupPinjaman(db, { noPinjaman: no, opr: 'uji' });
        assert.deepEqual(await cicilan(), sebelum, 'cicilan kembali');
        assert.deepEqual(await jejak(), awal);
        await assert.rejects(batalTutupPinjaman(db, { noPinjaman: no, opr: 'uji' }), /tidak sedang ditutup/);

        // Bisa ditutup lagi setelah dibatalkan.
        await tutupPinjaman(db, { noPinjaman: no, alasan: 'Lunas langsung ke bank', opr: 'uji' });
        assert.equal((await db.query('SELECT count(*)::int n FROM pinjaman_penutupan WHERE no_pinjaman = $1', [no])).rows[0].n, 2);
    });
});
