import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import {
    bersihkanYatim, gambarIdUntuk, GambarSalah, jenisGambar, lepasGambar, MAKS_GAMBAR, simpanGambar, tautkanGambar, tokenGambar,
} from '../src/anggota/gambar.ts';
import { kirimKeSemuaAnggota, kirimNotifikasi } from '../src/anggota/push.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
delete process.env.VAPID_SUBJECT;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

test('jenisGambar dari isi file, bukan nama', () => {
    assert.equal(jenisGambar(PNG), 'image/png');
    assert.equal(jenisGambar(WEBP), 'image/webp');
    assert.equal(jenisGambar(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
    assert.equal(jenisGambar(new TextEncoder().encode('<svg onload=alert(1)>')), null);
});

test('simpanGambar menolak kosong, bukan gambar, dan terlalu besar', async () => {
    await inTx(async (db) => {
        await assert.rejects(simpanGambar(db, new Uint8Array(0)), GambarSalah);
        await assert.rejects(simpanGambar(db, new TextEncoder().encode('bukan gambar')), /JPG, PNG, atau WEBP/);
        const besar = new Uint8Array(MAKS_GAMBAR + 1); besar.set(PNG);
        await assert.rejects(simpanGambar(db, besar), /terlalu besar/);
        const g = await simpanGambar(db, PNG);
        assert.match(g.token, /^[0-9a-f]{32}$/);
    });
});

test('tautan gambar: ganti, lepas, dan gambar yatim dibersihkan', async () => {
    await inTx(async (db) => {
        const a = await simpanGambar(db, PNG), b = await simpanGambar(db, WEBP);
        await tautkanGambar(db, 'promo', 987654, a.id);
        assert.equal((await tokenGambar(db, 'promo', [987654])).get(987654), a.token);
        await tautkanGambar(db, 'promo', 987654, b.id);
        await bersihkanYatim(db);
        assert.equal(await gambarIdUntuk(db, 'promo', 987654), b.id);
        assert.equal((await db.query('SELECT 1 FROM pengumuman_gambar WHERE id = $1', [a.id])).rows.length, 0); // gambar lama terhapus
        await lepasGambar(db, 'promo', 987654);
        assert.equal(await gambarIdUntuk(db, 'promo', 987654), null);
        assert.equal((await db.query('SELECT 1 FROM pengumuman_gambar WHERE id = $1', [b.id])).rows.length, 0);
    });
});

test('notifikasi bergambar: satu gambar dipakai bersama semua penerima siaran', async () => {
    await inTx(async (db) => {
        const g = await simpanGambar(db, PNG);
        const h = await kirimKeSemuaAnggota(db, { judul: 'Promo', isi: 'Siaran bergambar uji', gambarId: g.id });
        const ref = await db.query(
            `SELECT count(*)::int n, count(DISTINCT r.gambar_id)::int g FROM log_notifikasi l JOIN pengumuman_gambar_ref r ON r.jenis = 'notifikasi' AND r.ref_id = l.id
              WHERE l.pesan = 'Siaran bergambar uji'`);
        assert.equal(ref.rows[0].n, h.penerima);
        assert.equal(ref.rows[0].g, 1);
        assert.equal((await db.query('SELECT count(*)::int n FROM pengumuman_gambar WHERE id = $1', [g.id])).rows[0].n, 1);

        const a = await db.query('SELECT id FROM anggota WHERE aktif LIMIT 1');
        await kirimNotifikasi(db, Number(a.rows[0].id), { judul: 'Satu', isi: 'Satu bergambar uji', gambarId: g.id });
        const satu = await db.query(`SELECT id FROM log_notifikasi WHERE pesan = 'Satu bergambar uji'`);
        assert.equal((await tokenGambar(db, 'notifikasi', [Number(satu.rows[0].id)])).get(Number(satu.rows[0].id)), g.token);
    });
});
