import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createPool, withTx, type Db } from '../src/db.ts';
import {
    akunUntukResetEmail, aturEmail, cariAkun, cariAkunGoogle, cekPasswordBaruAnggota, daftarMenungguAdmin, bersihkanLengkap, dataLengkapiAnggota, hapusAkunAplikasi, hapusKeanggotaan, jadikanAnggota, putuskanPendaftaran, cocokJawaban, cocokPasswordAnggota, daftarAkun, gantiPassword,
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
        assert.deepEqual(await masukAnggota(p, u.username, 'uji-lama-1'), { ok: false, alasan: 'akun_nonaktif', userId: Number(u.id), menungguAdmin: false });
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
        // Anggota aktif ber-NIK 6 karakter yang belum punya akun.
        const a = (await db.query(`SELECT a.id, a.nik, a.kode_agt FROM anggota a WHERE a.aktif AND length(a.nik) = 6
            AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id OR u.kode_agt = a.kode_agt)
            AND (SELECT count(*) FROM anggota b WHERE b.nik = a.nik) = 1 LIMIT 1`)).rows[0];
        const isi = (x: object = {}) => ({ username: 'uji_daftar_pwa', password: 'Rahasia123', ulangi: 'Rahasia123', nik: a.nik,
            email: 'uji.daftar.pwa@contoh.id', ...x });
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

test('daftar lewat Google: email terverifikasi tanpa kode, akun menunggu admin; setujui atau tolak; masuk lewat sub', async () => {
    await inTx(async (db) => {
        const a = (await db.query(`SELECT a.id, a.nik FROM anggota a WHERE a.aktif AND length(a.nik) = 6
            AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id OR u.kode_agt = a.kode_agt)
            AND (SELECT count(*) FROM anggota b WHERE b.nik = a.nik) = 1 LIMIT 1`)).rows[0];
        const isi = { username: 'uji_google_pwa', password: 'Rahasia123', ulangi: 'Rahasia123', nik: a.nik,
            email: 'Uji.Google.PWA@contoh.id' };
        assert.equal(await cariAkunGoogle(db, 'sub-uji-1', isi.email), null, 'belum ada akun');

        const r = await daftarAkun(db, isi, { sub: 'sub-uji-1' });
        assert.equal(r.ok, true);
        const u = await cariAkun(db, { username: 'uji_google_pwa' });
        assert.equal(u?.akun_aktif, false, 'belum aktif: menunggu persetujuan admin');
        assert.equal(u?.menunggu_admin, true);
        assert.equal(u?.email, 'uji.google.pwa@contoh.id');
        assert.equal((await db.query(`SELECT count(*)::int n FROM email_antrean WHERE jenis = 'verifikasi' AND ke = 'uji.google.pwa@contoh.id'`)).rows[0].n, 0);
        assert.ok((await db.query('SELECT terverifikasi_pada FROM app_user_email_verif WHERE app_user_id = $1', [u!.user_id])).rows[0].terverifikasi_pada);

        assert.equal(await cariAkunGoogle(db, 'sub-uji-1', 'apa-saja@contoh.id'), Number(u!.user_id), 'ditemukan lewat sub');
        assert.equal(await cariAkunGoogle(db, 'sub-lain', 'Uji.Google.PWA@contoh.id'), null, 'akun sudah tertaut ke Google lain: tidak diambil alih lewat email');

        // Login ditolak dengan penanda menunggu admin; muncul di daftar persetujuan.
        const p = sebagaiPool(db);
        const masuk = await masukAnggota(p, 'uji_google_pwa', 'Rahasia123');
        assert.deepEqual(masuk, { ok: false, alasan: 'akun_nonaktif', userId: Number(u!.user_id), menungguAdmin: true });
        const antre = (await daftarMenungguAdmin(db)).find((x) => x.id === Number(u!.user_id));
        assert.equal(antre?.email_terverifikasi, true);
        assert.equal(antre?.google, true);
        assert.equal(antre?.anggota, true);

        // Setujui: aktif dan keluar dari daftar. Keputusan kedua ditolak (sudah diputuskan).
        const ok = await putuskanPendaftaran(db, Number(u!.user_id), true);
        assert.equal(ok.ok, true);
        assert.equal((await cariAkun(db, { username: 'uji_google_pwa' }))?.akun_aktif, true);
        assert.equal((await masukAnggota(p, 'uji_google_pwa', 'Rahasia123')).ok, true);
        assert.equal((await daftarMenungguAdmin(db)).some((x) => x.id === Number(u!.user_id)), false);
        assert.equal((await putuskanPendaftaran(db, Number(u!.user_id), false)).ok, false);
    });
});

test('cari akun Google: email sama hanya cocok bila email akun terverifikasi', async () => {
    await inTx(async (db) => {
        const u = (await db.query(`SELECT u.id FROM app_user u WHERE u.status AND NOT EXISTS (SELECT 1 FROM app_user_google g WHERE g.app_user_id = u.id) ORDER BY u.id LIMIT 1`)).rows[0];
        await db.query(`UPDATE app_user SET email = 'uji.tautan@contoh.id' WHERE id = $1`, [u.id]);
        await db.query('DELETE FROM app_user_email_verif WHERE app_user_id = $1', [u.id]);
        assert.equal(await cariAkunGoogle(db, 'sub-uji-2', 'uji.tautan@contoh.id'), null, 'email belum terverifikasi: tidak ditautkan');
        await db.query(`INSERT INTO app_user_email_verif (app_user_id, email, terverifikasi_pada) VALUES ($1, 'uji.tautan@contoh.id', now())`, [u.id]);
        assert.equal(await cariAkunGoogle(db, 'sub-uji-2', 'Uji.Tautan@contoh.id'), Number(u.id), 'email terverifikasi: ditautkan');
        assert.equal(await cariAkunGoogle(db, 'sub-uji-2', 'lain@contoh.id'), Number(u.id), 'berikutnya lewat sub');
    });
});

test('pendaftaran dengan kode email: email belum terverifikasi tidak bisa disetujui; tolak membiarkan akun nonaktif', async () => {
    await inTx(async (db) => {
        const a = (await db.query(`SELECT a.id, a.nik FROM anggota a WHERE a.aktif AND length(a.nik) = 6
            AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id OR u.kode_agt = a.kode_agt)
            AND (SELECT count(*) FROM anggota b WHERE b.nik = a.nik) = 1 LIMIT 1`)).rows[0];
        const r = await daftarAkun(db, { username: 'uji_kode_pwa', password: 'Rahasia123', ulangi: 'Rahasia123', nik: a.nik,
            email: 'uji.kode.pwa@contoh.id' });
        assert.equal(r.ok, true);
        const id = Number((r as { userId: number }).userId);
        assert.equal((await putuskanPendaftaran(db, id, true)).ok, false, 'email belum terverifikasi');
        const tolak = await putuskanPendaftaran(db, id, false);
        assert.equal(tolak.ok, true);
        const u = await cariAkun(db, { id });
        assert.equal(u?.akun_aktif, false);
        assert.equal(u?.menunggu_admin, false);
    });
});

test('hapus akun aplikasi: data aplikasi ikut terhapus, anggota dan data keuangannya tidak', async () => {
    await inTx(async (db) => {
        const a = (await db.query(`SELECT a.id, a.nik FROM anggota a WHERE a.aktif AND length(a.nik) = 6
            AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id OR u.kode_agt = a.kode_agt)
            AND (SELECT count(*) FROM anggota b WHERE b.nik = a.nik) = 1 LIMIT 1`)).rows[0];
        const r = await daftarAkun(db, { username: 'uji_hapus_pwa', password: 'Rahasia123', ulangi: 'Rahasia123', nik: a.nik,
            email: 'uji.hapus.pwa@contoh.id' }, { sub: 'sub-uji-hapus' });
        const id = Number((r as { userId: number }).userId);
        await db.query(`INSERT INTO pesan_percakapan (anggota_id, app_user_id, subjek) VALUES ($1, $2, 'uji')`, [a.id, id]);
        await db.query(`INSERT INTO app_user_foto (app_user_id, isi, jenis) VALUES ($1, 'x', 'image/png')`, [id]);

        const h = await hapusAkunAplikasi(db, id);
        assert.deepEqual(h, { ok: true, pesan: 'Akun uji_hapus_pwa dan data aplikasinya dihapus', punyaAnggota: true });
        assert.equal(await cariAkun(db, { id }), null);
        for (const [tabel, kolom] of [['app_user_foto', 'app_user_id'], ['app_user_google', 'app_user_id'], ['app_user_email_verif', 'app_user_id'], ['pesan_percakapan', 'anggota_id']] as const) {
            const n = (await db.query(`SELECT count(*)::int n FROM ${tabel} WHERE ${kolom} = $1`, [kolom === 'anggota_id' ? a.id : id])).rows[0].n;
            assert.equal(n, 0, tabel);
        }
        assert.equal((await db.query('SELECT count(*)::int n FROM anggota WHERE id = $1', [a.id])).rows[0].n, 1, 'anggota tetap ada');
        assert.equal((await hapusAkunAplikasi(db, id)).ok, false, 'sudah terhapus');
    });
});

test('setujui pendaftaran karyawan Mattel: otomatis jadi anggota dengan kode berformat lama', async () => {
    await inTx(async (db) => {
        const k = (await db.query(`SELECT k.nik, k.nama, k.grade FROM karyawan_mattel k WHERE length(k.nik) = 6
            AND NOT EXISTS (SELECT 1 FROM anggota a WHERE a.nik = k.nik) AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.kode_agt = k.nik) LIMIT 1`)).rows[0];
        const r = await daftarAkun(db, { username: 'uji_jadi_anggota', password: 'Rahasia123', ulangi: 'Rahasia123', nik: k.nik,
            email: 'uji.jadi.anggota@contoh.id' }, { sub: 'sub-uji-anggota' });
        const id = Number((r as { userId: number }).userId);
        const maks = Number((await db.query('SELECT max(urut) m FROM anggota')).rows[0].m);
        const bulan = (await db.query(`SELECT to_char(now() AT TIME ZONE 'Asia/Jakarta', 'MMYY') b`)).rows[0].b;
        const oleh = (await db.query('SELECT id, nama FROM opr ORDER BY id LIMIT 1')).rows[0];

        const h = await putuskanPendaftaran(db, id, true, { id: Number(oleh.id), nama: oleh.nama });
        assert.equal(h.ok, true);
        const kode = `${bulan}-${String(maks + 1).padStart(4, '0')}`;
        assert.equal((h as { kodeAnggota?: string }).kodeAnggota, kode);

        const u = await cariAkun(db, { id });
        assert.equal(u?.akun_aktif, true);
        assert.equal(u?.kode_agt, kode);
        assert.ok(u?.anggota_id, 'akun terhubung ke anggota');
        const a = (await db.query('SELECT * FROM anggota WHERE id = $1', [u!.anggota_id])).rows[0];
        assert.equal(a.nik, k.nik);
        assert.equal(a.urut, maks + 1);
        assert.equal(a.aktif, true);
        assert.equal(a.agt_non_agt, true);
        assert.equal(a.grade, (k.grade ?? '').trim());
        assert.equal(a.opr, oleh.nama.slice(0, 15));
        assert.ok(a.karyawan_mattel_id, 'tertaut ke karyawan Mattel');
        assert.equal((await db.query('SELECT count(*)::int n FROM anggota_detail WHERE anggota_id = $1 AND kode_agt = $2', [u!.anggota_id, kode])).rows[0].n, 1);

        // Idempoten: akun yang sudah anggota tidak dibuatkan lagi.
        const lagi = await jadikanAnggota(db, id, { id: Number(oleh.id), nama: oleh.nama });
        assert.deepEqual(lagi, { ok: true, kode, dibuat: false });
        assert.equal((await db.query('SELECT max(urut) m FROM anggota')).rows[0].m, maks + 1);
    });
});

test('keputusan pendaftaran tercatat (disetujui / ditolak) untuk filter User Mobile', async () => {
    await inTx(async (db) => {
        const buat = async (username: string, email: string) => {
            const a = (await db.query(`SELECT a.nik FROM anggota a WHERE a.aktif AND length(a.nik) = 6
                AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id OR u.kode_agt = a.kode_agt)
                AND NOT EXISTS (SELECT 1 FROM app_user u2 WHERE u2.nikk = a.nik)
                AND (SELECT count(*) FROM anggota b WHERE b.nik = a.nik) = 1 ORDER BY a.id LIMIT 1`)).rows[0];
            const r = await daftarAkun(db, { username, password: 'Rahasia123', ulangi: 'Rahasia123', nik: a.nik, email }, { sub: `sub-${username}` });
            return Number((r as { userId: number }).userId);
        };
        const setuju = await buat('uji_putus_ya', 'uji.putus.ya@contoh.id');
        const tolak = await buat('uji_putus_tidak', 'uji.putus.tidak@contoh.id');
        await putuskanPendaftaran(db, setuju, true, { id: 1, nama: 'uji' });
        await putuskanPendaftaran(db, tolak, false, { id: 1, nama: 'uji' });
        const k = async (id: number) => (await db.query('SELECT status, menunggu_admin, keputusan_daftar FROM app_user WHERE id = $1', [id])).rows[0];
        assert.deepEqual(await k(setuju), { status: true, menunggu_admin: false, keputusan_daftar: 'disetujui' });
        assert.deepEqual(await k(tolak), { status: false, menunggu_admin: false, keputusan_daftar: 'ditolak' });
    });
});

test('pertanyaan keamanan hanya untuk akun tanpa email terverifikasi; daftar baru tanpa pertanyaan', async () => {
    await inTx(async (db) => {
        // Pendaftaran baru tidak menyimpan pertanyaan/jawaban.
        const a = (await db.query(`SELECT a.nik FROM anggota a WHERE a.aktif AND length(a.nik) = 6
            AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id OR u.kode_agt = a.kode_agt)
            AND (SELECT count(*) FROM anggota b WHERE b.nik = a.nik) = 1 LIMIT 1`)).rows[0];
        const r = await daftarAkun(db, { username: 'uji_tanpa_tanya', password: 'Rahasia123', ulangi: 'Rahasia123', nik: a.nik, email: 'uji.tanpa.tanya@contoh.id' });
        assert.equal(r.ok, true);
        const baru = (await db.query(`SELECT pertanyaan_id, id_pertanyaan, jawaban_hash FROM app_user WHERE username = 'uji_tanpa_tanya'`)).rows[0];
        assert.deepEqual(baru, { pertanyaan_id: null, id_pertanyaan: null, jawaban_hash: null });

        // Akun lama berjawaban: tanpa email terverifikasi boleh reset lewat jawaban; dengan email terverifikasi ditolak.
        const u = (await db.query(`SELECT u.id FROM app_user u WHERE u.status AND u.jawaban_hash IS NOT NULL AND u.pertanyaan_id IS NOT NULL ORDER BY u.id LIMIT 1`)).rows[0];
        await db.query('UPDATE app_user SET jawaban_hash = $2 WHERE id = $1', [u.id, await hashJawaban('Kucing')]);
        await db.query('DELETE FROM app_user_email_verif WHERE app_user_id = $1', [u.id]);
        const nama = (await db.query('SELECT username, email FROM app_user WHERE id = $1', [u.id])).rows[0];
        const ok = await resetLewatJawaban(db, nama.username, 'kucing', 'Baru12345', 'Baru12345');
        assert.equal(ok.ok, true, 'tanpa email terverifikasi: boleh');
        await db.query(`UPDATE app_user SET email = 'uji.lama@contoh.id' WHERE id = $1`, [u.id]);
        await db.query(`INSERT INTO app_user_email_verif (app_user_id, email, terverifikasi_pada) VALUES ($1, 'uji.lama@contoh.id', now())`, [u.id]);
        const ditolak = await resetLewatJawaban(db, nama.username, 'kucing', 'Baru12345', 'Baru12345');
        assert.equal(ditolak.ok, false);
        if (!ditolak.ok) assert.match(ditolak.error, /Lewat email/);
    });
});

test('hapus keanggotaan: anggota baru dari karyawan Mattel hilang, karyawan kembali bukan anggota; anggota bertransaksi ditolak', async () => {
    await inTx(async (db) => {
        const k = (await db.query(`SELECT k.id, k.nik FROM karyawan_mattel k WHERE length(k.nik) = 6
            AND NOT EXISTS (SELECT 1 FROM anggota a WHERE a.nik = k.nik) AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.kode_agt = k.nik) LIMIT 1`)).rows[0];
        const r = await daftarAkun(db, { username: 'uji_hapus_agt', password: 'Rahasia123', ulangi: 'Rahasia123', nik: k.nik, email: 'uji.hapus.agt@contoh.id' }, { sub: 'sub-uji-hapus-agt' });
        const id = Number((r as { userId: number }).userId);
        const oleh = (await db.query('SELECT id, nama FROM opr ORDER BY id LIMIT 1')).rows[0];
        assert.equal((await putuskanPendaftaran(db, id, true, { id: Number(oleh.id), nama: oleh.nama })).ok, true);
        const anggotaId = (await cariAkun(db, { id }))!.anggota_id!;
        const tertaut = async () => Number((await db.query('SELECT count(*) n FROM anggota WHERE karyawan_mattel_id = $1', [k.id])).rows[0].n);
        assert.equal(await tertaut(), 1);

        // Akun masih memakai anggota: ditolak. Setelah akun dihapus, keanggotaan terhapus.
        assert.equal((await hapusKeanggotaan(db, anggotaId)).ok, false);
        assert.equal((await hapusAkunAplikasi(db, id)).ok, true);
        const h = await hapusKeanggotaan(db, anggotaId);
        assert.equal(h.ok, true);
        assert.equal(await tertaut(), 0, 'karyawan kembali bukan anggota');
        assert.equal((await db.query('SELECT count(*)::int n FROM anggota_detail WHERE anggota_id = $1', [anggotaId])).rows[0].n, 0);
        assert.equal((await hapusKeanggotaan(db, anggotaId)).ok, false, 'sudah terhapus');

        // Anggota yang sudah punya simpanan tidak boleh dihapus.
        const a = (await db.query('SELECT anggota_id::text id FROM simpanan GROUP BY anggota_id LIMIT 1')).rows[0];
        const tolak = await hapusKeanggotaan(db, a.id);
        assert.equal(tolak.ok, false);
        assert.match((tolak as { error: string }).error, /simpanan/);
    });
});

test('kelengkapan anggota baru: nilai awal dari pengaturan, diubah admin saat menyetujui, validasi data', async () => {
    await inTx(async (db) => {
        const k = (await db.query(`SELECT k.nik FROM karyawan_mattel k WHERE length(k.nik) = 6
            AND NOT EXISTS (SELECT 1 FROM anggota a WHERE a.nik = k.nik) AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.kode_agt = k.nik) LIMIT 1`)).rows[0];
        const r = await daftarAkun(db, { username: 'uji_lengkap', password: 'Rahasia123', ulangi: 'Rahasia123', nik: k.nik, email: 'uji.lengkap@contoh.id' }, { sub: 'sub-uji-lengkap' });
        const id = Number((r as { userId: number }).userId);
        const oleh = (await db.query('SELECT id, nama FROM opr ORDER BY id LIMIT 1')).rows[0];
        for (const [kunci, nilai] of [['anggota_baru_pokok', '100000'], ['anggota_baru_wajib', '50000'], ['anggota_baru_sukarela', '25000']]) {
            await db.query(`INSERT INTO pengaturan_web (kunci, nilai) VALUES ($1, $2) ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai`, [kunci, nilai]);
        }
        const d = await dataLengkapiAnggota(db, id);
        assert.equal(d.ok, true);
        assert.equal((d as { sudahAnggota: boolean }).sudahAnggota, false);
        const form = (d as { form: Parameters<typeof bersihkanLengkap>[0] }).form;
        assert.deepEqual([form.pokok, form.wajib, form.sukarela], ['100000', '50000', '25000']);
        assert.deepEqual((d as { dariPengaturan: object }).dariPengaturan, { pokok: true, wajib: true, sukarela: true });

        assert.equal(typeof bersihkanLengkap({ ...form, nama: '' }), 'string');
        assert.equal(typeof bersihkanLengkap({ ...form, pokok: '-5' }), 'string');
        assert.equal(typeof bersihkanLengkap({ ...form, jnsKelamin: 'X' }), 'string');

        // Admin mengubah nilai dan melengkapi data saat menyetujui.
        const h = await putuskanPendaftaran(db, id, true, { id: Number(oleh.id), nama: oleh.nama },
            { ...form, nama: 'Nama Uji Lengkap', jnsKelamin: 'p', kota: 'Bekasi', kodepos: '17530', bankNama: 'BCA', wajib: '75000', sukarela: '0' });
        assert.equal(h.ok, true);
        const a = (await db.query('SELECT * FROM anggota WHERE kode_agt = $1', [(h as { kodeAnggota: string }).kodeAnggota])).rows[0];
        assert.equal(a.nama, 'Nama Uji Lengkap');
        assert.equal(a.jns_kelamin, 'P');
        assert.equal(a.kota, 'Bekasi');
        assert.equal(a.kodepos, 17530);
        assert.equal(Number(a.simpanan_pokok), 100000);
        assert.equal(Number(a.simpanan_wajib), 75000);
        assert.equal(Number(a.simpanan_sukarela), 0);
    });
});

test('grade: anggota baru tertaut ke tabel grade, nominal mengikuti tabel, perubahan grade menjalar ke anggota', async () => {
    await inTx(async (db) => {
        const k = (await db.query(`SELECT k.nik, btrim(k.grade) grade FROM karyawan_mattel k JOIN grade g ON g.nama = btrim(k.grade)
            WHERE length(k.nik) = 6 AND NOT EXISTS (SELECT 1 FROM anggota a WHERE a.nik = k.nik) AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.kode_agt = k.nik) LIMIT 1`)).rows[0];
        const r = await daftarAkun(db, { username: 'uji_grade', password: 'Rahasia123', ulangi: 'Rahasia123', nik: k.nik, email: 'uji.grade@contoh.id' }, { sub: 'sub-uji-grade' });
        const id = Number((r as { userId: number }).userId);
        const oleh = (await db.query('SELECT id, nama FROM opr ORDER BY id LIMIT 1')).rows[0];
        const g = (await db.query('SELECT id, nominal FROM grade WHERE nama = $1', [k.grade])).rows[0];

        const d = await dataLengkapiAnggota(db, id);
        assert.equal((d as { form: { grade: string } }).form.grade, k.grade, 'grade karyawan terpilih otomatis');
        assert.ok((d as { daftarGrade: unknown[] }).daftarGrade.length > 10);

        const tolak = await putuskanPendaftaran(db, id, true, { id: Number(oleh.id), nama: oleh.nama }, { ...(d as { form: Parameters<typeof bersihkanLengkap>[0] }).form, grade: 'ZZ99' }).catch((e) => e);
        assert.match(String(tolak.message ?? tolak.error), /tidak ada di tabel grade/);
    });
    await inTx(async (db) => {
        const k = (await db.query(`SELECT k.nik, btrim(k.grade) grade FROM karyawan_mattel k JOIN grade g ON g.nama = btrim(k.grade)
            WHERE length(k.nik) = 6 AND NOT EXISTS (SELECT 1 FROM anggota a WHERE a.nik = k.nik) AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.kode_agt = k.nik) LIMIT 1`)).rows[0];
        const r = await daftarAkun(db, { username: 'uji_grade2', password: 'Rahasia123', ulangi: 'Rahasia123', nik: k.nik, email: 'uji.grade2@contoh.id' }, { sub: 'sub-uji-grade2' });
        const id = Number((r as { userId: number }).userId);
        const oleh = (await db.query('SELECT id, nama FROM opr ORDER BY id LIMIT 1')).rows[0];
        const h = await putuskanPendaftaran(db, id, true, { id: Number(oleh.id), nama: oleh.nama });
        const kode = (h as { kodeAnggota: string }).kodeAnggota;
        const a = (await db.query('SELECT a.grade, a.rp_grade, a.grade_id, g.nominal FROM anggota a LEFT JOIN grade g ON g.id = a.grade_id WHERE a.kode_agt = $1', [kode])).rows[0];
        assert.equal(a.grade, k.grade);
        assert.ok(a.grade_id, 'tertaut ke grade');
        assert.equal(Number(a.rp_grade), Number(a.nominal), 'nominal mengikuti tabel grade');

        // Mengubah nominal grade menjalar ke anggota bergrade itu.
        await db.query('UPDATE grade SET nominal = 7777000 WHERE id = $1', [a.grade_id]);
        assert.equal(Number((await db.query('SELECT rp_grade FROM anggota WHERE kode_agt = $1', [kode])).rows[0].rp_grade), 7777000);
        // Mengganti grade_id anggota menyalin nama dan nominal grade baru.
        const lain = (await db.query('SELECT id, nama, nominal FROM grade WHERE id <> $1 LIMIT 1', [a.grade_id])).rows[0];
        await db.query('UPDATE anggota SET grade_id = $2 WHERE kode_agt = $1', [kode, lain.id]);
        const b = (await db.query('SELECT grade, rp_grade FROM anggota WHERE kode_agt = $1', [kode])).rows[0];
        assert.equal(b.grade, lain.nama);
        assert.equal(Number(b.rp_grade), Number(lain.nominal));
    });
});
