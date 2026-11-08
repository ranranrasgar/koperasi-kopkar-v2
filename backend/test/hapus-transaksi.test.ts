import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { hapusTransaksiAsal, infoTransaksiAsal } from '../src/posting/hapus-transaksi.ts';
import { bayarAngsuran, cairkanPinjaman } from '../src/posting/pinjaman.ts';
import { ambilSimpanan, setorSimpanan } from '../src/posting/simpanan.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const TANGGAL = '2026-11-06';
const alasan = 'Salah input, dobel transaksi';
const gagal = async (db: Db, fn: () => Promise<unknown>, pola: RegExp) => {
    await db.query('SAVEPOINT g');
    await assert.rejects(fn(), pola);
    await db.query('ROLLBACK TO SAVEPOINT g');
};
const jumlah = async (db: Db, sql: string, p: unknown[]) => Number((await db.query(sql, p)).rows[0].n);

test('hapus simpanan: baris dan jurnal hilang, tercatat; setoran yang sudah terpakai ditolak', async () => {
    const a = (await pool.query(`SELECT a.kode_agt FROM anggota a WHERE a.aktif AND NOT EXISTS (SELECT 1 FROM simpanan s WHERE s.anggota_id = a.id AND s.jenis_simpanan = '04') ORDER BY a.id LIMIT 1`)).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const b = { kodeAgt: a, jenisSimpanan: '04', tanggal: TANGGAL, kasPerkiraanId: kas, opr: 'uji' };
        const setor = await setorSimpanan(db, { ...b, jumlah: 100000 });
        const ambil = await ambilSimpanan(db, { ...b, jumlah: 60000 });

        const info = await infoTransaksiAsal(db, setor.noBukti);
        assert.equal(info?.jenis, 'simpanan');
        assert.equal(info?.jurnal, 2);
        assert.match(info?.alasanTolak ?? '', /saldo akan negatif/);
        assert.equal(await infoTransaksiAsal(db, 'JU/261106/1'), null, 'bukti jurnal umum tidak punya transaksi asal');

        await gagal(db, () => hapusTransaksiAsal(db, { noBukti: setor.noBukti, alasan, opr: 'uji' }), /saldo akan negatif/);
        await gagal(db, () => hapusTransaksiAsal(db, { noBukti: ambil.noBukti, alasan: 'pendek', opr: 'uji' }), /minimal 10/);

        const r = await hapusTransaksiAsal(db, { noBukti: ambil.noBukti, alasan, opr: 'uji', operatorId: 1 });
        assert.equal(r.jurnalDihapus, 2);
        assert.equal(await jumlah(db, 'SELECT count(*) n FROM simpanan WHERE no_bukti = $1', [ambil.noBukti]), 0);
        assert.equal(await jumlah(db, 'SELECT count(*) n FROM jurnal_umum WHERE nomor_bukti = $1', [ambil.noBukti]), 0);
        const log = (await db.query("SELECT alasan, data_lama FROM transaksi_koreksi WHERE no_bukti = $1 AND aksi = 'hapus'", [ambil.noBukti])).rows;
        assert.equal(log.length, 1);
        assert.equal(log[0].alasan, alasan);
        assert.equal(log[0].data_lama.jurnal.length, 2, 'snapshot jurnal tersimpan');

        // Pengambilan sudah hilang, jadi setoran sekarang boleh dihapus.
        assert.equal((await hapusTransaksiAsal(db, { noBukti: setor.noBukti, alasan, opr: 'uji' })).jenis, 'simpanan');
        assert.equal(await jumlah(db, 'SELECT count(*) n FROM simpanan WHERE no_bukti = $1', [setor.noBukti]), 0);
    });
});

test('hapus angsuran: hanya yang terakhir; cicilan kembali dan angsuran bisa dibayar lagi; pencairan tidak bisa dihapus', async () => {
    const a = (await pool.query('SELECT kode_agt FROM anggota WHERE rp_grade >= 1000000 ORDER BY id LIMIT 1')).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const c = await cairkanPinjaman(db, { kodeAgt: a, kodeKredit: 'C01', tglPinjaman: TANGGAL, pokok: 1000000, lama: 6, kasPerkiraanId: kas, opr: 'uji' });
        const bayar = () => bayarAngsuran(db, { noPinjaman: c.noPinjaman, tanggal: TANGGAL, kasPerkiraanId: kas, opr: 'uji' });
        const a1 = await bayar(), a2 = await bayar();
        const cicilan = async () => Number((await db.query('SELECT jml_cicilan n FROM pinjaman_tunai WHERE no_pinjaman = $1', [c.noPinjaman])).rows[0].n);
        assert.equal(await cicilan(), 2);

        const info = await infoTransaksiAsal(db, a2.noBukti);
        assert.equal(info?.jenis, 'angsuran');
        assert.equal(info?.alasanTolak, null);
        assert.match((await infoTransaksiAsal(db, a1.noBukti))?.alasanTolak ?? '', /Hanya angsuran terakhir/);
        assert.match((await infoTransaksiAsal(db, c.noPinjaman))?.alasanTolak ?? '', /Batalkan Transaksi/);

        await gagal(db, () => hapusTransaksiAsal(db, { noBukti: a1.noBukti, alasan, opr: 'uji' }), /Hanya angsuran terakhir/);
        await gagal(db, () => hapusTransaksiAsal(db, { noBukti: c.noPinjaman, alasan, opr: 'uji' }), /Batalkan Transaksi/);
        const r = await hapusTransaksiAsal(db, { noBukti: a2.noBukti, alasan, opr: 'uji' });
        assert.equal(r.jenis, 'angsuran');
        assert.equal(await cicilan(), 1);
        assert.equal(await jumlah(db, 'SELECT count(*) n FROM pinjaman_tunai_rincian WHERE no_bukti = $1', [a2.noBukti]), 0);
        assert.equal(await jumlah(db, 'SELECT count(*) n FROM jurnal_umum WHERE nomor_bukti = $1', [a2.noBukti]), 0);
        assert.equal((await bayar()).noBukti.startsWith('ANGS-CR-'), true, 'angsuran ke-2 bisa dibayar lagi');
        assert.equal(await cicilan(), 2);
    });
});
