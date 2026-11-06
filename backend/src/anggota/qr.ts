import crypto from 'node:crypto';
import type { Db } from '../db.ts';

// QR transaksi: anggota membuka QR di PWA untuk satu jenis simpanan atau satu pinjaman, kasir memindainya di form admin. QR hanya berisi
// token acak; datanya tetap di server, jadi QR tidak membocorkan apa pun dan tangkapan layar lama tidak berlaku setelah kedaluwarsa.
// QR hanya memilih anggota dan tujuannya di form; kasir tetap memeriksa dan menekan simpan.

type Pemanggil = Pick<Db, 'query'>;
export type JenisQr = 'simpanan' | 'tunai' | 'kpr';

const AWALAN = 'KOPKAR1:';
export const DETIK_QR = 300;

export interface IsiQr { jenis: JenisQr; ref: string; kode_agt: string; nik: string | null; nama: string; aktif: boolean }

/** Buat QR untuk jenis simpanan atau pinjaman milik anggota ini; null bila tujuannya tidak ada atau bukan miliknya. */
export async function buatQr(db: Pemanggil, anggotaId: number, jenis: JenisQr, ref: string) {
    const ada = jenis === 'simpanan' ? await db.query('SELECT 1 FROM jenis_simpanan WHERE kode_simpanan = $1', [ref])
        : await db.query(`SELECT 1 FROM ${jenis === 'kpr' ? 'kpr' : 'pinjaman_tunai'} WHERE no_pinjaman = $1 AND anggota_id = $2`, [ref, anggotaId]);
    if (!ada.rowCount) return null;
    await db.query('DELETE FROM qr_anggota WHERE berlaku_sampai < now()');
    const token = crypto.randomBytes(16).toString('base64url');
    await db.query(`INSERT INTO qr_anggota (token, anggota_id, jenis, ref, berlaku_sampai) VALUES ($1, $2, $3, $4, now() + make_interval(secs => $5))`,
        [token, anggotaId, jenis, ref, DETIK_QR]);
    return { teks: `${AWALAN}${token}`, detik: DETIK_QR };
}

/** Baca hasil pindai; null bila bukan QR koperasi atau sudah kedaluwarsa. */
export async function bacaQr(db: Pemanggil, teks: string): Promise<IsiQr | null> {
    const token = new RegExp(`^${AWALAN}([A-Za-z0-9_-]{22})$`).exec(teks.trim())?.[1];
    if (!token) return null;
    const r = await db.query<IsiQr>(
        `SELECT q.jenis, q.ref, a.kode_agt, a.nik, a.nama, a.aktif FROM qr_anggota q JOIN anggota a ON a.id = q.anggota_id
          WHERE q.token = $1 AND q.berlaku_sampai > now()`, [token]);
    return r.rows[0] ?? null;
}
