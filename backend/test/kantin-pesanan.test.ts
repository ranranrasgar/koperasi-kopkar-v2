import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { simpanProduk, simpanUnit, type UnitInput } from '../src/unit-usaha/kantin.ts';
import { bukaSesi, jualTunai } from '../src/posting/kantin.ts';
import { aturTas, batalkanKedaluwarsa, batalPesanan, checkout, ubahStatusPesanan } from '../src/posting/kantin-pesanan.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const TGL = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const dasar: UnitInput = { kode: 'UJI01', nama: 'Kantin Uji', aktif: true, tampilAnggota: true, model: 'milik', terimaTunai: true, terimaSukarela: true, operator: [],
    batasSukarelaTransaksi: 0, batasSukarelaHarian: 0, saldoSukarelaMinimal: 0, menitBatalPesanan: 30 };

async function siapkan(db: Db) {
    const a = Number((await db.query('SELECT id FROM anggota WHERE aktif ORDER BY id LIMIT 1')).rows[0].id);
    await db.query(`INSERT INTO simpanan (urut, no_bukti, jenis_simpanan, kode_agt, tgl_transaksi, rp_setoran, rp_pengambilan, rp_saldo, opr, anggota_id, jenis_simpanan_id)
        SELECT nextval('seq_simpanan_urut'), 'UJI-SALDO', '03', a.kode_agt, $1, 100000, 0, 0, 'uji', a.id, j.id FROM anggota a, jenis_simpanan j WHERE a.id = $2 AND j.kode_simpanan = '03'`, [TGL, a]);
    const opr = Number((await db.query('SELECT id FROM opr ORDER BY id LIMIT 1')).rows[0].id);
    const { id: unitId } = await simpanUnit(db, dasar, 'uji');
    const nasi = (await simpanProduk(db, { unitId, nama: 'Nasi Rames', hargaBeli: '9000', hargaJual: '12000', kelolaStok: false, tampilAnggota: true, aktif: true }, 'uji')).id;
    const air = (await simpanProduk(db, { unitId, nama: 'Air', hargaBeli: '4000', hargaJual: '5000', kelolaStok: true, tampilAnggota: true, aktif: true }, 'uji')).id;
    await db.query('UPDATE kantin_produk SET stok = 3 WHERE id = $1', [air]);
    const saldo = async () => Number((await db.query(`SELECT SUM(rp_setoran - rp_pengambilan) s FROM simpanan WHERE anggota_id = $1 AND jenis_simpanan = '03'`, [a])).rows[0].s);
    return { a, opr, unitId, nasi, air, saldo };
}

test('belanja aplikasi sukarela: tas, checkout memposting penjualan mobile, alur status, batal mengembalikan saldo', async () => {
    await inTx(async (db) => {
        const s = await siapkan(db);
        const saldoAwal = await s.saldo();
        await aturTas(db, { anggotaId: s.a, unitId: s.unitId, produkId: s.nasi, qty: 2 });
        await assert.rejects(aturTas(db, { anggotaId: s.a, unitId: s.unitId, produkId: s.air, qty: 4 }), /Stok Air tinggal 3/);
        await aturTas(db, { anggotaId: s.a, unitId: s.unitId, produkId: s.air, qty: 1 });
        await assert.rejects(checkout(db, { anggotaId: s.a, unitId: s.unitId, metode: 'sukarela', totalDilihat: 1, tanggal: TGL }), /berubah/);
        const c = await checkout(db, { anggotaId: s.a, unitId: s.unitId, metode: 'sukarela', totalDilihat: 29000, tanggal: TGL, catatan: 'tidak pedas' });
        assert.equal(Number(c.total), 29000); assert.ok(c.noBukti);
        assert.equal(await s.saldo(), saldoAwal - 29000);
        const p = (await db.query('SELECT p.status, j.sumber, j.sesi_kasir_id, j.opr FROM kantin_pesanan p JOIN kantin_penjualan j ON j.id = p.penjualan_id WHERE p.id = $1', [c.id])).rows[0];
        assert.deepEqual(p, { status: 'dibayar', sumber: 'mobile', sesi_kasir_id: null, opr: 'aplikasi' });
        assert.equal(Number((await db.query('SELECT stok FROM kantin_produk WHERE id = $1', [s.air])).rows[0].stok), 2);
        assert.equal((await db.query('SELECT 1 FROM kantin_tas WHERE anggota_id = $1', [s.a])).rowCount, 0);

        await ubahStatusPesanan(db, { id: c.id, unitId: s.unitId, status: 'diproses', opr: 'uji' });
        await assert.rejects(ubahStatusPesanan(db, { id: c.id, unitId: s.unitId, status: 'selesai', opr: 'uji' }), /berstatus Sedang disiapkan/);
        await ubahStatusPesanan(db, { id: c.id, unitId: s.unitId, status: 'siap', opr: 'uji' });
        await assert.rejects(batalPesanan(db, { id: c.id, unitId: s.unitId, alasan: 'batal saja', opr: 'anggota', hariIni: TGL, olehAnggota: s.a }), /sudah diproses/);
        const b = await batalPesanan(db, { id: c.id, unitId: s.unitId, alasan: 'stok habis', opr: 'uji', hariIni: TGL });
        assert.equal(b.dikembalikan, true);
        assert.equal(await s.saldo(), saldoAwal);
        assert.equal(Number((await db.query('SELECT stok FROM kantin_produk WHERE id = $1', [s.air])).rows[0].stok), 3);
    });
});

test('belanja aplikasi tunai: pesanan menunggu, kasir memposting penjualan tunai dari pesanan, kedaluwarsa dibatalkan', async () => {
    await inTx(async (db) => {
        const s = await siapkan(db);
        await aturTas(db, { anggotaId: s.a, unitId: s.unitId, produkId: s.nasi, qty: 1 });
        const c = await checkout(db, { anggotaId: s.a, unitId: s.unitId, metode: 'tunai', totalDilihat: '12000', tanggal: TGL });
        assert.equal(c.noBukti, null);
        await assert.rejects(ubahStatusPesanan(db, { id: c.id, unitId: s.unitId, status: 'selesai', opr: 'uji' }), /berstatus Menunggu/);
        await ubahStatusPesanan(db, { id: c.id, unitId: s.unitId, status: 'siap', opr: 'uji' });
        await bukaSesi(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', modalAwal: 0 });
        const j = await jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: [{ produkId: s.nasi, qty: 1 }], uangDiterima: 20000, pesananId: c.id });
        const p = (await db.query('SELECT p.status, j.anggota_id FROM kantin_pesanan p JOIN kantin_penjualan j ON j.id = p.penjualan_id WHERE p.id = $1', [c.id])).rows[0];
        assert.deepEqual(p, { status: 'selesai', anggota_id: String(s.a) });
        assert.ok(j.noBukti.startsWith('KTN-'));
        await assert.rejects(jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: [{ produkId: s.nasi, qty: 1 }], uangDiterima: 20000, pesananId: c.id }), /tidak menunggu/);

        await aturTas(db, { anggotaId: s.a, unitId: s.unitId, produkId: s.nasi, qty: 1 });
        const c2 = await checkout(db, { anggotaId: s.a, unitId: s.unitId, metode: 'tunai', totalDilihat: '12000', tanggal: TGL });
        await db.query("UPDATE kantin_pesanan SET batas_ambil = now() - interval '1 minute' WHERE id = $1", [c2.id]);
        await batalkanKedaluwarsa(db);
        assert.equal((await db.query('SELECT status FROM kantin_pesanan WHERE id = $1', [c2.id])).rows[0].status, 'batal');
    });
});
