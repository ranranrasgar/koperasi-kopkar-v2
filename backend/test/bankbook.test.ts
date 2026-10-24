import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { bacaBankBook, hapusBankBook, simpanBankBook, SQL_AKUN_BANKBOOK } from '../src/posting/bankbook.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const ambilAkun = async (db: Db) => {
    const a = (await db.query<{ kode_perkiraan: string }>(SQL_AKUN_BANKBOOK)).rows.map((r) => r.kode_perkiraan);
    const lain = (await db.query<{ kode_perkiraan: string }>(
        "SELECT kode_perkiraan FROM perkiraan WHERE keterangan NOT IN ('GC', 'BANK') OR keterangan IS NULL ORDER BY kode_perkiraan LIMIT 2")).rows.map((r) => r.kode_perkiraan);
    assert.ok(a.length > 0 && lain.length === 2, 'butuh akun kas/bank dan dua akun lain di database uji');
    return { bank: a[0], x: lain[0], y: lain[1] };
};

test('bank book: uang masuk dua akun lawan, nomor BB urut per hari, jurnal seimbang', async () => {
    await inTx(async (db) => {
        const { bank, x, y } = await ambilAkun(db);
        const a = await simpanBankBook(db, { akunBank: bank, arah: 'masuk', tanggal: '2031-03-05', deskripsi: 'Uji masuk', opr: 'uji',
            lawan: [{ kodePerkiraan: x, jumlah: 1500 }, { kodePerkiraan: y, jumlah: '250.5', deskripsi: 'baris dua' }] });
        assert.equal(a.nomorBukti, 'BB/310305/001');
        assert.equal(a.total, '1750.5000');
        const b = await simpanBankBook(db, { akunBank: bank, arah: 'keluar', tanggal: '2031-03-05', deskripsi: 'Uji keluar', opr: 'uji',
            lawan: [{ kodePerkiraan: x, jumlah: 100 }] });
        assert.equal(b.nomorBukti, 'BB/310305/002');
        const r = (await db.query(`SELECT kode_perkiraan k, debit_jurnalumum::float d, kredit_jurnalumum::float c, deskripsi, sumber_tipe FROM jurnal_umum
            WHERE nomor_bukti = $1 ORDER BY urutan`, [a.nomorBukti])).rows;
        assert.deepEqual(r, [
            { k: bank, d: 1750.5, c: 0, deskripsi: 'Uji masuk', sumber_tipe: 'bankbook' },
            { k: x, d: 0, c: 1500, deskripsi: 'Uji masuk', sumber_tipe: 'bankbook' },
            { k: y, d: 0, c: 250.5, deskripsi: 'baris dua', sumber_tipe: 'bankbook' },
        ]);
    });
});

test('bank book: ubah mengganti isi bukti, tanggal tidak boleh diubah, hapus menghilangkan bukti', async () => {
    await inTx(async (db) => {
        const { bank, x, y } = await ambilAkun(db);
        const a = await simpanBankBook(db, { akunBank: bank, arah: 'masuk', tanggal: '2031-03-06', deskripsi: 'Awal', opr: 'uji', lawan: [{ kodePerkiraan: x, jumlah: 500 }] });
        await simpanBankBook(db, { nomorBukti: a.nomorBukti, akunBank: bank, arah: 'keluar', tanggal: '2031-03-06', deskripsi: 'Diubah', opr: 'uji',
            lawan: [{ kodePerkiraan: y, jumlah: 300 }] });
        const b = await bacaBankBook(db, a.nomorBukti, bank);
        assert.equal(b?.arah, 'keluar');
        assert.equal(b?.deskripsi, 'Diubah');
        assert.deepEqual(b?.lawan.map((l) => [l.kodePerkiraan, Number(l.jumlah)]), [[y, 300]]);
        assert.equal(b?.terkunci, null);
        await db.query('SAVEPOINT a');
        await assert.rejects(simpanBankBook(db, { nomorBukti: a.nomorBukti, akunBank: bank, arah: 'masuk', tanggal: '2031-03-07', deskripsi: 'x', opr: 'uji',
            lawan: [{ kodePerkiraan: x, jumlah: 1 }] }), /Tanggal bukti tidak bisa diubah/);
        await db.query('ROLLBACK TO a');
        await hapusBankBook(db, a.nomorBukti);
        assert.equal(await bacaBankBook(db, a.nomorBukti, bank), null);
    });
});

test('bank book: masukan tidak sah dan bukti terkunci ditolak', async () => {
    await inTx(async (db) => {
        const { bank, x } = await ambilAkun(db);
        const dasar = { akunBank: bank, arah: 'masuk' as const, tanggal: '2031-03-08', deskripsi: 'x', opr: 'uji' };
        for (const [lawan, pola] of [
            [[], /minimal satu akun lawan/],
            [[{ kodePerkiraan: bank, jumlah: 5 }], /tidak boleh sama/],
            [[{ kodePerkiraan: x, jumlah: 0 }], /lebih dari nol/],
            [[{ kodePerkiraan: '', jumlah: 5 }], /pilih akun lawan/],
        ] as const) {
            await db.query('SAVEPOINT s');
            await assert.rejects(simpanBankBook(db, { ...dasar, lawan: [...lawan] }), pola);
            await db.query('ROLLBACK TO s');
        }
        await assert.rejects(simpanBankBook(db, { ...dasar, akunBank: x, lawan: [{ kodePerkiraan: bank, jumlah: 5 }] }), /bukan akun kas\/bank/);
        await assert.rejects(hapusBankBook(db, 'JU/310308/001'), /bukan bukti Bank Book/);

        const a = await simpanBankBook(db, { ...dasar, lawan: [{ kodePerkiraan: x, jumlah: 5 }] });
        await db.query("UPDATE jurnal_umum SET status = 'Reconcile' WHERE nomor_bukti = $1 AND kode_perkiraan = $2", [a.nomorBukti, bank]);
        await assert.rejects(hapusBankBook(db, a.nomorBukti), /sudah direkonsiliasi/);
        assert.match((await bacaBankBook(db, a.nomorBukti, bank))?.terkunci ?? '', /rekonsiliasi/);
    });
});
