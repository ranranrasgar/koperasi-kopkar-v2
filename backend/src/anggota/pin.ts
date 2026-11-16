import bcrypt from 'bcryptjs';
import type pg from 'pg';
import { cariAkun, cocokPasswordAnggota } from './akun.ts';

// PIN transaksi anggota: 6 angka untuk menyetujui pembayaran dari HP (tagihan QR kantin, belanja di aplikasi). Disimpan bcrypt di anggota_pin.
// Salah MAKS_GAGAL kali berturut-turut mengunci PIN MENIT_KUNCI menit. Hitungan gagal disimpan di database (berlaku di semua proses),
// jadi cekPin harus dipanggil di luar transaksi pembayaran: galat pembayaran tidak boleh membatalkan catatan gagalnya.

type Db = pg.Pool | pg.PoolClient;
const MAKS_GAGAL = 5, MENIT_KUNCI = 15;

export class PinSalah extends Error {}

/** Aturan PIN baru; pesan galat, atau null bila boleh. */
export function cekPinBaru(pin: string) {
    if (!/^\d{6}$/.test(pin)) return 'PIN harus 6 angka';
    if (/^(\d)\1{5}$/.test(pin)) return 'PIN tidak boleh angka yang sama semua';
    if ('0123456789'.includes(pin) || '9876543210'.includes(pin)) return 'PIN tidak boleh angka berurutan';
    return null;
}

export async function adaPin(db: Db, anggotaId: number) {
    return ((await db.query('SELECT 1 FROM anggota_pin WHERE anggota_id = $1', [anggotaId])).rowCount ?? 0) > 0;
}

/** Atur atau ganti PIN; password akun aplikasi wajib benar. */
export async function aturPin(db: Db, i: { userId: number; anggotaId: number; password: string; pin: string; ulangi: string }) {
    const u = await cariAkun(db, { id: i.userId });
    if (!u?.password_hash) return { ok: false as const, error: 'Akun belum punya password. Atur password di menu Akun dulu.' };
    if (!(await cocokPasswordAnggota(i.password, u.password_hash)).cocok) return { ok: false as const, error: 'Password akun salah' };
    const salah = cekPinBaru(i.pin);
    if (salah) return { ok: false as const, error: salah };
    if (i.pin !== i.ulangi) return { ok: false as const, error: 'Ulangi PIN dengan sama persis' };
    const hash = await bcrypt.hash(i.pin, 10);
    await db.query(`INSERT INTO anggota_pin (anggota_id, pin_hash) VALUES ($1, $2)
        ON CONFLICT (anggota_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, gagal = 0, kunci_sampai = NULL, diubah_pada = now()`, [i.anggotaId, hash]);
    return { ok: true as const };
}

/** Hapus PIN anggota pemilik akun aplikasi ini (permintaan pengurus untuk anggota yang lupa PIN). */
export async function hapusPin(db: Db, userId: number) {
    const u = (await db.query<{ username: string; anggota_id: string | null }>('SELECT username, anggota_id FROM app_user WHERE id = $1', [userId])).rows[0];
    if (!u) return { ok: false as const, error: 'Akun tidak ditemukan' };
    if (!u.anggota_id) return { ok: false as const, error: 'Akun belum terhubung ke anggota' };
    const r = await db.query('DELETE FROM anggota_pin WHERE anggota_id = $1', [u.anggota_id]);
    return { ok: true as const, username: u.username, ada: (r.rowCount ?? 0) > 0 };
}

/** Periksa PIN; melempar PinSalah (belum diatur, terkunci, atau salah dengan sisa percobaan). Panggil dengan pool (autocommit). */
export async function cekPin(db: Db, anggotaId: number, pin: string) {
    const p = (await db.query<{ pin_hash: string; gagal: number; kunci_sampai: Date | null }>(
        'SELECT pin_hash, gagal, kunci_sampai FROM anggota_pin WHERE anggota_id = $1', [anggotaId])).rows[0];
    if (!p) throw new PinSalah('Atur PIN transaksi dulu di menu Akun');
    if (p.kunci_sampai && p.kunci_sampai > new Date())
        throw new PinSalah(`PIN terkunci karena salah ${MAKS_GAGAL} kali. Coba lagi pukul ${p.kunci_sampai.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}.`);
    if (/^\d{6}$/.test(pin) && (await bcrypt.compare(pin, p.pin_hash))) {
        if (p.gagal) await db.query('UPDATE anggota_pin SET gagal = 0, kunci_sampai = NULL WHERE anggota_id = $1', [anggotaId]);
        return;
    }
    const r = (await db.query<{ gagal: number }>(`UPDATE anggota_pin SET gagal = CASE WHEN gagal + 1 >= $2 THEN 0 ELSE gagal + 1 END,
            kunci_sampai = CASE WHEN gagal + 1 >= $2 THEN now() + make_interval(mins => $3) ELSE NULL END
        WHERE anggota_id = $1 RETURNING gagal`, [anggotaId, MAKS_GAGAL, MENIT_KUNCI])).rows[0];
    throw new PinSalah(r.gagal === 0 ? `PIN salah ${MAKS_GAGAL} kali; terkunci ${MENIT_KUNCI} menit` : `PIN salah. Sisa ${MAKS_GAGAL - r.gagal} kali percobaan.`);
}
