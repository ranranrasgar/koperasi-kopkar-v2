import crypto from 'node:crypto';
import { antreEmail } from '../email/antrean.ts';

// Verifikasi kepemilikan email akun anggota dengan kode 6 angka (tabel app_user_email_verif, anggota-web.sql).
// Kode disimpan sebagai HMAC (dengan rahasia server), berlaku 15 menit, maksimal 5 salah, dan permintaan ulang
// dibatasi 60 detik. Pendaftaran baru (aktivasi) baru aktif setelah email terverifikasi. Notifikasi lewat email hanya
// dikirim ke email yang terverifikasi dan masih sama dengan email akun (penerimaEmailAnggota).

interface Db { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> }

export const BERLAKU_MENIT = 15;
export const MAKS_SALAH = 5;
export const JEDA_KIRIM_DETIK = 60;

const rahasia = () => process.env.ANGGOTA_SESSION_SECRET ?? process.env.SESSION_SECRET ?? 'kopkar-pengembangan';
const normal = (e: string) => e.trim().toLowerCase();
const hashKode = (userId: number, email: string, kode: string) =>
    crypto.createHmac('sha256', rahasia()).update(`${userId}:${normal(email)}:${kode}`).digest('hex');

export const kodeBaru = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

export type HasilKode = { ok: true; kode: string } | { ok: false; error: string };

/**
 * Buat kode baru untuk (akun, email), menimpa kode lama. Tidak mengirim email (lihat kirimKodeVerifikasi).
 * aktivasi: akun pendaftaran baru (tetap berlaku untuk kode berikutnya). Email yang sudah terverifikasi tidak dibuat ulang.
 */
export async function buatKodeVerifikasi(db: Db, userId: number, email: string, opsi: { aktivasi?: boolean; abaikanJeda?: boolean } = {}): Promise<HasilKode> {
    const em = normal(email);
    const r = (await db.query(
        `SELECT email, terverifikasi_pada, EXTRACT(EPOCH FROM now() - terakhir_kirim) detik FROM app_user_email_verif WHERE app_user_id = $1`, [userId])).rows[0];
    if (r && r.email === em) {
        if (r.terverifikasi_pada) return { ok: false, error: 'Email ini sudah terverifikasi.' };
        if (!opsi.abaikanJeda && r.detik !== null && Number(r.detik) < JEDA_KIRIM_DETIK) {
            return { ok: false, error: `Tunggu ${Math.ceil(JEDA_KIRIM_DETIK - Number(r.detik))} detik sebelum meminta kode lagi.` };
        }
    }
    const kode = kodeBaru();
    await db.query(
        `INSERT INTO app_user_email_verif (app_user_id, email, kode_hash, kedaluwarsa, percobaan, terakhir_kirim, aktivasi, terverifikasi_pada)
         VALUES ($1, $2, $3, now() + ($4::int * interval '1 minute'), 0, now(), $5, NULL)
         ON CONFLICT (app_user_id) DO UPDATE SET email = EXCLUDED.email, kode_hash = EXCLUDED.kode_hash, kedaluwarsa = EXCLUDED.kedaluwarsa,
            percobaan = 0, terakhir_kirim = now(), aktivasi = app_user_email_verif.aktivasi OR EXCLUDED.aktivasi, terverifikasi_pada = NULL`,
        [userId, em, hashKode(userId, em, kode), BERLAKU_MENIT, !!opsi.aktivasi]);
    return { ok: true, kode };
}

/** Buat kode lalu masukkan email berisi kode ke antrean (dikirim segera oleh pekerja atau prosesAntrean). */
export async function kirimKodeVerifikasi(db: Db, userId: number, email: string, nama: string, opsi: { aktivasi?: boolean; abaikanJeda?: boolean } = {}) {
    const h = await buatKodeVerifikasi(db, userId, email, opsi);
    if (!h.ok) return h;
    await antreEmail(db, {
        jenis: 'verifikasi', ke: normal(email), judul: 'Kode verifikasi email aplikasi anggota',
        teks: `Halo ${nama},\n\nKode verifikasi Anda: ${h.kode}\n\nKode berlaku ${BERLAKU_MENIT} menit. Jangan berikan kode ini kepada siapa pun, termasuk pengurus koperasi.\n\nAbaikan email ini bila Anda tidak mendaftar atau mengubah email di aplikasi anggota.`,
    });
    return { ok: true as const };
}

export type HasilPeriksa = { ok: true; aktivasi: boolean } | { ok: false; error: string };

/** Periksa kode yang diketik. Berhasil: email tercatat terverifikasi dan, untuk akun pendaftaran, akun diaktifkan. */
export async function periksaKodeVerifikasi(db: Db, userId: number, kode: string): Promise<HasilPeriksa> {
    const k = kode.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(k)) return { ok: false, error: 'Kode terdiri dari 6 angka.' };
    const r = (await db.query(
        `SELECT v.email, v.kode_hash, v.percobaan, v.aktivasi, v.terverifikasi_pada, (v.kedaluwarsa < now()) kedaluwarsa, lower(trim(u.email)) = v.email sama
           FROM app_user_email_verif v JOIN app_user u ON u.id = v.app_user_id WHERE v.app_user_id = $1`, [userId])).rows[0];
    if (!r) return { ok: false, error: 'Belum ada kode untuk akun ini. Minta kode baru.' };
    if (r.terverifikasi_pada && r.sama) return { ok: true, aktivasi: false };
    if (!r.sama) return { ok: false, error: 'Email akun sudah berubah. Minta kode baru.' };
    if (!r.kode_hash || r.kedaluwarsa) return { ok: false, error: 'Kode sudah kedaluwarsa. Minta kode baru.' };
    if (Number(r.percobaan) >= MAKS_SALAH) return { ok: false, error: 'Terlalu banyak kode salah. Minta kode baru.' };

    const cocok = crypto.timingSafeEqual(Buffer.from(hashKode(userId, r.email, k)), Buffer.from(r.kode_hash));
    if (!cocok) {
        const n = Number((await db.query('UPDATE app_user_email_verif SET percobaan = percobaan + 1 WHERE app_user_id = $1 RETURNING percobaan', [userId])).rows[0].percobaan);
        return { ok: false, error: n >= MAKS_SALAH ? 'Terlalu banyak kode salah. Minta kode baru.' : `Kode salah. Sisa percobaan: ${MAKS_SALAH - n}.` };
    }
    await db.query('UPDATE app_user_email_verif SET terverifikasi_pada = now(), kode_hash = NULL, percobaan = 0 WHERE app_user_id = $1', [userId]);
    if (r.aktivasi) await db.query('UPDATE app_user SET status = true, updated_at = now() WHERE id = $1', [userId]);
    return { ok: true, aktivasi: !!r.aktivasi };
}

export interface StatusEmail { email: string | null; terverifikasi: boolean; menungguAktivasi: boolean }

/** Status email akun: terverifikasi bila email akun sama dengan yang diverifikasi; menungguAktivasi = pendaftaran belum diverifikasi. */
export async function statusEmail(db: Db, userId: number): Promise<StatusEmail> {
    try {
        const r = (await db.query(
            `SELECT u.email, u.status, v.terverifikasi_pada, v.aktivasi, (lower(trim(u.email)) = v.email) sama
               FROM app_user u LEFT JOIN app_user_email_verif v ON v.app_user_id = u.id WHERE u.id = $1`, [userId])).rows[0];
        if (!r) return { email: null, terverifikasi: false, menungguAktivasi: false };
        return { email: r.email, terverifikasi: !!r.terverifikasi_pada && !!r.sama, menungguAktivasi: !r.status && !!r.aktivasi && !r.terverifikasi_pada };
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return { email: null, terverifikasi: false, menungguAktivasi: false };
        throw e;
    }
}

/** Email terverifikasi akun anggota aktif, untuk notifikasi lewat email (satu baris per alamat). */
export async function penerimaEmailAnggota(db: Db, anggotaIds: number[]): Promise<{ anggota_id: number; email: string; nama: string }[]> {
    if (anggotaIds.length === 0) return [];
    try {
        const r = await db.query(
            `SELECT DISTINCT ON (v.email) u.anggota_id, v.email, a.nama
               FROM app_user u JOIN anggota a ON a.id = u.anggota_id
               JOIN app_user_email_verif v ON v.app_user_id = u.id AND v.email = lower(trim(u.email)) AND v.terverifikasi_pada IS NOT NULL
              WHERE u.anggota_id = ANY($1::bigint[]) AND u.status ORDER BY v.email, u.id`, [anggotaIds]);
        return r.rows.map((x) => ({ anggota_id: Number(x.anggota_id), email: x.email as string, nama: String(x.nama ?? '').trim() }));
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return [];
        throw e;
    }
}
