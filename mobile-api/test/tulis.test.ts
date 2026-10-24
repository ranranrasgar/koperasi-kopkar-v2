import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { hashJawaban, hashPasswordAnggota } from '@kopkar/backend/src/anggota/akun.ts';
import { createPool } from '../src/db.js';
import { createServer } from '../src/server.js';

// Login, token, dan endpoint tulis untuk aplikasi Android. Memakai akun uji sementara yang dihapus di akhir.
// Pengajuan berjalan dalam mode uji (dijalankan lalu di-rollback), jadi tidak meninggalkan pengajuan.
process.env.KOPKAR_UJI_ROLLBACK = '1';
// Token dibuat dan dibaca di proses uji ini saja; rahasia asli tidak diperlukan.
process.env.ANGGOTA_SESSION_SECRET ||= 'rahasia-uji-mobile-api-minimal-32-karakter';

const pool = createPool();
const server = createServer(pool);
await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

const USERNAME = `uji_mobile_${Date.now()}`;
const PASSWORD = 'rahasia123';
// Anggota aktif tanpa akun aplikasi (app_user.anggota_id unik), dengan jenis kredit yang cocok untuk pengajuan.
const { rows: [ag] } = await pool.query(`SELECT a.id, a.kode_agt FROM anggota a WHERE a.aktif
    AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id) ORDER BY a.id DESC LIMIT 1`);
const { rows: [pt] } = await pool.query('SELECT id FROM pertanyaan ORDER BY urut LIMIT 1');
const { rows: [u] } = await pool.query(
    `INSERT INTO app_user (username, password_hash, kode_agt, status, created_at, anggota_id, pertanyaan_id, jawaban_hash)
     VALUES ($1, $2, $3, true, now(), $4, $5, $6) RETURNING id`,
    [USERNAME, await hashPasswordAnggota(PASSWORD), ag.kode_agt, ag.id, pt?.id ?? null, await hashJawaban('Kucing Oren')]);

test.after(async () => {
    server.close();
    await pool.query('DELETE FROM app_user_foto WHERE app_user_id = $1', [u.id]).catch(() => undefined);
    await pool.query('DELETE FROM app_user WHERE id = $1', [u.id]);
    await pool.end();
});

const kirim = async (jalur: string, isi?: Record<string, string> | FormData, token?: string) => {
    const r = await fetch(base + jalur, {
        method: isi ? 'POST' : 'GET',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: isi instanceof FormData ? isi : isi ? new URLSearchParams(isi) : undefined,
    });
    return { status: r.status, json: await r.json() as any };
};
const masuk = async (password = PASSWORD) => (await kirim('/v1/login.php', { username: USERNAME, password })).json;

test('login: bentuk server lama + api_token; salah password dan formulir daftar lama ditolak', async () => {
    const r = await masuk();
    assert.equal(r.success, true);
    assert.equal(r.anggota.kode_agt, ag.kode_agt);
    assert.equal(r.anggota.username, USERNAME);
    for (const k of ['nama', 'status_staff', 'rp_grade', 'kodepos', 'telp_rmh', 'bank_no_rek', 'email', 'foto']) assert.ok(k in r.anggota, k);
    assert.match(r.api_token, /^[\w-]+\.[\w-]+$/);
    assert.deepEqual(await masuk('salah123'), { success: false, message: 'Username atau password salah' });
    const daftar = (await kirim('/v1/login.php', { username: 'baru_xyz', password: 'abc12345', nik: '123456', idPertanyaan: '1', jawaban: 'x' })).json;
    assert.equal(daftar.success, false);
    assert.match(daftar.message, /\/daftar$/);
});

test('data wajib token; kdAnggota dan noPinjaman orang lain ditolak', async () => {
    const { api_token } = await masuk();
    const A = '/v1/Api.php?apicall=';
    assert.equal((await kirim(`${A}getsimpanan&kdAnggota=${ag.kode_agt}`)).status, 401);
    assert.equal((await kirim(`${A}getsimpanan&kdAnggota=${ag.kode_agt}`, undefined, 'palsu.palsu')).status, 401);
    assert.equal((await kirim(`${A}getsimpanan&kdAnggota=${ag.kode_agt}`, undefined, api_token)).json.error, false);
    const { rows: [lain] } = await pool.query('SELECT kode_agt FROM anggota WHERE id <> $1 AND aktif LIMIT 1', [ag.id]);
    assert.equal((await kirim(`${A}getsimpanan&kdAnggota=${lain.kode_agt}`, undefined, api_token)).status, 403);
    const { rows: [pj] } = await pool.query('SELECT no_pinjaman FROM pinjaman_tunai WHERE anggota_id <> $1 LIMIT 1', [ag.id]);
    assert.equal((await kirim(`${A}getjadwalangsuran&noPinjaman=${encodeURIComponent(pj.no_pinjaman)}`, undefined, api_token)).status, 403);
    const d = (await kirim(`/v1/dashboard.php?kdAnggota=${ag.kode_agt}`, undefined, api_token)).json;
    assert.equal(d.error, false);
    assert.equal(typeof d.foto, 'string');
});

test('ganti password: password lama wajib, aturan PWA, token lama tidak berlaku lagi', async () => {
    const { api_token: lama } = await masuk();
    const ganti = (isi: Record<string, string>) => kirim('/v1/Api.php?apicall=updateuserpassword', { username: USERNAME, ...isi }, lama);
    assert.equal((await ganti({ password: 'baru12345', password_lama: 'keliru' })).json.message, 'Password lama salah');
    assert.equal((await ganti({ password: 'pendek', password_lama: PASSWORD })).json.message, 'Password minimal 8 karakter');
    const r = (await ganti({ password: 'baru12345', password_lama: PASSWORD })).json;
    assert.equal(r.error, false);
    assert.equal((await kirim(`/v1/Api.php?apicall=getsimpanan&kdAnggota=${ag.kode_agt}`, undefined, lama)).status, 401);
    assert.equal((await kirim(`/v1/Api.php?apicall=getsimpanan&kdAnggota=${ag.kode_agt}`, undefined, r.api_token)).json.error, false);
    // kembalikan supaya uji lain bisa masuk
    await pool.query('UPDATE app_user SET password_hash = $1 WHERE id = $2', [await hashPasswordAnggota(PASSWORD), u.id]);
});

test('lupa password lewat jawaban keamanan: verifyjawaban -> reset_token -> updateuserpassword', async () => {
    const A = '/v1/Api.php?apicall=';
    const q = (await kirim(`${A}isuserexist&username=${USERNAME}`)).json;
    assert.equal(q.error, false);
    assert.equal('jawaban' in q, false);
    assert.equal((await kirim(`${A}verifyjawaban`, { username: USERNAME, jawaban: 'anjing' })).json.error, true);
    const v = (await kirim(`${A}verifyjawaban`, { username: USERNAME, jawaban: '  kucing oren ' })).json;
    assert.equal(v.error, false);
    const r = (await kirim(`${A}updateuserpassword`, { username: USERNAME, password: 'lewatjawab9', resetToken: v.reset_token })).json;
    assert.equal(r.error, false);
    assert.equal((await masuk('lewatjawab9')).success, true);
    // token reset sekali pakai: password sudah berganti
    assert.equal((await kirim(`${A}updateuserpassword`, { username: USERNAME, password: 'lagi12345', resetToken: v.reset_token })).status, 401);
    await pool.query('UPDATE app_user SET password_hash = $1 WHERE id = $2', [await hashPasswordAnggota(PASSWORD), u.id]);
});

test('foto profil: unggah multipart, alamat bertanda tangan, tanda palsu 404', async () => {
    const { api_token } = await masuk();
    const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000' + '1f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
    const f = new FormData();
    f.set('kdAnggota', ag.kode_agt);
    f.set('foto', new Blob([png], { type: 'image/jpeg' }), 'x.jpg');
    const r = (await kirim('/v1/Api.php?apicall=updateprofile', f, api_token)).json;
    assert.equal(r.error, false, r.message);
    assert.match(r.foto, /^foto\/\d+-\d+-[\w-]{22}\.jpg$/);
    const g = await fetch(`${base}/images/${r.foto}`);
    assert.equal(g.status, 200);
    assert.equal(g.headers.get('content-type'), 'image/png');
    assert.equal((await fetch(`${base}/images/${r.foto.replace(/-[\w-]{22}\.jpg$/, '-AAAAAAAAAAAAAAAAAAAAAA.jpg')}`)).status, 404);
    const bukan = new FormData();
    bukan.set('kdAnggota', ag.kode_agt);
    bukan.set('foto', new Blob(['bukan gambar']), 'x.jpg');
    assert.equal((await kirim('/v1/Api.php?apicall=updateprofile', bukan, api_token)).json.message, 'File harus berupa gambar JPG, PNG, atau WEBP.');
});

test('pengajuan: aturan PWA (persen dari server), tanggal yyyy/MM/dd, mode uji tidak menyimpan', async () => {
    const { api_token } = await masuk();
    const { rows: [a] } = await pool.query('SELECT status_staff FROM anggota WHERE id = $1', [ag.id]);
    const jk = (await kirim(`/v1/Api.php?apicall=getjeniskreditv1&statusStaff=${a.status_staff}`, undefined, api_token)).json.jenis_kredit;
    const tanpaKunci = jk.find((j: any) => !j.kunci_grade && !j.kunci_saldo) ?? jk[0];
    const besok = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }).replace(/-/g, '/');
    const isi = { tglRealisasi: besok, kdAnggota: ag.kode_agt, kdKredit: tanpaKunci.kd_kredit, persenBunga: '0', lamaAngsuran: '2',
        rpPinjamanPokok: '1000000', keterangan: 'uji mobile-api', persenAdm: '0', persenProvisi: '0', persenDenda: '0' };
    const sebelum = (await pool.query('SELECT count(*)::int n FROM pengajuan_pinjaman')).rows[0].n;
    const r = (await kirim('/v1/Api.php?apicall=createpinjaman', isi, api_token)).json;
    assert.equal(r.error, false, r.message);
    assert.match(r.message, /Mode uji/);
    assert.equal((await pool.query('SELECT count(*)::int n FROM pengajuan_pinjaman')).rows[0].n, sebelum);
    assert.equal((await kirim('/v1/Api.php?apicall=createpinjaman', isi, api_token)).json.message, 'Tunggu sebentar sebelum mengirim lagi.');
});
