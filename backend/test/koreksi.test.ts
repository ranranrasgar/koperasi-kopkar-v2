import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { batalSimpanan } from '../src/posting/koreksi.ts';
import { cekBuktiTerbuka, postJournal } from '../src/posting/journal.ts';
import { ambilSimpanan, setorSimpanan } from '../src/posting/simpanan.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const TANGGAL = '2026-11-06';
const alasan = 'Salah input nominal setoran';
const saldo = async (db: Db, kode: string, jenis: string) => Number((await db.query(
    'SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) s FROM simpanan WHERE kode_agt = $1 AND jenis_simpanan = $2', [kode, jenis])).rows[0].s);
const jurnalBukti = async (db: Db, no: string) => (await db.query(
    'SELECT kode_perkiraan k, debit_jurnalumum::float d, kredit_jurnalumum::float c FROM jurnal_umum WHERE nomor_bukti = $1 ORDER BY urutan', [no])).rows;
const gagal = async (db: Db, fn: () => Promise<unknown>, pola: RegExp) => {
    await db.query('SAVEPOINT g');
    await assert.rejects(fn(), pola);
    await db.query('ROLLBACK TO SAVEPOINT g');
};

test('batal setoran: saldo kembali, jurnal dibalik, tercatat, dan tidak bisa diulang', async () => {
    const a = (await pool.query("SELECT kode_agt FROM anggota WHERE aktif ORDER BY id LIMIT 1")).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const awal = await saldo(db, a, '03');
        const { noBukti } = await setorSimpanan(db, { kodeAgt: a, jenisSimpanan: '03', tanggal: TANGGAL, jumlah: 750000, kasPerkiraanId: kas, opr: 'uji' });
        const asal = await jurnalBukti(db, noBukti);

        await gagal(db, () => batalSimpanan(db, { noBukti, tanggal: TANGGAL, alasan: 'pendek', opr: 'uji' }), /minimal 10/);
        const r = await batalSimpanan(db, { noBukti, tanggal: TANGGAL, alasan, opr: 'uji', operatorId: 1 });
        assert.match(r.noBukti, /^BTL-2611-\d+$/);
        assert.equal(await saldo(db, a, '03'), awal);
        assert.deepEqual((await jurnalBukti(db, r.noBukti)).map((j) => [j.k, j.d, j.c]), asal.map((j) => [j.k, j.c, j.d]));
        assert.equal((await db.query('SELECT rp_setoran FROM simpanan WHERE no_bukti = $1', [noBukti])).rows[0].rp_setoran, '750000.0000', 'baris asal tidak berubah');
        const log = (await db.query('SELECT * FROM transaksi_koreksi WHERE no_bukti = $1', [noBukti])).rows;
        assert.equal(log.length, 1);
        assert.equal(log[0].no_bukti_pembalik, r.noBukti);
        assert.equal(log[0].alasan, alasan);
        assert.equal(log[0].data_lama.rp_setoran, '750000.0000');

        await gagal(db, () => batalSimpanan(db, { noBukti, tanggal: TANGGAL, alasan, opr: 'uji' }), /sudah dibatalkan/);
        await gagal(db, () => batalSimpanan(db, { noBukti: r.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' }), /adalah pembalik/);
    });
});

test('batal pengambilan menambah saldo; setoran yang sudah terpakai tidak bisa dibatalkan', async () => {
    const a = (await pool.query(`SELECT a.kode_agt FROM anggota a WHERE a.aktif AND NOT EXISTS (SELECT 1 FROM simpanan s WHERE s.anggota_id = a.id AND s.jenis_simpanan = '04') ORDER BY a.id LIMIT 1`)).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const b = { kodeAgt: a, jenisSimpanan: '04', tanggal: TANGGAL, kasPerkiraanId: kas, opr: 'uji' };
        const setor = await setorSimpanan(db, { ...b, jumlah: 100000 });
        const ambil = await ambilSimpanan(db, { ...b, jumlah: 60000 });
        await gagal(db, () => batalSimpanan(db, { noBukti: setor.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' }), /tidak cukup/);
        const r = await batalSimpanan(db, { noBukti: ambil.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' });
        assert.equal(Number(r.saldoSetelah), 100000);
        await batalSimpanan(db, { noBukti: setor.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' });
        assert.equal(await saldo(db, a, '04'), 0);
    });
});

test('bukti SHU, bukti tanpa jurnal, dan bukti yang tidak ada', async () => {
    const shu = (await pool.query("SELECT no_bukti FROM simpanan WHERE no_bukti LIKE 'SHU/%' LIMIT 1")).rows[0]?.no_bukti;
    const tanpa = (await pool.query(`SELECT s.no_bukti FROM simpanan s WHERE s.rp_pengambilan > 0 AND s.tgl_transaksi >= '2018-01-01'
        AND NOT EXISTS (SELECT 1 FROM jurnal_umum j WHERE j.nomor_bukti = s.no_bukti) LIMIT 1`)).rows[0]?.no_bukti;
    await inTx(async (db) => {
        await gagal(db, () => batalSimpanan(db, { noBukti: 'TIDAK-ADA', tanggal: TANGGAL, alasan, opr: 'uji' }), /tidak ditemukan/);
        if (shu) await gagal(db, () => batalSimpanan(db, { noBukti: shu, tanggal: TANGGAL, alasan, opr: 'uji' }), /Bukti SHU/);
        if (tanpa) {
            const r = await batalSimpanan(db, { noBukti: tanpa, tanggal: TANGGAL, alasan, opr: 'uji' });
            assert.equal((await jurnalBukti(db, r.noBukti)).length, 0, 'bukti tanpa jurnal dibalik di buku simpanan saja');
        }
    });
});

test('kunci periode: jurnal di tahun yang sudah ditutup ditolak, tutup buku boleh', async () => {
    await inTx(async (db) => {
        const o = (await db.query(`SELECT MAX(tanggal_jurnalumum)::text t FROM jurnal_umum WHERE nomor_bukti LIKE 'TBT/%' AND tanggal_jurnalumum = date_trunc('year', tanggal_jurnalumum)::date`)).rows[0].t as string;
        const lama = `${Number(o.slice(0, 4)) - 1}-06-30`;
        const lines = [{ kodePerkiraan: '1.1.01.41', debit: 1000 }, { kodePerkiraan: '2.1.00.20', kredit: 1000 }];
        const j = { deskripsi: 'uji', opr: 'uji', sumberTipe: null, sumberId: null, lines };
        await gagal(db, () => postJournal(db, { ...j, nomorBukti: 'UJI/1', tanggal: lama }), /sudah ditutup/);
        await postJournal(db, { ...j, nomorBukti: 'TBT/UJI', tanggal: lama });
        await gagal(db, () => cekBuktiTerbuka(db, 'TBT/UJI'), /sudah ditutup/);
        assert.equal(await postJournal(db, { ...j, nomorBukti: 'UJI/2', tanggal: o }), 2);
    });
});
