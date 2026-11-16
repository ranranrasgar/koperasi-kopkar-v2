import crypto from 'node:crypto';
import type { Db } from '../db.ts';

// QR saya: anggota membuka satu QR di Beranda PWA, kasir memindainya di admin lalu memilih transaksi. Jenis `anggota` hanya menunjuk orangnya;
// jenis lain menunjuk satu simpanan atau pinjaman. QR hanya berisi
// token acak; datanya tetap di server, jadi QR tidak membocorkan apa pun dan tangkapan layar lama tidak berlaku setelah kedaluwarsa.
// QR hanya memilih anggota dan tujuannya di form; kasir tetap memeriksa dan menekan simpan.

type Pemanggil = Pick<Db, 'query'>;
// Jenis `bayar`: QR pembayaran belanja kantin dari Simpanan Sukarela. Berlaku 60 detik dan sekali pakai (dihapus saat dipakai,
// di transaksi yang sama dengan posting penjualan), lihat pakaiQrBayar.
export type JenisQr = 'anggota' | 'simpanan' | 'tunai' | 'kpr' | 'bayar';
export const DETIK_QR_BAYAR = 60;

const AWALAN = 'KOPKAR1:';
export const DETIK_QR = 300;

export interface IsiQr { jenis: JenisQr; ref: string; kode_agt: string; nik: string | null; nama: string; aktif: boolean }

/** Buat QR untuk jenis simpanan atau pinjaman milik anggota ini; null bila tujuannya tidak ada atau bukan miliknya. */
export async function buatQr(db: Pemanggil, anggotaId: number, jenis: JenisQr, ref = '') {
    const ada = jenis === 'anggota' || jenis === 'bayar' ? { rowCount: 1 } : jenis === 'simpanan' ? await db.query('SELECT 1 FROM jenis_simpanan WHERE kode_simpanan = $1', [ref])
        : await db.query(`SELECT 1 FROM ${jenis === 'kpr' ? 'kpr' : 'pinjaman_tunai'} WHERE no_pinjaman = $1 AND anggota_id = $2`, [ref, anggotaId]);
    if (!ada.rowCount) return null;
    await db.query('DELETE FROM qr_anggota WHERE berlaku_sampai < now()');
    const token = crypto.randomBytes(16).toString('base64url');
    await db.query(`INSERT INTO qr_anggota (token, anggota_id, jenis, ref, berlaku_sampai) VALUES ($1, $2, $3, $4, now() + make_interval(secs => $5))`,
        [token, anggotaId, jenis, ref, jenis === 'bayar' ? DETIK_QR_BAYAR : DETIK_QR]);
    return { teks: `${AWALAN}${token}`, detik: jenis === 'bayar' ? DETIK_QR_BAYAR : DETIK_QR };
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

const tokenDari = (teks: string) => new RegExp(`^${AWALAN}([A-Za-z0-9_-]{22})$`).exec(teks.trim())?.[1] ?? null;

/** Pakai QR bayar: dihapus (sekali pakai) dan mengembalikan anggotanya; null bila bukan QR bayar, kedaluwarsa, atau sudah dipakai. Panggil di dalam transaksi posting. */
export async function pakaiQrBayar(db: Pemanggil, teks: string) {
    const token = tokenDari(teks);
    if (!token) return null;
    const r = await db.query<{ anggota_id: string }>("DELETE FROM qr_anggota WHERE token = $1 AND jenis = 'bayar' AND berlaku_sampai > now() RETURNING anggota_id", [token]);
    return r.rows[0] ? { token, anggotaId: Number(r.rows[0].anggota_id) } : null;
}

/** Token dari teks QR (untuk mencocokkan status pembayaran di HP anggota). */
export const tokenQr = tokenDari;
