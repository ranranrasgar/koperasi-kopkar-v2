import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { alasanTerkunci, bacaJurnalUmum, hapusJurnalUmum, postJurnalUmum, STATUS_PENYESUAIAN, tandaiPenyesuaian, ubahJurnalUmum } from '../src/posting/jurnal-umum.ts';

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

test('jurnal umum: baca, ubah, hapus; bukti non-JU/BB terkunci', async () => {
    await inTx(async (db) => {
        const a = await postJurnalUmum(db, { tanggal: '2031-04-01', deskripsi: 'Awal', opr: 'uji', lines: [
            { kodePerkiraan: '5.1.00.95', debit: '600', deskripsi: 'baris sendiri' }, { kodePerkiraan: '5.1.00.95', debit: '400' }, { kodePerkiraan: '1.1.01.21', kredit: '1000' }] });
        const b = await bacaJurnalUmum(db, a.nomorBukti);
        assert.equal(b?.deskripsi, 'Awal');
        assert.equal(b?.terkunci, null);
        assert.deepEqual(b?.baris.map((x) => [x.kodePerkiraan, Number(x.debit), Number(x.kredit), x.deskripsi]),
            [['5.1.00.95', 600, 0, 'baris sendiri'], ['5.1.00.95', 400, 0, 'Awal'], ['1.1.01.21', 0, 1000, 'Awal']]);
        await ubahJurnalUmum(db, a.nomorBukti, { tanggal: '2031-04-01', deskripsi: 'Diubah', opr: 'uji', lines: [
            { kodePerkiraan: '5.1.00.95', debit: '700' }, { kodePerkiraan: '1.1.01.21', kredit: '700' }] });
        assert.equal(Number((await bacaJurnalUmum(db, a.nomorBukti))?.baris[0].debit), 700);
        await db.query('SAVEPOINT a');
        await assert.rejects(ubahJurnalUmum(db, a.nomorBukti, { tanggal: '2031-04-02', deskripsi: 'x', opr: 'uji', lines: [] }), /Tanggal jurnal tidak bisa diubah/);
        await db.query('ROLLBACK TO a');
        await hapusJurnalUmum(db, a.nomorBukti);
        assert.equal(await bacaJurnalUmum(db, a.nomorBukti), null);
        assert.match(alasanTerkunci('CR-1026-23315') ?? '', /transaksi lain/);
    });
});

test('jurnal penyesuaian: nomor JP, status Penyesuaian, ubah mempertahankan penanda, tandai/kembalikan JU, hapus', async () => {
    await inTx(async (db) => {
        const lines = [{ kodePerkiraan: '5.1.00.40', debit: '3378101' }, { kodePerkiraan: '1.2.00.20', kredit: '3378101' }];
        const jp = await postJurnalUmum(db, { tanggal: '2026-10-31', deskripsi: 'Penyusutan Oktober', opr: 'uji', lines, penyesuaian: true });
        assert.match(jp.nomorBukti, /^JP\/261031\/\d+$/);
        const baris = (await db.query('SELECT tahun, status, sumber_tipe FROM jurnal_umum WHERE nomor_bukti = $1', [jp.nomorBukti])).rows;
        assert.deepEqual(baris, [{ tahun: 'JP261031', status: STATUS_PENYESUAIAN, sumber_tipe: 'penyesuaian' }, { tahun: 'JP261031', status: STATUS_PENYESUAIAN, sumber_tipe: 'penyesuaian' }]);
        const b = await bacaJurnalUmum(db, jp.nomorBukti);
        assert.equal(b?.penyesuaian, true);
        assert.equal(b?.terkunci, null);

        // Ubah: nomor dan penanda tetap.
        await ubahJurnalUmum(db, jp.nomorBukti, { tanggal: '2026-10-31', deskripsi: 'Penyusutan Oktober (koreksi)', opr: 'uji',
            lines: [{ kodePerkiraan: '5.1.00.40', debit: '4000000' }, { kodePerkiraan: '1.2.00.20', kredit: '4000000' }] });
        const sesudah = await bacaJurnalUmum(db, jp.nomorBukti);
        assert.equal(sesudah?.penyesuaian, true);
        assert.equal(Number(sesudah?.baris[0].debit), 4000000);
        assert.equal((await db.query('SELECT count(*)::int n FROM jurnal_umum WHERE nomor_bukti = $1', [jp.nomorBukti])).rows[0].n, 2);

        // JU biasa bukan penyesuaian; bisa ditandai dan dikembalikan; JP tidak bisa ditandai.
        const ju = await postJurnalUmum(db, { tanggal: '2026-10-31', deskripsi: 'Beban', opr: 'uji', lines });
        assert.equal((await bacaJurnalUmum(db, ju.nomorBukti))?.penyesuaian, false);
        await tandaiPenyesuaian(db, ju.nomorBukti, true);
        assert.equal((await bacaJurnalUmum(db, ju.nomorBukti))?.penyesuaian, true);
        await ubahJurnalUmum(db, ju.nomorBukti, { tanggal: '2026-10-31', deskripsi: 'Beban 2', opr: 'uji', lines });
        assert.equal((await bacaJurnalUmum(db, ju.nomorBukti))?.penyesuaian, true, 'penanda tetap setelah diubah');
        await tandaiPenyesuaian(db, ju.nomorBukti, false);
        assert.equal((await bacaJurnalUmum(db, ju.nomorBukti))?.penyesuaian, false);
        await assert.rejects(tandaiPenyesuaian(db, jp.nomorBukti, false), /hanya jurnal umum JU/);

        // Daftar penyesuaian hanya memuat JP (dan JU yang ditandai), dan hapus berfungsi.
        assert.equal((await db.query("SELECT count(*)::int n FROM jurnal_umum WHERE nomor_bukti = $1 AND status = 'Penyesuaian'", [jp.nomorBukti])).rows[0].n, 2);
        await hapusJurnalUmum(db, jp.nomorBukti);
        assert.equal(await bacaJurnalUmum(db, jp.nomorBukti), null);
    });
});

test('alasanTerkunci: JP/ boleh diubah seperti JU/', () => {
    assert.equal(alasanTerkunci('JP/261031/1'), null);
});
