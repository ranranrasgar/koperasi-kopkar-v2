import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { aturPin, cekPin, cekPinBaru, hapusPin } from '../src/anggota/pin.ts';
import { hashPasswordAnggota } from '../src/anggota/akun.ts';
import { simpanProduk, simpanUnit, type UnitInput } from '../src/unit-usaha/kantin.ts';
import { bacaTagihan, batalTagihan, bayarTagihan, bukaSesi, buatTagihan, statusTagihan } from '../src/posting/kantin.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const TGL = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const dasar: UnitInput = { kode: 'UJI01', nama: 'Kantin Uji', aktif: true, tampilAnggota: true, model: 'milik', terimaTunai: true, terimaSukarela: true, operator: [],
    batasSukarelaTransaksi: 0, batasSukarelaHarian: 0, saldoSukarelaMinimal: 0 };

/** Anggota aktif yang punya akun aplikasi, dengan password akun diganti 'Rahasia123' (di dalam transaksi uji). */
async function anggotaUji(db: Db) {
    const a = (await db.query(`SELECT a.id, u.id user_id FROM anggota a JOIN app_user u ON u.anggota_id = a.id WHERE a.aktif ORDER BY a.id LIMIT 1`)).rows[0];
    await db.query('UPDATE app_user SET password_hash = $1 WHERE id = $2', [await hashPasswordAnggota('Rahasia123'), a.user_id]);
    return { anggotaId: Number(a.id), userId: Number(a.user_id) };
}

test('PIN: aturan, password akun wajib, salah 5 kali terkunci', async () => {
    assert.match(cekPinBaru('12345') ?? '', /6 angka/);
    assert.match(cekPinBaru('111111') ?? '', /sama semua/);
    assert.match(cekPinBaru('123456') ?? '', /berurutan/);
    assert.equal(cekPinBaru('482915'), null);
    await inTx(async (db) => {
        const a = await anggotaUji(db);
        await db.query('DELETE FROM anggota_pin WHERE anggota_id = $1', [a.anggotaId]);
        await assert.rejects(cekPin(db, a.anggotaId, '482915'), /Atur PIN/);
        assert.deepEqual(await aturPin(db, { ...a, password: 'salah', pin: '482915', ulangi: '482915' }), { ok: false, error: 'Password akun salah' });
        assert.equal((await aturPin(db, { ...a, password: 'Rahasia123', pin: '482915', ulangi: '482916' })).ok, false);
        assert.equal((await aturPin(db, { ...a, password: 'Rahasia123', pin: '482915', ulangi: '482915' })).ok, true);
        await cekPin(db, a.anggotaId, '482915');
        for (let n = 4; n >= 1; n--) await assert.rejects(cekPin(db, a.anggotaId, '000001'), new RegExp(`Sisa ${n} kali`));
        await assert.rejects(cekPin(db, a.anggotaId, '000001'), /terkunci 15 menit/);
        await assert.rejects(cekPin(db, a.anggotaId, '482915'), /PIN terkunci/);
        assert.deepEqual(await hapusPin(db, a.userId), { ok: true, username: (await db.query('SELECT username FROM app_user WHERE id = $1', [a.userId])).rows[0].username, ada: true });
        await assert.rejects(cekPin(db, a.anggotaId, '482915'), /Atur PIN/);
    });
});

test('tagihan QR kantin: buat, baca, bayar dengan sukarela, status kasir, sekali bayar, batal, harga berubah ditolak', async () => {
    await inTx(async (db) => {
        const a = await anggotaUji(db);
        await db.query(`INSERT INTO simpanan (urut, no_bukti, jenis_simpanan, kode_agt, tgl_transaksi, rp_setoran, rp_pengambilan, rp_saldo, opr, anggota_id, jenis_simpanan_id)
            SELECT nextval('seq_simpanan_urut'), 'UJI-SALDO', '03', a.kode_agt, $1, 100000, 0, 0, 'uji', a.id, j.id FROM anggota a, jenis_simpanan j WHERE a.id = $2 AND j.kode_simpanan = '03'`, [TGL, a.anggotaId]);
        const opr = Number((await db.query('SELECT id FROM opr ORDER BY id LIMIT 1')).rows[0].id);
        const { id: unitId } = await simpanUnit(db, dasar, 'uji');
        const nasi = (await simpanProduk(db, { unitId, nama: 'Nasi Rames', hargaBeli: '9000', hargaJual: '12000', kelolaStok: false, tampilAnggota: true, aktif: true }, 'uji')).id;
        await assert.rejects(buatTagihan(db, { unitId, oprId: opr, opr: 'uji', items: [{ produkId: nasi, qty: 1 }] }), /Buka sesi/);
        await bukaSesi(db, { unitId, oprId: opr, opr: 'uji', modalAwal: 0 });

        const t = await buatTagihan(db, { unitId, oprId: opr, opr: 'uji', items: [{ produkId: nasi, qty: 2 }], diskon: 1000 });
        assert.equal(Number(t.total), 23000);
        const r = await bacaTagihan(db, t.teks);
        assert.equal(r?.status, 'menunggu'); assert.equal(r?.kantin, 'Kantin Uji'); assert.equal(r?.item[0].nama, 'Nasi Rames');
        assert.equal((await statusTagihan(db, t.token, opr)).status, 'menunggu');

        const j = await bayarTagihan(db, { teks: t.teks, anggotaId: a.anggotaId, tanggal: TGL });
        assert.equal(Number(j.total), 23000);
        const s = await statusTagihan(db, t.token, opr);
        assert.equal(s.status, 'lunas');
        assert.equal(s.status === 'lunas' && s.noBukti, j.noBukti);
        await assert.rejects(bayarTagihan(db, { teks: t.teks, anggotaId: a.anggotaId, tanggal: TGL }), /sudah dibayar/);

        const t2 = await buatTagihan(db, { unitId, oprId: opr, opr: 'uji', items: [{ produkId: nasi, qty: 1 }] });
        await batalTagihan(db, t2.token, opr);
        await assert.rejects(bayarTagihan(db, { teks: t2.teks, anggotaId: a.anggotaId, tanggal: TGL }), /dibatalkan kasir/);

        const t3 = await buatTagihan(db, { unitId, oprId: opr, opr: 'uji', items: [{ produkId: nasi, qty: 1 }] });
        await db.query('UPDATE kantin_produk SET harga_jual = 15000 WHERE id = $1', [nasi]);
        await assert.rejects(bayarTagihan(db, { teks: t3.teks, anggotaId: a.anggotaId, tanggal: TGL }), /Harga berubah/);

        const t4 = await buatTagihan(db, { unitId, oprId: opr, opr: 'uji', items: [{ produkId: nasi, qty: 1 }] });
        await db.query("UPDATE kantin_tagihan SET berlaku_sampai = now() - interval '1 second' WHERE token = $1", [t4.token]);
        await assert.rejects(bayarTagihan(db, { teks: t4.teks, anggotaId: a.anggotaId, tanggal: TGL }), /kedaluwarsa/);
        assert.equal(await bacaTagihan(db, 'KOPKAR1:bukanTagihan'), null);
    });
});
