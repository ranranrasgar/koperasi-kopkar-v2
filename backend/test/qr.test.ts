import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { bacaQr, buatQr } from '../src/anggota/qr.ts';
import { createPool, withTx, type Db } from '../src/db.ts';

const pool = createPool();
after(() => pool.end());

class Batal extends Error {}
const inTx = (fn: (db: Db) => Promise<void>) => withTx(pool, async (db) => { await fn(db); throw new Batal(); }).catch((e) => { if (!(e instanceof Batal)) throw e; });

test('QR pinjaman: milik sendiri terbaca, milik orang lain ditolak, kedaluwarsa ditolak', () => inTx(async (db) => {
    const p = (await db.query('SELECT no_pinjaman, anggota_id FROM pinjaman_tunai ORDER BY id DESC LIMIT 1')).rows[0];
    const lain = (await db.query('SELECT id FROM anggota WHERE id <> $1 LIMIT 1', [p.anggota_id])).rows[0].id;
    assert.equal(await buatQr(db, Number(lain), 'tunai', p.no_pinjaman), null);

    const qr = await buatQr(db, Number(p.anggota_id), 'tunai', p.no_pinjaman);
    assert.ok(qr);
    assert.doesNotMatch(qr.teks, new RegExp(p.no_pinjaman));
    const isi = await bacaQr(db, ` ${qr.teks} `);
    assert.equal(isi?.jenis, 'tunai');
    assert.equal(isi?.ref, p.no_pinjaman);

    await db.query("UPDATE qr_anggota SET berlaku_sampai = now() - interval '1 second'");
    assert.equal(await bacaQr(db, qr.teks), null);
}));

test('QR simpanan: jenis harus ada; teks asing tidak dikenali', () => inTx(async (db) => {
    const a = (await db.query('SELECT id FROM anggota LIMIT 1')).rows[0].id;
    const j = (await db.query('SELECT kode_simpanan FROM jenis_simpanan LIMIT 1')).rows[0].kode_simpanan;
    assert.ok(await buatQr(db, Number(a), 'simpanan', j));
    assert.equal(await buatQr(db, Number(a), 'simpanan', 'TIDAK-ADA'), null);
    assert.equal(await bacaQr(db, 'https://contoh.id'), null);
    assert.equal(await bacaQr(db, "KOPKAR1:' OR 1=1 --"), null);
}));

test('QR saya: menunjuk anggota tanpa tujuan', () => inTx(async (db) => {
    const a = (await db.query('SELECT id, kode_agt FROM anggota LIMIT 1')).rows[0];
    const qr = await buatQr(db, Number(a.id), 'anggota');
    assert.ok(qr);
    const isi = await bacaQr(db, qr.teks);
    assert.equal(isi?.jenis, 'anggota');
    assert.equal(isi?.ref, '');
    assert.equal(isi?.kode_agt, a.kode_agt);
}));
