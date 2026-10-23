import crypto from 'node:crypto';
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

/** Akun beserta status anggotanya. Username dicocokkan persis (seperti server lama). */
export async function cariAkun(db: pg.Pool | pg.PoolClient, by: { id?: string | number; username?: string }) {
    const r = await db.query<AkunAnggota>(
        `SELECT u.id::text user_id, u.username, u.password_hash, u.email, u.foto, u.status akun_aktif,
                u.anggota_id::text anggota_id, u.kode_agt, a.nama, a.nik, a.aktif anggota_aktif
           FROM app_user u LEFT JOIN anggota a ON a.id = u.anggota_id
          WHERE ${by.id !== undefined ? 'u.id = $1' : 'u.username = $1'}`, [by.id ?? by.username]);
    return r.rows[0] ?? null;
}

export type HasilMasuk =
    | { ok: true; akun: AkunAnggota }
    | { ok: false; alasan: 'salah' | 'akun_nonaktif' | 'anggota_nonaktif' };

/**
 * Login anggota. Urutan sama dengan server lama: akun ada, akun aktif, password cocok, anggota aktif.
 * Password MD5 yang cocok langsung diganti bcrypt. Karyawan Mattel yang belum anggota (anggota_id kosong)
 * tetap boleh masuk dengan akses terbatas (keputusan K5).
 */
export async function masukAnggota(db: pg.Pool, username: string, password: string): Promise<HasilMasuk> {
    const akun = await cariAkun(db, { username });
    const { cocok, md5 } = await cocokPasswordAnggota(password, akun?.password_hash ?? HASH_SEMU);
    if (!akun || !cocok) return { ok: false, alasan: 'salah' };
    if (!akun.akun_aktif) return { ok: false, alasan: 'akun_nonaktif' };
    if (akun.anggota_id && !akun.anggota_aktif) return { ok: false, alasan: 'anggota_nonaktif' };
    if (md5) {
        const baru = await hashPasswordAnggota(password);
        await db.query('UPDATE app_user SET password_hash = $1, updated_at = now() WHERE id = $2', [baru, akun.user_id]);
        akun.password_hash = baru;
    }
    return { ok: true, akun };
}
