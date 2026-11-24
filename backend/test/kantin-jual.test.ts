import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPool, withTx, type Db } from '../src/db.ts';
import { simpanProduk, simpanUnit, type UnitInput } from '../src/unit-usaha/kantin.ts';
import { batalJual, bukaSesi, hapusStokMasuk, ubahStokMasuk, jualTunai, penyesuaianStok, stokMasuk, tutupSesi } from '../src/posting/kantin.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
// Setiap uji berjalan di transaksi yang selalu di-rollback: database tidak berubah.
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const TGL = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const dasar: UnitInput = { kode: 'UJI01', nama: 'Kantin Uji', aktif: true, tampilAnggota: true, model: 'milik', terimaTunai: true, terimaSukarela: true, operator: [] };
const jurnal = (db: Db, no: string) => db.query(`SELECT j.kode_perkiraan, j.debit_jurnalumum::float8 d, j.kredit_jurnalumum::float8 k, p.nama_perkiraan
    FROM jurnal_umum j JOIN perkiraan p ON p.id = j.perkiraan_id WHERE nomor_bukti = $1 ORDER BY urutan`, [no]).then((r) => r.rows);
const produk = (db: Db, id: number) => db.query('SELECT stok::float8, harga_pokok::float8 FROM kantin_produk WHERE id = $1', [id]).then((r) => r.rows[0]);

async function siapkan(db: Db, unit: Partial<UnitInput> = {}) {
    const opr = Number((await db.query('SELECT id FROM opr ORDER BY id LIMIT 1')).rows[0].id);
    const { id: unitId } = await simpanUnit(db, { ...dasar, ...unit }, 'uji');
    const botol = await simpanProduk(db, { unitId, nama: 'Air Mineral', hargaBeli: '4000', hargaJual: '6000', kelolaStok: true, tampilAnggota: true, aktif: true }, 'uji');
    const nasi = await simpanProduk(db, { unitId, nama: 'Nasi Rames', hargaBeli: '9000', hargaJual: '12000', kelolaStok: false, tampilAnggota: true, aktif: true }, 'uji');
    return { opr, unitId, botol: botol.id, nasi: nasi.id };
}

test('kantin milik: stok masuk rata-rata bergerak, jual tunai berjurnal empat baris, idempoten, stok dan sesi dicek', async () => {
    await inTx(async (db) => {
        const s = await siapkan(db);
        const m1 = await stokMasuk(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', akunBayar: '1.1.01.20', items: [{ produkId: s.botol, qty: 10, hargaBeli: 4000 }] });
        await stokMasuk(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', akunBayar: '1.1.01.20', items: [{ produkId: s.botol, qty: 10, hargaBeli: 5000 }] });
        assert.deepEqual(await produk(db, s.botol), { stok: 20, harga_pokok: 4500 });
        const jm = await jurnal(db, m1.noBukti);
        assert.deepEqual(jm.map((x) => [x.d, x.k]), [[40000, 0], [0, 40000]]);
        assert.match(jm[0].nama_perkiraan, /^Persediaan Kantin Uji/);
        await assert.rejects(stokMasuk(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', akunBayar: '1.1.01.20', items: [{ produkId: s.nasi, qty: 1, hargaBeli: 1 }] }), /Bank Book/);

        const item = [{ produkId: s.botol, qty: 2 }, { produkId: s.nasi, qty: 1 }];
        await assert.rejects(jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: item, uangDiterima: 50000 }), /Buka sesi/);
        await bukaSesi(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', modalAwal: 100000 });
        const kunci = crypto.randomUUID();
        const j = await jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: item, diskon: 1000, uangDiterima: 30000, kunci });
        assert.equal(Number(j.total), 23000); assert.equal(Number(j.kembalian), 7000);
        const jj = await jurnal(db, j.noBukti);
        assert.deepEqual(jj.map((x) => [x.d, x.k]), [[23000, 0], [0, 23000], [18000, 0], [0, 18000]]); // HPP 2 x 4.500 + 9.000
        assert.deepEqual(jj.map((x) => x.nama_perkiraan.replace(/ Kantin Uji$/, '')), ['Kas', 'Penjualan', 'HPP', 'Persediaan']);
        assert.equal((await produk(db, s.botol)).stok, 18);
        const ulang = await jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: item, diskon: 1000, uangDiterima: 30000, kunci });
        assert.equal(ulang.noBukti, j.noBukti); assert.equal(ulang.ulang, true);
        assert.equal((await produk(db, s.botol)).stok, 18);

        await assert.rejects(jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: [{ produkId: s.botol, qty: 19 }], uangDiterima: 999999 }), /Stok Air Mineral tinggal 18/);
        await assert.rejects(jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: item, uangDiterima: 1000 }), /kurang dari total/);
        await assert.rejects(jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: item, diskon: 99999, uangDiterima: 1000 }), /Diskon/);
    });
});

test('batal penjualan: stok kembali, jurnal terhapus, tidak bisa dua kali; nota kemarin hanya admin', async () => {
    await inTx(async (db) => {
        const s = await siapkan(db);
        await stokMasuk(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', akunBayar: '1.1.01.20', items: [{ produkId: s.botol, qty: 5, hargaBeli: 4000 }] });
        await bukaSesi(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', modalAwal: 0 });
        const j = await jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: [{ produkId: s.botol, qty: 3 }], uangDiterima: 18000 });
        await assert.rejects(batalJual(db, { id: j.id, unitId: s.unitId, alasan: 'salah input', opr: 'uji', hariIni: '2099-01-01', semuaHari: false }), /hanya bisa dibatalkan admin/);
        await batalJual(db, { id: j.id, unitId: s.unitId, alasan: 'salah input', opr: 'uji', hariIni: TGL, semuaHari: false });
        assert.deepEqual(await produk(db, s.botol), { stok: 5, harga_pokok: 4000 });
        assert.equal((await jurnal(db, j.noBukti)).length, 0);
        await assert.rejects(batalJual(db, { id: j.id, unitId: s.unitId, alasan: 'lagi', opr: 'uji', hariIni: TGL, semuaHari: true }), /sudah dibatalkan/);
    });
});

test('hapus stok masuk: stok, HPP, kartu stok, dan jurnal kembali; ditolak bila sudah ada mutasi sesudahnya', async () => {
    await inTx(async (db) => {
        const s = await siapkan(db);
        const bayar = { unitId: s.unitId, tanggal: TGL, opr: 'uji', akunBayar: '1.1.01.20' };
        await stokMasuk(db, { ...bayar, items: [{ produkId: s.botol, qty: 10, hargaBeli: 4000 }] });
        const m2 = await stokMasuk(db, { ...bayar, items: [{ produkId: s.botol, qty: 6, hargaBeli: 5000 }] });
        assert.deepEqual(await produk(db, s.botol), { stok: 16, harga_pokok: 4375 });
        const h = await hapusStokMasuk(db, { unitId: s.unitId, noBukti: m2.noBukti });
        assert.equal(Number(h.total), 30000);
        assert.deepEqual(await produk(db, s.botol), { stok: 10, harga_pokok: 4000 });
        assert.equal((await jurnal(db, m2.noBukti)).length, 0);
        assert.equal((await db.query('SELECT 1 FROM kantin_stok_mutasi WHERE no_bukti = $1', [m2.noBukti])).rowCount, 0);
        await assert.rejects(hapusStokMasuk(db, { unitId: s.unitId, noBukti: m2.noBukti }), /tidak ditemukan/);

        const m4 = await stokMasuk(db, { ...bayar, items: [{ produkId: s.botol, qty: 5, hargaBeli: 6000 }] });
        const u = await ubahStokMasuk(db, { ...bayar, noBukti: m4.noBukti, keterangan: 'nota 12', items: [{ produkId: s.botol, qty: 10, hargaBeli: 5000 }] });
        assert.equal(u.noBukti, m4.noBukti);
        assert.deepEqual(await produk(db, s.botol), { stok: 20, harga_pokok: 4500 });
        assert.deepEqual((await jurnal(db, m4.noBukti)).map((x) => [x.d, x.k]), [[50000, 0], [0, 50000]]);
        assert.equal((await db.query('SELECT 1 FROM kantin_stok_mutasi WHERE no_bukti = $1', [m4.noBukti])).rowCount, 1);
        await hapusStokMasuk(db, { unitId: s.unitId, noBukti: m4.noBukti });

        const m3 = await stokMasuk(db, { ...bayar, items: [{ produkId: s.botol, qty: 2, hargaBeli: 4000 }] });
        await penyesuaianStok(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', jenis: 'rusak', keterangan: 'pecah', items: [{ produkId: s.botol, qty: 1 }] });
        await assert.rejects(hapusStokMasuk(db, { unitId: s.unitId, noBukti: m3.noBukti }), /sudah punya mutasi sesudahnya/);
        await assert.rejects(ubahStokMasuk(db, { ...bayar, noBukti: m3.noBukti, items: [{ produkId: s.botol, qty: 1, hargaBeli: 1 }] }), /sudah punya mutasi sesudahnya/);
    });
});

test('kantin tenant bagi hasil: tunai hanya menjurnal bagi hasil, stok masuk tanpa jurnal', async () => {
    await inTx(async (db) => {
        const s = await siapkan(db, { model: 'bagi_hasil', tenant: { namaUsaha: 'Warung Uji' }, kontrak: { mulai: '2026-01-01', persenBagiHasil: '10' } });
        const m = await stokMasuk(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', items: [{ produkId: s.botol, qty: 5, hargaBeli: 4000 }] });
        assert.equal((await jurnal(db, m.noBukti)).length, 0);
        await bukaSesi(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', modalAwal: 0 });
        const j = await jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: [{ produkId: s.nasi, qty: 2 }, { produkId: s.botol, qty: 1 }], uangDiterima: 30000 });
        const jj = await jurnal(db, j.noBukti);
        assert.deepEqual(jj.map((x) => [x.nama_perkiraan.replace(/ Kantin Uji$/, ''), x.d, x.k]), [['Piutang Tenant', 3000, 0], ['Pendapatan Bagi Hasil', 0, 3000]]);
        const p = (await db.query('SELECT bagi_hasil::float8, persen_bagi_hasil::float8 FROM kantin_penjualan WHERE id = $1', [j.id])).rows[0];
        assert.deepEqual(p, { bagi_hasil: 3000, persen_bagi_hasil: 10 });
    });
});

test('tutup sesi: selisih kas kurang dijurnal ke Selisih Kas Kantin, sesi tidak bisa ditutup dua kali', async () => {
    await inTx(async (db) => {
        const s = await siapkan(db);
        const { id: sesiId } = await bukaSesi(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', modalAwal: 50000 });
        await jualTunai(db, { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL, items: [{ produkId: s.nasi, qty: 1 }], uangDiterima: 12000 });
        const r = await tutupSesi(db, { sesiId, oprId: s.opr, opr: 'uji', uangFisik: 61500, tanggal: TGL });
        assert.equal(Number(r.seharusnya), 62000); assert.equal(Number(r.selisih), -500);
        const jj = await jurnal(db, `KTS-${TGL.slice(2, 4)}${TGL.slice(5, 7)}-${sesiId}`);
        assert.deepEqual(jj.map((x) => [x.nama_perkiraan, x.d, x.k]), [['Selisih Kas Kantin', 500, 0], ['Kas Kantin Uji', 0, 500]]);
        await assert.rejects(tutupSesi(db, { sesiId, oprId: s.opr, opr: 'uji', uangFisik: 0, tanggal: TGL }), /sudah ditutup/);
    });
});

test('opname dan barang rusak: stok disesuaikan dengan HPP rata-rata, jurnal selisih/beban (milik), tanpa jurnal (tenant)', async () => {
    await inTx(async (db) => {
        const s = await siapkan(db);
        await stokMasuk(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', akunBayar: '1.1.01.20', items: [{ produkId: s.botol, qty: 10, hargaBeli: 4000 }] });
        await assert.rejects(penyesuaianStok(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', jenis: 'rusak', items: [{ produkId: s.botol, qty: 2 }] }), /keterangan/);
        await assert.rejects(penyesuaianStok(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', jenis: 'rusak', keterangan: 'pecah', items: [{ produkId: s.botol, qty: 11 }] }), /tinggal 10/);
        const r = await penyesuaianStok(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', jenis: 'rusak', keterangan: 'pecah', items: [{ produkId: s.botol, qty: 2 }] });
        assert.deepEqual((await jurnal(db, r.noBukti)).map((x) => [x.nama_perkiraan.replace(/ Kantin Uji$/, ''), x.d, x.k]), [['Beban Barang Rusak Kantin', 8000, 0], ['Persediaan', 0, 8000]]);
        const o = await penyesuaianStok(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', jenis: 'opname', items: [{ produkId: s.botol, qty: 9 }] }); // 8 -> 9
        assert.deepEqual((await jurnal(db, o.noBukti)).map((x) => [x.nama_perkiraan.replace(/ Kantin Uji$/, ''), x.d, x.k]), [['Persediaan', 4000, 0], ['Selisih Persediaan Kantin', 0, 4000]]);
        assert.deepEqual(await produk(db, s.botol), { stok: 9, harga_pokok: 4000 });
        await assert.rejects(penyesuaianStok(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', jenis: 'opname', items: [{ produkId: s.botol, qty: 9 }] }), /Tidak ada stok yang berubah/);
        await assert.rejects(penyesuaianStok(db, { unitId: s.unitId, tanggal: TGL, opr: 'uji', jenis: 'opname', items: [{ produkId: s.nasi, qty: 1 }] }), /tidak dikelola/);
    });
});
