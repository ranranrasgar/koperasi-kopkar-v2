import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPool, withTx, type Db } from '../src/db.ts';
import { cekPasswordBaruAnggota, cocokPasswordAnggota, hashPasswordAnggota, masukAnggota } from '../src/anggota/akun.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

test('password anggota: bcrypt $2y$ (format PHP) dan MD5 lama', async () => {
    const h = await hashPasswordAnggota('rahasia123');
    assert.match(h, /^\$2y\$10\$/);
    assert.deepEqual(await cocokPasswordAnggota('rahasia123', h), { cocok: true, md5: false });
    assert.deepEqual(await cocokPasswordAnggota('salah', h), { cocok: false, md5: false });
    assert.deepEqual(await cocokPasswordAnggota('lama', md5('lama')), { cocok: true, md5: true });
    assert.deepEqual(await cocokPasswordAnggota('lama', md5('lain')), { cocok: false, md5: true });
    assert.deepEqual(await cocokPasswordAnggota('apa', null), { cocok: false, md5: false });
});

test('password baru anggota: minimal 8, huruf dan angka', () => {
    assert.equal(cekPasswordBaruAnggota('abc12'), 'Password minimal 8 karakter');
    assert.equal(cekPasswordBaruAnggota('abcdefgh'), 'Password harus berisi huruf dan angka');
    assert.equal(cekPasswordBaruAnggota('abcdefg1'), null);
});

// masukAnggota memakai Pool; transaksi uji dibungkus sebagai Pool lewat query milik klien transaksi.
const sebagaiPool = (db: Db) => ({ query: db.query.bind(db) }) as unknown as Parameters<typeof masukAnggota>[0];

test('login anggota: MD5 cocok diganti bcrypt, salah dan nonaktif ditolak', async () => {
    await inTx(async (db) => {
        const u = (await db.query(`SELECT u.id, u.username FROM app_user u JOIN anggota a ON a.id = u.anggota_id
            WHERE u.status AND a.aktif ORDER BY u.id LIMIT 1`)).rows[0];
        await db.query('UPDATE app_user SET password_hash = $1 WHERE id = $2', [md5('uji-lama-1'), u.id]);
        const p = sebagaiPool(db);

        assert.deepEqual(await masukAnggota(p, u.username, 'keliru'), { ok: false, alasan: 'salah' });
        assert.deepEqual(await masukAnggota(p, 'tidak-ada-' + u.username, 'uji-lama-1'), { ok: false, alasan: 'salah' });

        const r = await masukAnggota(p, u.username, 'uji-lama-1');
        assert.equal(r.ok, true);
        const hash = (await db.query('SELECT password_hash FROM app_user WHERE id = $1', [u.id])).rows[0].password_hash;
        assert.match(hash, /^\$2y\$/);
        assert.equal((await masukAnggota(p, u.username, 'uji-lama-1')).ok, true);

        await db.query('UPDATE app_user SET status = false WHERE id = $1', [u.id]);
        assert.deepEqual(await masukAnggota(p, u.username, 'uji-lama-1'), { ok: false, alasan: 'akun_nonaktif' });
        await db.query('UPDATE app_user SET status = true WHERE id = $1', [u.id]);
        await db.query('UPDATE anggota SET aktif = false WHERE id = (SELECT anggota_id FROM app_user WHERE id = $1)', [u.id]);
        assert.deepEqual(await masukAnggota(p, u.username, 'uji-lama-1'), { ok: false, alasan: 'anggota_nonaktif' });
    });
});
