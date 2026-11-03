import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { bayarAngsuran, cairkanPinjaman } from '../src/posting/pinjaman.ts';
import { hapusTitipan, postingTitipan, tambahTitipan } from '../src/posting/titipan.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

test('titipan angsuran: tambah tanpa jurnal, hapus hanya yang belum diposting, posting bersama angsuran', async () => {
    const a = (await pool.query(`SELECT kode_agt FROM anggota WHERE rp_grade >= 1000000 ORDER BY id LIMIT 1`)).rows[0]; // C01 mengunci grade
    await inTx(async (db) => {
        const kas = (await db.query(`SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'`)).rows[0].id;
        const c = await cairkanPinjaman(db, { kodeAgt: a.kode_agt, kodeKredit: 'C01', tglPinjaman: '2026-10-22', pokok: 1000000, lama: 2, kasPerkiraanId: kas, opr: 'uji' });
        const jurnal = async () => Number((await db.query('SELECT count(*) n FROM jurnal_umum')).rows[0].n);
        const sebelum = await jurnal();

        const t1 = await tambahTitipan(db, { noPinjaman: c.noPinjaman, tanggal: '2026-11-01', jumlah: '200000' });
        await tambahTitipan(db, { noPinjaman: c.noPinjaman, tanggal: '2026-11-05', jumlah: '300000' });
        assert.equal(await jurnal(), sebelum, 'titipan tidak membuat jurnal');
        await db.query('SAVEPOINT a');
        await assert.rejects(tambahTitipan(db, { noPinjaman: c.noPinjaman, tanggal: '2026-11-05', jumlah: '0' }), /lebih dari 0/);
        await db.query('ROLLBACK TO SAVEPOINT a');
        await assert.rejects(tambahTitipan(db, { noPinjaman: 'TIDAK-ADA', tanggal: '2026-11-05', jumlah: '1' }), /tidak ditemukan/);
        await db.query('ROLLBACK TO SAVEPOINT a');

        await hapusTitipan(db, t1.id);
        await tambahTitipan(db, { noPinjaman: c.noPinjaman, tanggal: '2026-11-08', jumlah: '250000' });

        await bayarAngsuran(db, { noPinjaman: c.noPinjaman, tanggal: '2026-11-10', kasPerkiraanId: kas, opr: 'uji' });
        const p = await postingTitipan(db, c.noPinjaman);
        assert.equal(p.jumlah, 2);
        assert.equal(Number(p.total), 550000);
        const st = (await db.query('SELECT id, status FROM pinjaman_tunai_titipan WHERE no_pinjaman = $1', [c.noPinjaman])).rows;
        assert.ok(st.length === 2 && st.every((r) => r.status === 'POSTING'));
        assert.equal((await postingTitipan(db, c.noPinjaman)).jumlah, 0, 'posting ulang tidak menandai apa pun');
        await assert.rejects(hapusTitipan(db, Number(st[0].id)), /sudah diposting/);

        // Pinjaman lunas: titipan baru ditolak.
        await bayarAngsuran(db, { noPinjaman: c.noPinjaman, tanggal: '2026-12-10', kasPerkiraanId: kas, opr: 'uji' });
        await assert.rejects(tambahTitipan(db, { noPinjaman: c.noPinjaman, tanggal: '2026-12-11', jumlah: '1000' }), /sudah lunas/);
    });
});
