import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { simpanProduk, simpanUnit, unitOperator, type UnitInput } from '../src/unit-usaha/kantin.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
// Setiap uji berjalan di transaksi yang selalu di-rollback: database tidak berubah.
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const dasar: UnitInput = { kode: 'UJI01', nama: 'Kantin Uji', aktif: true, tampilAnggota: true, model: 'milik', terimaTunai: true, terimaSukarela: true, operator: [] };
const akun = (db: Db, id: string | null) => db.query('SELECT p.kode_perkiraan, p.nama_perkiraan, p.d_k, p.keterangan, p.kode_klasifikasi, i.kode_perkiraan induk FROM perkiraan p JOIN perkiraan i ON i.id = p.parent_id WHERE p.id = $1', [id]).then((r) => r.rows[0]);

test('kantin milik koperasi: empat akun dibuat di induknya, induk baru 4.1/5.3 dibuat sekali, kantin kedua memakai nomor berikutnya', async () => {
    await inTx(async (db) => {
        const r = await simpanUnit(db, dasar, 'uji');
        assert.equal(r.akunBaru.length, 4);
        const u = (await db.query('SELECT * FROM unit_usaha WHERE id = $1', [r.id])).rows[0];
        const kas = await akun(db, u.akun_kas_id), sedia = await akun(db, u.akun_persediaan_id);
        const jual = await akun(db, u.akun_penjualan_id), hpp = await akun(db, u.akun_hpp_id);
        assert.equal(kas.induk, '1.1.01.00'); assert.equal(kas.keterangan, 'BANK'); assert.equal(kas.nama_perkiraan, 'Kas Kantin Uji'); assert.equal(kas.d_k, 'D');
        assert.equal(sedia.induk, '1.1.01.00');
        assert.equal(jual.induk, '4.1.00.00'); assert.equal(jual.d_k, 'C'); assert.equal(jual.kode_klasifikasi, 40);
        assert.equal(hpp.induk, '5.3.00.00'); assert.equal(hpp.d_k, 'D'); assert.equal(hpp.kode_klasifikasi, 50);
        assert.match(kas.kode_perkiraan, /^1\.1\.01\.\d\d$/);
        assert.notEqual(kas.kode_perkiraan, sedia.kode_perkiraan);

        const r2 = await simpanUnit(db, { ...dasar, kode: 'UJI02', nama: 'Kantin Dua' }, 'uji');
        const u2 = (await db.query('SELECT * FROM unit_usaha WHERE id = $1', [r2.id])).rows[0];
        const jual2 = await akun(db, u2.akun_penjualan_id);
        assert.equal(jual2.induk, '4.1.00.00');
        assert.notEqual(jual2.kode_perkiraan, jual.kode_perkiraan);
        assert.equal(Number((await db.query("SELECT count(*) n FROM perkiraan WHERE kode_perkiraan IN ('4.1.00.00','5.3.00.00')")).rows[0].n), 2);

        // Ubah tanpa ganti model: tidak ada akun baru, akun lama tetap.
        const r3 = await simpanUnit(db, { ...dasar, id: r.id, nama: 'Kantin Uji Baru' }, 'uji');
        assert.equal(r3.akunBaru.length, 0);
        await assert.rejects(simpanUnit(db, { ...dasar, kode: 'UJI02' }, 'uji'), /sudah dipakai/);
    });
});

test('kantin tenant bagi hasil: akun piutang/utang/pendapatan, tenant dan kontrak, validasi persen', async () => {
    await inTx(async (db) => {
        const t = { ...dasar, model: 'bagi_hasil' as const, tenant: { namaUsaha: 'Warung Bu Siti', pemilik: 'Siti' } };
        await assert.rejects(simpanUnit(db, t, 'uji'), /tenant dan kontrak/);
        await assert.rejects(simpanUnit(db, { ...t, kontrak: { mulai: '2026-11-01', persenBagiHasil: 0 } }, 'uji'), /Persen bagi hasil wajib/);
        await assert.rejects(simpanUnit(db, { ...t, kontrak: { mulai: '2026-11-01', persenBagiHasil: 120 } }, 'uji'), /maksimal 100/);
        const r = await simpanUnit(db, { ...t, kontrak: { mulai: '2026-11-01', persenBagiHasil: '10', minimumBulanan: '500000' } }, 'uji');
        assert.equal(r.akunBaru.length, 3);
        const u = (await db.query('SELECT * FROM unit_usaha WHERE id = $1', [r.id])).rows[0];
        assert.equal(u.akun_kas_id, null);
        assert.equal((await akun(db, u.akun_utang_tenant_id)).induk, '2.1.00.00');
        assert.equal((await akun(db, u.akun_piutang_tenant_id)).induk, '1.1.01.00');
        assert.equal((await akun(db, u.akun_pendapatan_tenant_id)).nama_perkiraan, 'Pendapatan Bagi Hasil Kantin Uji');
        const k = (await db.query('SELECT persen_bagi_hasil, minimum_bulanan FROM tenant_kontrak WHERE unit_usaha_id = $1', [r.id])).rows;
        assert.deepEqual(k, [{ persen_bagi_hasil: '10.0000', minimum_bulanan: '500000.0000' }]);
        // Simpan ulang dengan mulai sama memperbarui kontrak itu; mulai baru menambah kontrak.
        await simpanUnit(db, { ...t, id: r.id, kontrak: { mulai: '2026-11-01', persenBagiHasil: '12.5' } }, 'uji');
        await simpanUnit(db, { ...t, id: r.id, kontrak: { mulai: '2027-01-01', persenBagiHasil: '15' } }, 'uji');
        const semua = (await db.query('SELECT mulai::text, persen_bagi_hasil FROM tenant_kontrak WHERE unit_usaha_id = $1 ORDER BY mulai', [r.id])).rows;
        assert.deepEqual(semua, [{ mulai: '2026-11-01', persen_bagi_hasil: '12.5000' }, { mulai: '2027-01-01', persen_bagi_hasil: '15.0000' }]);
    });
});

test('operator hanya melihat kantin yang ditugaskan; admin melihat semua', async () => {
    await inTx(async (db) => {
        const opr = (await db.query('SELECT id FROM opr ORDER BY id LIMIT 2')).rows.map((r) => Number(r.id));
        const a = await simpanUnit(db, { ...dasar, operator: [{ oprId: opr[0], peran: 'kasir' }] }, 'uji');
        const b = await simpanUnit(db, { ...dasar, kode: 'UJI02', nama: 'Kantin Dua', operator: [{ oprId: opr[1], peran: 'pengelola' }] }, 'uji');
        const milik0 = (await unitOperator(db, opr[0], false)).filter((u) => [a.id, b.id].includes(u.id));
        assert.deepEqual(milik0.map((u) => [u.id, u.peran]), [[a.id, 'kasir']]);
        const admin = (await unitOperator(db, opr[0], true)).filter((u) => [a.id, b.id].includes(u.id));
        assert.equal(admin.length, 2);
        await assert.rejects(simpanUnit(db, { ...dasar, id: a.id, operator: [{ oprId: 999999999, peran: 'kasir' }] }, 'uji'), /tidak ditemukan/);
    });
});

test('produk: kode otomatis, kategori dibuat sekali, riwayat harga, kode dan barcode unik per kantin', async () => {
    await inTx(async (db) => {
        const { id: unitId } = await simpanUnit(db, dasar, 'uji');
        const p = { unitId, nama: 'Es Teh', kategori: 'Minuman', hargaBeli: '2000', hargaJual: '5000', kelolaStok: false, tampilAnggota: true, aktif: true };
        const a = await simpanProduk(db, p, 'uji');
        const b = await simpanProduk(db, { ...p, nama: 'Es Jeruk', kategori: 'minuman', barcode: '899123' }, 'uji');
        assert.equal(a.kode, 'P0001'); assert.equal(b.kode, 'P0002');
        assert.equal(Number((await db.query('SELECT count(*) n FROM kantin_kategori WHERE unit_usaha_id = $1', [unitId])).rows[0].n), 1);
        await assert.rejects(simpanProduk(db, { ...p, kode: 'p0001' }, 'uji'), /sudah dipakai/);
        await assert.rejects(simpanProduk(db, { ...p, barcode: '899123' }, 'uji'), /Barcode/);
        await assert.rejects(simpanProduk(db, { ...p, hargaJual: '0' }, 'uji'), /Harga jual wajib/);
        await assert.rejects(simpanProduk(db, { ...p, hargaJual: 'abc' }, 'uji'), /angka/);

        await simpanProduk(db, { ...p, id: a.id, hargaJual: '6000' }, 'uji');
        const h = (await db.query('SELECT harga_jual_lama, harga_jual_baru FROM kantin_harga_riwayat WHERE produk_id = $1 ORDER BY id', [a.id])).rows;
        assert.deepEqual(h.map((x) => [x.harga_jual_lama, x.harga_jual_baru]), [[null, '5000.0000'], ['5000.0000', '6000.0000']]);
        const row = (await db.query('SELECT harga_pokok FROM kantin_produk WHERE id = $1', [a.id])).rows[0];
        assert.equal(row.harga_pokok, '2000.0000');

        // Produk kantin lain tidak bisa diubah lewat kantin ini.
        const { id: lain } = await simpanUnit(db, { ...dasar, kode: 'UJI02', nama: 'Kantin Dua' }, 'uji');
        await assert.rejects(simpanProduk(db, { ...p, unitId: lain, id: a.id }, 'uji'), /tidak ditemukan/);
    });
});
