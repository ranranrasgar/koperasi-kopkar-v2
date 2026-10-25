import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { batasPlafon, pesanPlafon } from '../src/posting/plafon.ts';
import { cairkanPinjaman } from '../src/posting/pinjaman.ts';
import { ajukanPinjaman } from '../src/anggota/pengajuan.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

test('batas plafon: grade diutamakan, maksimal sebagai cadangan, tanpa batas', () => {
    assert.deepEqual(batasPlafon({ kunciGrade: true, maksPlafond: 5_000_000 }, 3_000_000), { batas: 3_000_000, sumber: 'grade' }); // grade menang walau maksimal lebih besar
    assert.deepEqual(batasPlafon({ kunciGrade: true, maksPlafond: 2_000_000 }, 3_000_000), { batas: 3_000_000, sumber: 'grade' }); // dan walau lebih kecil
    assert.deepEqual(batasPlafon({ kunciGrade: true, maksPlafond: 5_000_000 }, 0), { batas: 5_000_000, sumber: 'maksimal' });       // grade anggota kosong
    assert.deepEqual(batasPlafon({ kunciGrade: false, maksPlafond: '4000000.00' }, 9_000_000), { batas: 4_000_000, sumber: 'maksimal' }); // grade tidak dikunci
    assert.deepEqual(batasPlafon({ kunciGrade: true, maksPlafond: 0 }, null), { batas: 0, sumber: 'grade' });                        // aturan lama: grade kosong = tak bisa
    assert.equal(batasPlafon({ kunciGrade: false, maksPlafond: 0 }, 3_000_000), null);
    assert.equal(pesanPlafon(100, null), null);
    assert.equal(pesanPlafon(3_000_000, { batas: 3_000_000, sumber: 'grade' }), null);
    assert.match(pesanPlafon(3_000_001, { batas: 3_000_000, sumber: 'grade' }) ?? '', /grade \(plafon\) Anda, maksimal Rp 3\.000\.000/);
    assert.match(pesanPlafon(3_000_001, { batas: 3_000_000, sumber: 'maksimal' }) ?? '', /maksimal plafond Rp 3\.000\.000/);
});

test('pencairan admin dan pengajuan PWA menolak pinjaman di atas plafon, grade diutamakan atas maksimal', async () => {
    await inTx(async (db) => {
        const a = (await db.query<{ id: string; kode_agt: string }>(
            "SELECT id::text, kode_agt FROM anggota WHERE aktif = 'Y' AND trim(status_staff) <> 'Staff' AND rp_grade = 3000000 ORDER BY id LIMIT 1")).rows[0];
        assert.ok(a, 'butuh anggota non-staff berplafon 3.000.000');
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        // C01: kunci grade aktif. Maksimal 10 juta diisi, tetapi grade (3 juta) yang berlaku.
        await db.query("UPDATE jenis_kredit SET maks_plafond = 10000000 WHERE kode_kredit = 'C01'");
        await db.query('SAVEPOINT a');
        await assert.rejects(cairkanPinjaman(db, { kodeAgt: a.kode_agt, kodeKredit: 'C01', tglPinjaman: '2026-10-22', pokok: 3_000_001, lama: 6, kasPerkiraanId: kas, opr: 'uji' }), /grade \(plafon\) anggota, maksimal Rp 3\.000\.000/);
        await db.query('ROLLBACK TO a');
        const ok = await cairkanPinjaman(db, { kodeAgt: a.kode_agt, kodeKredit: 'C01', tglPinjaman: '2026-10-22', pokok: 3_000_000, lama: 6, kasPerkiraanId: kas, opr: 'uji' });
        assert.match(ok.noPinjaman, /^CR-/);

        // PWA: sama aturannya, pesan memakai sudut "Anda".
        const r = await ajukanPinjaman(db, Number(a.id), { kodeKredit: 'C01', lama: 6, besar: 3_000_001, tglRealisasi: '2026-10-30', keterangan: '' }, '2026-10-25');
        assert.equal(r.ok, false);
        assert.match(r.ok ? '' : r.error, /grade \(plafon\) Anda, maksimal Rp 3\.000\.000/);

        // Jenis tanpa kunci grade (C03 Elektronik Non Staff): maksimal plafond yang berlaku.
        await db.query("UPDATE jenis_kredit SET maks_plafond = 2000000 WHERE kode_kredit = 'C03'");
        await db.query('SAVEPOINT b');
        await assert.rejects(cairkanPinjaman(db, { kodeAgt: a.kode_agt, kodeKredit: 'C03', tglPinjaman: '2026-10-22', pokok: 2_000_001, lama: 6, kasPerkiraanId: kas, opr: 'uji' }), /maksimal plafond Rp 2\.000\.000/);
        await db.query('ROLLBACK TO b');
        await cairkanPinjaman(db, { kodeAgt: a.kode_agt, kodeKredit: 'C03', tglPinjaman: '2026-10-22', pokok: 2_000_000, lama: 6, kasPerkiraanId: kas, opr: 'uji' });
    });
});
