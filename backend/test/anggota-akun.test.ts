import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPool, withTx, type Db } from '../src/db.ts';
import {
    akunUntukResetEmail, aturEmail, cariAkun, cekPasswordBaruAnggota, cocokJawaban, cocokPasswordAnggota, daftarAkun, gantiPassword,
    hashJawaban, hashPasswordAnggota, masukAnggota, pertanyaanUntuk, resetLewatJawaban,
} from '../src/anggota/akun.ts';

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
        assert.deepEqual(await masukAnggota(p, u.username, 'uji-lama-1'), { ok: false, alasan: 'akun_nonaktif', userId: Number(u.id) });
        await db.query('UPDATE app_user SET status = true WHERE id = $1', [u.id]);
        await db.query('UPDATE anggota SET aktif = false WHERE id = (SELECT anggota_id FROM app_user WHERE id = $1)', [u.id]);
        assert.deepEqual(await masukAnggota(p, u.username, 'uji-lama-1'), { ok: false, alasan: 'anggota_nonaktif' });
    });
});

test('jawaban keamanan: format migrasi (trim + huruf kecil), cocok tanpa beda huruf', async () => {
    const h = await hashJawaban('  Ibu Siti ');
    assert.match(h, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    assert.equal(await cocokJawaban('ibu siti', h), true);
    assert.equal(await cocokJawaban('IBU SITI  ', h), true);
    assert.equal(await cocokJawaban('ibu sita', h), false);
    assert.equal(await cocokJawaban('apa saja', null), false);
});

test('username login tanpa beda huruf besar/kecil dan spasi tepi (seperti MySQL lama)', async () => {
    const u = (await pool.query("SELECT id, username FROM app_user WHERE username <> trim(username) LIMIT 1")).rows[0];
    assert.ok(u, 'ada username lama berspasi tepi');
    assert.equal((await cariAkun(pool, { username: ` ${u.username.trim().toUpperCase()} ` }))?.user_id, String(u.id));
});

test('daftar akun: aturan server lama + password K6, anggota dan karyawan Mattel', async () => {
    await inTx(async (db) => {
        const tanya = Number((await db.query('SELECT id FROM pertanyaan ORDER BY urut LIMIT 1')).rows[0].id);
        // Anggota aktif ber-NIK 6 karakter yang belum punya akun.
        const a = (await db.query(`SELECT a.id, a.nik, a.kode_agt FROM anggota a WHERE a.aktif AND length(a.nik) = 6
            AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id OR u.kode_agt = a.kode_agt)
            AND (SELECT count(*) FROM anggota b WHERE b.nik = a.nik) = 1 LIMIT 1`)).rows[0];
        const isi = (x: object = {}) => ({ username: 'uji_daftar_pwa', password: 'Rahasia123', ulangi: 'Rahasia123', nik: a.nik,
            email: 'uji.daftar.pwa@contoh.id', pertanyaanId: tanya, jawaban: 'Kucing', ...x });
        const tolak = async (x: object, pesan: RegExp) => {
            const r = await daftarAkun(db, isi(x));
            assert.equal(r.ok, false, JSON.stringify(x));
            if (!r.ok) assert.match(r.error, pesan);
        };
        const lama = (await db.query('SELECT username FROM app_user LIMIT 1')).rows[0].username;
        await tolak({ username: lama.toUpperCase() }, /sudah terdaftar/);
        await tolak({ username: 'ab' }, /3 sampai 50/);
        await tolak({ username: 'nama<script>' }, /hanya boleh/);
        await tolak({ ulangi: 'Rahasia124' }, /sama persis/);
        await tolak({ password: 'pendek1', ulangi: 'pendek1' }, /minimal 8/);
        await tolak({ jawaban: ' ' }, /Jawaban/);
        await tolak({ email: 'bukan-email' }, /Alamat email tidak valid/);
        await tolak({ email: '' }, /Alamat email tidak valid/);
        await tolak({ nik: '12345' }, /NIK tidak valid/);
        await tolak({ nik: '999999' }, /tidak terdaftar di data karyawan/);

        const ok = await daftarAkun(db, isi());
        assert.equal(ok.ok, true);
        const u = await cariAkun(db, { username: 'UJI_DAFTAR_PWA' });
        assert.equal(u?.anggota_id, String(a.id));
        assert.equal(u?.kode_agt, a.kode_agt);
        assert.equal(u?.akun_aktif, false, 'akun baru belum aktif sampai email diverifikasi');
        assert.equal(u?.email, 'uji.daftar.pwa@contoh.id');
        assert.equal((await db.query(`SELECT count(*)::int n FROM email_antrean WHERE jenis = 'verifikasi' AND ke = 'uji.daftar.pwa@contoh.id'`)).rows[0].n, 1);
        assert.match(u!.password_hash!, /^\$2y\$/);
        await tolak({ username: 'uji_lain_pwa' }, /sudah terdaftar/); // anggota yang sama

        // Karyawan Mattel yang belum anggota: akun tanpa keanggotaan, kode_agt = NIK.
        const k = (await db.query(`SELECT k.nik FROM karyawan_mattel k WHERE length(k.nik) = 6
            AND NOT EXISTS (SELECT 1 FROM anggota a WHERE a.nik = k.nik) AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.kode_agt = k.nik) LIMIT 1`)).rows[0];
        await tolak({ username: 'uji_karyawan_pwa', nik: k.nik }, /Email ini sudah dipakai/); // email sama dengan akun lain
        const r2 = await daftarAkun(db, isi({ username: 'uji_karyawan_pwa', nik: k.nik, email: 'uji.karyawan.pwa@contoh.id' }));
        assert.equal(r2.ok, true);
        const u2 = await cariAkun(db, { username: 'uji_karyawan_pwa' });
        assert.equal(u2?.anggota_id, null);
        assert.equal(u2?.kode_agt, k.nik);
    });
});

test('lupa password lewat jawaban, ganti password, dan email unik', async () => {
    await inTx(async (db) => {
        const u = (await db.query(`SELECT u.id, u.username FROM app_user u JOIN anggota a ON a.id = u.anggota_id
            WHERE u.status AND a.aktif ORDER BY u.id LIMIT 1`)).rows[0];
        const id = Number(u.id);
        await db.query('UPDATE app_user SET jawaban_hash = $1, pertanyaan_id = (SELECT id FROM pertanyaan ORDER BY urut LIMIT 1) WHERE id = $2',
            [await hashJawaban('Kucing'), id]);

        // Pertanyaan: akun asli dapat pertanyaannya; username fiktif tetap dapat pertanyaan (tidak membocorkan).
        assert.equal(await pertanyaanUntuk(db, u.username), (await db.query('SELECT pertanyaan FROM pertanyaan ORDER BY urut LIMIT 1')).rows[0].pertanyaan);
        assert.ok(await pertanyaanUntuk(db, 'tidak-ada-sama-sekali-xyz'));

        const salah = await resetLewatJawaban(db, u.username, 'anjing', 'Baru12345', 'Baru12345');
        assert.deepEqual(salah, { ok: false, error: 'Username atau jawaban tidak cocok' });
        assert.deepEqual(await resetLewatJawaban(db, 'tidak-ada-xyz', 'kucing', 'Baru12345', 'Baru12345'), salah);
        assert.equal((await resetLewatJawaban(db, u.username, ' KUCING ', 'Baru12345', 'Baru12345')).ok, true);
        assert.equal((await cocokPasswordAnggota('Baru12345', (await cariAkun(db, { id }))!.password_hash)).cocok, true);

        assert.deepEqual(await gantiPassword(db, id, 'keliru', 'Lain12345', 'Lain12345'), { ok: false, error: 'Password lama salah' });
        assert.equal((await gantiPassword(db, id, 'Baru12345', 'Lain12345', 'Lain12345')).ok, true);

        const lain = (await db.query('SELECT id FROM app_user WHERE id <> $1 ORDER BY id LIMIT 1', [id])).rows[0].id;
        await db.query("UPDATE app_user SET email = 'Dipakai@Contoh.id' WHERE id = $1", [lain]);
        assert.deepEqual(await aturEmail(db, id, 'dipakai@contoh.id'), { ok: false, error: 'Email ini sudah dipakai, gunakan email lain.' });
        assert.deepEqual(await aturEmail(db, id, 'bukan email'), { ok: false, error: 'Alamat email tidak valid' });
        assert.equal((await aturEmail(db, id, ' Saya@Contoh.ID ')).ok, true);
        assert.equal((await akunUntukResetEmail(db, u.username.toUpperCase(), 'saya@contoh.id'))?.id, String(id));
        assert.equal(await akunUntukResetEmail(db, u.username, 'lain@contoh.id'), null);
    });
});
