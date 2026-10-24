import crypto from 'node:crypto';
import { tokenGambar } from '@kopkar/backend/src/anggota/gambar.ts';
import { tabelBelumAda } from '@kopkar/backend/src/anggota/foto.ts';
import type { Pool } from './db.js';

// Gambar untuk aplikasi Android. Aplikasi memuat gambar dengan IMAGE_PATH + nama berkas (Glide, tanpa header login), jadi
// "nama berkas" yang dikirim server adalah alamat yang tidak bisa ditebak:
//   foto/<userId>-<versi>-<tanda>.jpg   foto profil (app_user_foto), tanda HMAC dari ANGGOTA_SESSION_SECRET
//   himbauan/<token>, slide_promo/<token>  gambar pengumuman (pengumuman_gambar, token acak 128 bit seperti PWA)

const tandaFoto = (userId: number, versi: string) => {
    const s = process.env.ANGGOTA_SESSION_SECRET;
    if (!s || s.length < 32) throw new Error('ANGGOTA_SESSION_SECRET belum diset (minimal 32 karakter)');
    return crypto.createHmac('sha256', s).update(`foto:${userId}:${versi}`).digest('base64url').slice(0, 22);
};

/** Nama berkas foto profil untuk aplikasi (relatif terhadap IMAGE_PATH), atau '' bila belum ada foto. */
export async function namaFoto(db: Pool, userId: number) {
    try {
        const r = await db.query<{ v: string }>('SELECT extract(epoch FROM diubah_pada)::bigint::text v FROM app_user_foto WHERE app_user_id = $1', [userId]);
        const v = r.rows[0]?.v;
        return v ? `foto/${userId}-${v}-${tandaFoto(userId, v)}.jpg` : '';
    } catch (e) {
        if (tabelBelumAda(e)) return '';
        throw e;
    }
}

/** Ganti kolom image himbauan/promo dengan token gambar sistem baru; '' bila pengumuman itu tidak punya gambar. */
export async function denganGambar<T extends { id: number | string; image?: unknown }>(db: Pool, jenis: 'himbauan' | 'promo', baris: T[]) {
    const token = await tokenGambar(db as never, jenis, baris.map((b) => Number(b.id)));
    return baris.map((b) => ({ ...b, image: token.get(Number(b.id)) ?? '' }));
}

/** Isi gambar untuk jalur /images/..., atau null (404). */
export async function bacaGambar(db: Pool, jalur: string): Promise<{ isi: Buffer; jenis: string; publik: boolean } | null> {
    const f = /^foto\/(\d+)-(\d+)-([A-Za-z0-9_-]{22})\.jpg$/.exec(jalur);
    if (f) {
        const [, u, v, tanda] = f;
        const harap = Buffer.from(tandaFoto(Number(u), v)), dapat = Buffer.from(tanda);
        if (harap.length !== dapat.length || !crypto.timingSafeEqual(harap, dapat)) return null;
        try {
            const r = await db.query<{ isi: Buffer; jenis: string }>(
                'SELECT isi, jenis FROM app_user_foto WHERE app_user_id = $1 AND extract(epoch FROM diubah_pada)::bigint::text = $2', [u, v]);
            return r.rows[0] ? { ...r.rows[0], publik: false } : null;
        } catch (e) {
            if (tabelBelumAda(e)) return null;
            throw e;
        }
    }
    const g = /^(?:himbauan|slide_promo)\/([0-9a-f]{32})$/.exec(jalur);
    if (!g) return null;
    try {
        const r = await db.query<{ isi: Buffer; jenis: string }>('SELECT isi, jenis FROM pengumuman_gambar WHERE token = $1', [g[1]]);
        return r.rows[0] ? { ...r.rows[0], publik: true } : null;
    } catch (e) {
        if (tabelBelumAda(e)) return null;
        throw e;
    }
}
