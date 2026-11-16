import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { buatQr } from '../src/anggota/qr.ts';
import { simpanProduk, simpanUnit, type UnitInput } from '../src/unit-usaha/kantin.ts';
import { batalJual, bukaSesi, jualSukarela, jualTunai } from '../src/posting/kantin.ts';
import { batalPenyelesaian, hitungPenyelesaian, simpanPenyelesaian } from '../src/posting/kantin-tenant.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const TGL = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const dasar: UnitInput = { kode: 'UJI01', nama: 'Kantin Uji', aktif: true, tampilAnggota: true, model: 'milik', terimaTunai: true, terimaSukarela: true, operator: [],
    batasSukarelaTransaksi: 50000, batasSukarelaHarian: 60000, saldoSukarelaMinimal: 10000 };
const jurnal = (db: Db, no: string) => db.query(`SELECT p.nama_perkiraan n, j.debit_jurnalumum::float8 d, j.kredit_jurnalumum::float8 k
    FROM jurnal_umum j JOIN perkiraan p ON p.id = j.perkiraan_id WHERE nomor_bukti = $1 ORDER BY urutan`, [no]).then((r) => r.rows.map((x) => [x.n.replace(/ Kantin Uji$/, ''), x.d, x.k]));

async function siapkan(db: Db, unit: Partial<UnitInput> = {}) {
    const opr = Number((await db.query('SELECT id FROM opr ORDER BY id LIMIT 1')).rows[0].id);
    const a = (await db.query("SELECT id, kode_agt FROM anggota WHERE aktif ORDER BY id LIMIT 1")).rows[0];
    const saldoAwal = Number((await db.query(`SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) s FROM simpanan WHERE anggota_id = $1 AND jenis_simpanan = '03'`, [a.id])).rows[0].s);
    // Saldo sukarela anggota uji tepat 100.000 untuk uji ini.
    if (saldoAwal !== 100000) await db.query(`INSERT INTO simpanan (urut, no_bukti, jenis_simpanan, kode_agt, tgl_transaksi, rp_setoran, rp_pengambilan, rp_saldo, opr, anggota_id, jenis_simpanan_id)
        SELECT nextval('seq_simpanan_urut'), 'UJI-SALDO', '03', $1, $2, GREATEST(100000 - $3::numeric, 0), GREATEST($3::numeric - 100000, 0), 100000, 'uji', $4, id FROM jenis_simpanan WHERE kode_simpanan = '03'`,
        [a.kode_agt, TGL, saldoAwal, a.id]);
    const { id: unitId } = await simpanUnit(db, { ...dasar, ...unit }, 'uji');
    const nasi = (await simpanProduk(db, { unitId, nama: 'Nasi Rames', hargaBeli: '9000', hargaJual: '12000', kelolaStok: false, tampilAnggota: true, aktif: true }, 'uji')).id;
    await bukaSesi(db, { unitId, oprId: opr, opr: 'uji', modalAwal: 0 });
    const qr = async () => (await buatQr(db, Number(a.id), 'bayar'))!.teks;
    const saldo = async () => Number((await db.query(`SELECT SUM(rp_setoran - rp_pengambilan) s FROM simpanan WHERE anggota_id = $1 AND jenis_simpanan = '03'`, [a.id])).rows[0].s);
    return { opr, unitId, nasi, anggotaId: Number(a.id), qr, saldo };
}

test('bayar sukarela kantin milik: saldo berkurang, jurnal Simpanan Sukarela/Penjualan + HPP, QR sekali pakai, batas dan saldo minimal', async () => {
    await inTx(async (db) => {
        const s = await siapkan(db);
        const base = { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL };
        const teks = await s.qr();
        const j = await jualSukarela(db, { ...base, items: [{ produkId: s.nasi, qty: 2 }], qrTeks: teks });
        assert.equal(Number(j.total), 24000); assert.equal(Number(j.saldoSukarela), 76000);
        assert.equal(await s.saldo(), 76000);
        assert.deepEqual(await jurnal(db, j.noBukti), [['Simpanan Sukarela', 24000, 0], ['Penjualan', 0, 24000], ['HPP', 18000, 0], ['Persediaan', 0, 18000]]);
        const sp = (await db.query('SELECT s.no_bukti, s.rp_pengambilan::float8 a FROM simpanan s JOIN kantin_penjualan p ON p.simpanan_id = s.id WHERE p.id = $1', [j.id])).rows[0];
        assert.deepEqual(sp, { no_bukti: j.noBukti, a: 24000 });
        await assert.rejects(jualSukarela(db, { ...base, items: [{ produkId: s.nasi, qty: 1 }], qrTeks: teks }), /tidak berlaku atau sudah dipakai/);
        await assert.rejects(jualSukarela(db, { ...base, items: [{ produkId: s.nasi, qty: 5 }], qrTeks: await s.qr() }), /maksimal Rp 50.000 per transaksi/);
        await assert.rejects(jualSukarela(db, { ...base, items: [{ produkId: s.nasi, qty: 4 }], qrTeks: await s.qr() }), /per hari; hari ini sudah Rp 24.000/);
        // Batas transaksi/harian dimatikan: saldo minimal 10.000 tetap berlaku (76.000 - 72.000 = 4.000 < 10.000).
        await db.query('UPDATE unit_usaha SET batas_sukarela_transaksi = 0, batas_sukarela_harian = 0 WHERE id = $1', [s.unitId]);
        await assert.rejects(jualSukarela(db, { ...base, items: [{ produkId: s.nasi, qty: 6 }], qrTeks: await s.qr() }), /harus tersisa minimal Rp 10.000/);

        await batalJual(db, { id: j.id, unitId: s.unitId, alasan: 'uji batal', opr: 'uji', hariIni: TGL, semuaHari: false });
        assert.equal(await s.saldo(), 100000);
        assert.equal((await jurnal(db, j.noBukti)).length, 0);
    });
});

test('tenant bagi hasil: sukarela menjadi utang ke tenant, penyelesaian bulanan dengan minimum, nota terkunci, batal penyelesaian', async () => {
    await inTx(async (db) => {
        const s = await siapkan(db, { model: 'bagi_hasil', tenant: { namaUsaha: 'Warung Uji' }, kontrak: { mulai: '2026-01-01', persenBagiHasil: '10', minimumBulanan: '10000' } });
        const base = { unitId: s.unitId, oprId: s.opr, opr: 'uji', tanggal: TGL };
        const suk = await jualSukarela(db, { ...base, items: [{ produkId: s.nasi, qty: 3 }], qrTeks: await s.qr() }); // 36.000, bagi 3.600
        assert.deepEqual(await jurnal(db, suk.noBukti), [['Simpanan Sukarela', 36000, 0], ['Utang ke Tenant', 0, 32400], ['Pendapatan Bagi Hasil', 0, 3600]]);
        const tun = await jualTunai(db, { ...base, items: [{ produkId: s.nasi, qty: 2 }], uangDiterima: 24000 }); // 24.000, bagi 2.400

        const h = await hitungPenyelesaian(db, s.unitId, TGL, TGL);
        assert.deepEqual([h.nota, Number(h.penjualan), Number(h.bagiHasil), Number(h.tambahan), Number(h.utang), Number(h.piutang), Number(h.neto)],
            [2, 60000, 6000, 4000, 32400, 6400, 26000]); // minimum 10.000 - bagi 6.000 = 4.000
        const p = await simpanPenyelesaian(db, { unitId: s.unitId, dari: TGL, sampai: TGL, tanggal: TGL, akunKas: '1.1.01.20', opr: 'uji' });
        assert.deepEqual(await jurnal(db, p.noBukti), [['Piutang Tenant', 4000, 0], ['Pendapatan Bagi Hasil', 0, 4000], ['Utang ke Tenant', 32400, 0], ['Piutang Tenant', 0, 6400], ['Kas Induk', 0, 26000]]);
        await assert.rejects(batalJual(db, { id: tun.id, unitId: s.unitId, alasan: 'uji', opr: 'uji', hariIni: TGL, semuaHari: true }), /penyelesaian tenant/);
        await assert.rejects(simpanPenyelesaian(db, { unitId: s.unitId, dari: TGL, sampai: TGL, tanggal: TGL, akunKas: '1.1.01.20', opr: 'uji' }), /bertumpuk/);

        await batalPenyelesaian(db, { id: p.id, opr: 'uji' });
        assert.equal((await jurnal(db, p.noBukti)).length, 0);
        assert.equal((await hitungPenyelesaian(db, s.unitId, TGL, TGL)).nota, 2);
    });
});
