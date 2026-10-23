import crypto from 'node:crypto';
import { kirimKodeVerifikasi } from './verifikasi-email.ts';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';
import type pg from 'pg';

// Akun anggota (tabel app_user): aturan login sama dengan v1/login.php server PHP lama
// (docs/analisis-aplikasi-mobile-lama.md bagian 3), dengan pesan disamarkan (keputusan K7).

const BIAYA_BCRYPT = 10;
// Hash pengganti supaya username yang tidak ada tetap memakan waktu bcrypt yang sama.
const HASH_SEMU = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BIAYA_BCRYPT);

/** Bcrypt dengan awalan $2y$ supaya tetap terbaca password_verify PHP selama masa transisi. */
export async function hashPasswordAnggota(password: string) {
    return '$2y$' + (await bcrypt.hash(password, BIAYA_BCRYPT)).slice(4);
}

/** Cocokkan password dengan hash app_user: bcrypt ($2y$/$2b$/$2a$) atau MD5 lama tanpa salt. */
export async function cocokPasswordAnggota(password: string, tersimpan: string | null) {
    const h = tersimpan ?? '';
    if (/^\$2[aby]\$/.test(h)) return { cocok: await bcrypt.compare(password, h), md5: false };
    if (/^[0-9a-f]{32}$/i.test(h)) {
        const md5 = crypto.createHash('md5').update(password).digest();
        return { cocok: crypto.timingSafeEqual(md5, Buffer.from(h, 'hex')), md5: true };
    }
    await bcrypt.compare(password, HASH_SEMU);
    return { cocok: false, md5: false };
}

/** Aturan password baru anggota (keputusan K6, sama dengan operator v2). Pesan galat, atau null bila boleh. */
export function cekPasswordBaruAnggota(password: string) {
    if (password.length < 8) return 'Password minimal 8 karakter';
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password harus berisi huruf dan angka';
    return null;
}

export interface AkunAnggota {
    user_id: string;
    username: string;
    password_hash: string | null;
    email: string | null;
    foto: string | null;
    akun_aktif: boolean;
    anggota_id: string | null;
    kode_agt: string;
    nama: string | null;
    nik: string | null;
    anggota_aktif: boolean | null;
}

/**
 * Akun beserta status anggotanya. Username dicocokkan tanpa beda huruf besar/kecil dan tanpa spasi di tepi, seperti
 * MySQL lama (collation _ci, dan 93 username lama berspasi di tepi). Data saat ini unik menurut aturan ini.
 */
export async function cariAkun(db: pg.Pool | pg.PoolClient, by: { id?: string | number; username?: string }) {
    const r = await db.query<AkunAnggota>(
        `SELECT u.id::text user_id, u.username, u.password_hash, u.email, u.foto, u.status akun_aktif,
                u.anggota_id::text anggota_id, u.kode_agt, a.nama, a.nik, a.aktif anggota_aktif
           FROM app_user u LEFT JOIN anggota a ON a.id = u.anggota_id
          WHERE ${by.id !== undefined ? 'u.id = $1' : 'lower(trim(u.username)) = lower(trim($1))'}`, [by.id ?? by.username]);
    return r.rows[0] ?? null;
}

// ---------- Jawaban pertanyaan keamanan: format migrasi v2, scrypt dari jawaban trim + huruf kecil ----------

const scrypt = promisify(crypto.scrypt) as (s: string, salt: Buffer, len: number, o: crypto.ScryptOptions) => Promise<Buffer>;
const OPSI_SCRYPT = { N: 16384, r: 8, p: 1 };
const JAWABAN_SEMU = `scrypt$${'0'.repeat(32)}$${'0'.repeat(64)}`;

export async function hashJawaban(jawaban: string) {
    const salt = crypto.randomBytes(16);
    return `scrypt$${salt.toString('hex')}$${(await scrypt(jawaban.trim().toLowerCase(), salt, 32, OPSI_SCRYPT)).toString('hex')}`;
}

export async function cocokJawaban(jawaban: string, tersimpan: string | null) {
    const [jenis, salt, hash] = (tersimpan || JAWABAN_SEMU).split('$');
    if (jenis !== 'scrypt' || !salt || !hash) return false;
    const harap = Buffer.from(hash, 'hex');
    const dapat = await scrypt(jawaban.trim().toLowerCase(), Buffer.from(salt, 'hex'), harap.length, OPSI_SCRYPT);
    return crypto.timingSafeEqual(dapat, harap) && !!tersimpan;
}

// ---------- Daftar akun (paritas v1/user.php createNewRegisterUser) ----------

/** Username baru: 3-50 karakter; huruf, angka, spasi, titik, garis bawah, minus, @ (sebagian username lama berupa email). */
export function cekUsernameBaru(u: string) {
    const v = u.trim();
    if (v.length < 3 || v.length > 50) return 'Username 3 sampai 50 karakter';
    if (!/^[A-Za-z0-9 ._@-]+$/.test(v)) return 'Username hanya boleh huruf, angka, spasi, titik, garis bawah, minus, dan @';
    return null;
}

export interface IsianDaftar { username: string; password: string; ulangi: string; nik: string; email: string; pertanyaanId: number; jawaban: string }
/** userId: akun yang baru dibuat (pendaftaran), belum aktif sampai email diverifikasi. */
export type HasilAkun = { ok: true; pesan: string; userId?: number; aktif?: boolean } | { ok: false; error: string };

/**
 * Buat akun aplikasi anggota. Urutan sama dengan server lama: username/anggota sudah punya akun, NIK 6 karakter,
 * NIK anggota (akun untuk anggota itu), selain itu NIK karyawan Mattel (akun tanpa keanggotaan, keputusan K5).
 * Tambahan: aturan password K6, jawaban wajib, anggota yang dipakai harus aktif, email wajib dan unik. Akun dibuat TIDAK aktif
 * (status false) dan baru aktif setelah email diverifikasi dengan kode 6 angka yang dikirim ke email itu. Jalankan di dalam transaksi.
 */
export async function daftarAkun(db: pg.PoolClient, i: IsianDaftar, google?: { sub: string }): Promise<HasilAkun> {
    const gagal = (error: string): HasilAkun => ({ ok: false, error });
    const username = i.username.trim(), nik = i.nik.trim();
    const salahU = cekUsernameBaru(username);
    if (salahU) return gagal(salahU);
    const email = i.email.trim().toLowerCase();
    const salahE = cekEmail(email);
    if (salahE) return gagal(salahE);
    if (i.password !== i.ulangi) return gagal('Ulangi password dengan sama persis');
    const salahP = cekPasswordBaruAnggota(i.password);
    if (salahP) return gagal(salahP);
    if (!i.jawaban.trim()) return gagal('Jawaban pertanyaan keamanan wajib diisi');
    const tanya = (await db.query<{ id: string; urut: number }>('SELECT id::text, urut FROM pertanyaan WHERE id = $1', [i.pertanyaanId])).rows[0];
    if (!tanya) return gagal('Pilih pertanyaan keamanan');

    // Satu pendaftaran pada satu waktu: username tidak punya unique constraint (data lama), jadi dicek di bawah kunci ini.
    await db.query("SELECT pg_advisory_xact_lock(hashtext('app_user_daftar'))");
    const anggota = (await db.query<{ id: string; kode_agt: string; aktif: boolean }>(
        'SELECT id::text, kode_agt, aktif FROM anggota WHERE nik = $1 ORDER BY aktif DESC, id DESC LIMIT 1', [nik])).rows[0];
    const ada = (await db.query(
        `SELECT 1 FROM app_user WHERE lower(trim(username)) = lower($1) OR ($2::bigint IS NOT NULL AND anggota_id = $2) OR kode_agt = $3 LIMIT 1`,
        [username, anggota?.id ?? null, anggota?.kode_agt ?? nik])).rowCount;
    if (ada) return gagal('Username atau NIK sudah terdaftar');
    if (nik.length !== 6) return gagal('NIK tidak valid (6 karakter)');
    if ((await db.query('SELECT 1 FROM app_user WHERE lower(trim(email)) = $1 LIMIT 1', [email])).rowCount) return gagal('Email ini sudah dipakai akun lain, gunakan email lain.');

    const passwordHash = await hashPasswordAnggota(i.password), jawabanHash = await hashJawaban(i.jawaban);
    const kolom = `(username, password_hash, kode_agt, nikk, status, created_at, updated_at, id_pertanyaan, pertanyaan_id, jawaban_hash, anggota_id, karyawan_mattel_id, email)`;
    if (anggota) {
        if (!anggota.aktif) return gagal('Keanggotaan dengan NIK ini tidak aktif. Hubungi pengurus koperasi.');
        const id = Number((await db.query(`INSERT INTO app_user ${kolom} VALUES ($1, $2, $3, $4, $10, now(), now(), $5, $6, $7, $8, NULL, $9) RETURNING id`,
            [username, passwordHash, anggota.kode_agt, nik, tanya.urut, tanya.id, jawabanHash, anggota.id, email, !!google])).rows[0].id);
        if (google) return { ok: true, pesan: 'Akun dibuat dan aktif.', userId: id, ...(await tautkanGoogle(db, id, email, google.sub)) };
        await kirimKodeVerifikasi(db, id, email, username, { aktivasi: true, abaikanJeda: true });
        return { ok: true, pesan: 'Kode verifikasi dikirim ke email Anda. Masukkan kode itu untuk mengaktifkan akun.', userId: id };
    }
    const karyawan = (await db.query<{ id: string }>('SELECT id::text FROM karyawan_mattel WHERE nik = $1 LIMIT 1', [nik])).rows[0];
    if (!karyawan) return gagal('NIK tidak terdaftar di data karyawan Mattel');
    const id = Number((await db.query(`INSERT INTO app_user ${kolom} VALUES ($1, $2, $3, $4, $10, now(), now(), $5, $6, $7, NULL, $8, $9) RETURNING id`,
        [username, passwordHash, nik, nik, tanya.urut, tanya.id, jawabanHash, karyawan.id, email, !!google])).rows[0].id);
    if (google) return { ok: true, pesan: 'Akun dibuat dan aktif. Anda belum terdaftar sebagai anggota; hubungi pengurus untuk mendaftar.', userId: id, ...(await tautkanGoogle(db, id, email, google.sub)) };
    await kirimKodeVerifikasi(db, id, email, username, { aktivasi: true, abaikanJeda: true });
    return { ok: true, pesan: 'Kode verifikasi dikirim ke email Anda. Setelah akun aktif, Anda belum terdaftar sebagai anggota; hubungi pengurus untuk mendaftar.', userId: id };
}

// ---------- Masuk / daftar dengan Google ----------

/**
 * Hubungkan akun dengan identitas Google (sub) dan catat emailnya terverifikasi: Google sudah membuktikan kepemilikan email,
 * jadi akun pendaftaran langsung aktif tanpa kode 6 angka.
 */
async function tautkanGoogle(db: pg.PoolClient | pg.Pool, userId: number, email: string, sub: string) {
    await db.query(
        `INSERT INTO app_user_email_verif (app_user_id, email, aktivasi, terverifikasi_pada) VALUES ($1, $2, false, now())
         ON CONFLICT (app_user_id) DO UPDATE SET email = EXCLUDED.email, kode_hash = NULL, percobaan = 0, terverifikasi_pada = now()`, [userId, email]);
    await db.query('INSERT INTO app_user_google (app_user_id, sub, email) VALUES ($1, $2, $3) ON CONFLICT (app_user_id) DO UPDATE SET sub = EXCLUDED.sub, email = EXCLUDED.email', [userId, sub, email]);
    return { aktif: true };
}

/**
 * Akun untuk identitas Google. Pertama lewat sub yang sudah tertaut; kedua lewat email yang sama dengan email akun
 * HANYA bila email akun itu sudah terverifikasi (kode 6 angka atau Google), supaya email lama yang belum terbukti
 * miliknya tidak bisa dipakai mengambil alih akun. Mengembalikan null bila tidak ada.
 */
export async function cariAkunGoogle(db: pg.Pool | pg.PoolClient, sub: string, emailGoogle: string): Promise<number | null> {
    const email = emailGoogle.trim().toLowerCase();
    const a = (await db.query<{ app_user_id: string }>('SELECT app_user_id::text FROM app_user_google WHERE sub = $1', [sub])).rows[0];
    if (a) return Number(a.app_user_id);
    const b = (await db.query<{ id: string }>(
        `SELECT u.id::text FROM app_user u JOIN app_user_email_verif v ON v.app_user_id = u.id
          WHERE lower(trim(u.email)) = $1 AND v.email = $1 AND v.terverifikasi_pada IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM app_user_google g WHERE g.app_user_id = u.id)
          ORDER BY u.id LIMIT 1`, [email])).rows[0];
    if (!b) return null;
    await db.query('INSERT INTO app_user_google (app_user_id, sub, email) VALUES ($1, $2, $3)', [b.id, sub, email]);
    return Number(b.id);
}

// ---------- Lupa password lewat pertanyaan keamanan ----------

/**
 * Pertanyaan keamanan untuk username. Username yang tidak ada mendapat pertanyaan tetap yang dipilih dari namanya,
 * supaya halaman tidak membocorkan apakah username terdaftar (PRD F4). Jawaban tidak pernah dikirim ke browser.
 */
export async function pertanyaanUntuk(db: pg.Pool | pg.PoolClient, username: string) {
    const akun = (await db.query<{ pertanyaan: string }>(
        `SELECT p.pertanyaan FROM app_user u JOIN pertanyaan p ON p.id = u.pertanyaan_id
          WHERE lower(trim(u.username)) = lower(trim($1)) AND u.status`, [username])).rows[0];
    if (akun) return akun.pertanyaan;
    const semua = (await db.query<{ pertanyaan: string }>('SELECT pertanyaan FROM pertanyaan ORDER BY urut')).rows;
    if (!semua.length) return null;
    const h = crypto.createHash('sha256').update(username.trim().toLowerCase()).digest();
    return semua[h[0] % semua.length].pertanyaan;
}

/** Atur password baru bila jawaban keamanan cocok. Pesan gagal seragam (username salah atau jawaban salah). */
export async function resetLewatJawaban(db: pg.PoolClient, username: string, jawaban: string, baru: string, ulangi: string): Promise<HasilAkun> {
    if (baru !== ulangi) return { ok: false, error: 'Ulangi password baru dengan sama persis' };
    const salah = cekPasswordBaruAnggota(baru);
    if (salah) return { ok: false, error: salah };
    const u = (await db.query<{ id: string; jawaban_hash: string | null }>(
        `SELECT id::text, jawaban_hash FROM app_user WHERE lower(trim(username)) = lower(trim($1)) AND status`, [username])).rows[0];
    if (!(await cocokJawaban(jawaban, u?.jawaban_hash ?? null)) || !u) return { ok: false, error: 'Username atau jawaban tidak cocok' };
    await aturPassword(db, Number(u.id), baru);
    return { ok: true, pesan: 'Password berhasil diganti. Silakan masuk dengan password baru.' };
}

/** Simpan password baru (bcrypt $2y$). Sesi lama di perangkat lain otomatis tidak berlaku (sidik password berubah). */
export async function aturPassword(db: pg.Pool | pg.PoolClient, userId: number, baru: string) {
    const hash = await hashPasswordAnggota(baru);
    await db.query('UPDATE app_user SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, userId]);
    return hash;
}

/** Ganti password dari menu Akun: password lama harus benar. */
export async function gantiPassword(db: pg.Pool | pg.PoolClient, userId: number, lama: string, baru: string, ulangi: string) {
    const u = await cariAkun(db, { id: userId });
    if (!u || !(await cocokPasswordAnggota(lama, u.password_hash)).cocok) return { ok: false as const, error: 'Password lama salah' };
    if (baru !== ulangi) return { ok: false as const, error: 'Ulangi password baru dengan sama persis' };
    const salah = cekPasswordBaruAnggota(baru);
    if (salah) return { ok: false as const, error: salah };
    if (baru === lama) return { ok: false as const, error: 'Password baru harus berbeda dari password lama' };
    return { ok: true as const, hash: await aturPassword(db, userId, baru) };
}

// ---------- Email (paritas updateEmail: tidak boleh dipakai akun lain) ----------

export function cekEmail(email: string) {
    const v = email.trim();
    if (v.length < 5 || v.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Alamat email tidak valid';
    return null;
}

export async function aturEmail(db: pg.Pool | pg.PoolClient, userId: number, email: string): Promise<HasilAkun> {
    const v = email.trim().toLowerCase();
    const salah = cekEmail(v);
    if (salah) return { ok: false, error: salah };
    const dipakai = (await db.query('SELECT 1 FROM app_user WHERE lower(trim(email)) = $1 AND id <> $2 LIMIT 1', [v, userId])).rowCount;
    if (dipakai) return { ok: false, error: 'Email ini sudah dipakai, gunakan email lain.' };
    await db.query('UPDATE app_user SET email = $1, updated_at = now() WHERE id = $2', [v, userId]);
    return { ok: true, pesan: 'Email tersimpan.' };
}

/** Akun aktif yang username dan email-nya cocok (lupa password lewat email), atau null. */
export async function akunUntukResetEmail(db: pg.Pool | pg.PoolClient, username: string, email: string) {
    const r = await db.query<{ id: string; email: string; password_hash: string }>(
        `SELECT id::text, email, password_hash FROM app_user
          WHERE lower(trim(username)) = lower(trim($1)) AND lower(trim(email)) = lower(trim($2)) AND status AND password_hash IS NOT NULL`,
        [username, email]);
    return r.rows[0] ?? null;
}

export type HasilMasuk =
    | { ok: true; akun: AkunAnggota }
    | { ok: false; alasan: 'salah' | 'akun_nonaktif' | 'anggota_nonaktif'; userId?: number };

/**
 * Login anggota. Urutan sama dengan server lama: akun ada, akun aktif, password cocok, anggota aktif.
 * Password MD5 yang cocok langsung diganti bcrypt. Karyawan Mattel yang belum anggota (anggota_id kosong)
 * tetap boleh masuk dengan akses terbatas (keputusan K5).
 */
export async function masukAnggota(db: pg.Pool, username: string, password: string): Promise<HasilMasuk> {
    const akun = await cariAkun(db, { username });
    const { cocok, md5 } = await cocokPasswordAnggota(password, akun?.password_hash ?? HASH_SEMU);
    if (!akun || !cocok) return { ok: false, alasan: 'salah' };
    if (!akun.akun_aktif) return { ok: false, alasan: 'akun_nonaktif', userId: Number(akun.user_id) };
    if (akun.anggota_id && !akun.anggota_aktif) return { ok: false, alasan: 'anggota_nonaktif' };
    if (md5) {
        const baru = await hashPasswordAnggota(password);
        await db.query('UPDATE app_user SET password_hash = $1, updated_at = now() WHERE id = $2', [baru, akun.user_id]);
        akun.password_hash = baru;
    }
    return { ok: true, akun };
}
