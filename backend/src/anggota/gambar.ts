import crypto from 'node:crypto';

// Gambar pengumuman (himbauan, promo, notifikasi) di tabel pengumuman_gambar (anggota-web.sql). Browser admin
// mengecilkan gambar lebih dulu; di sini hanya dicek ulang (jenis dari isi file, ukuran) karena server tidak boleh
// percaya klien. Alamat publik memakai token acak, bukan id berurutan.

interface Db { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> }

export const MAKS_GAMBAR = 400 * 1024;
export type JenisRef = 'himbauan' | 'promo' | 'notifikasi';
export type JenisGambar = 'image/jpeg' | 'image/png' | 'image/webp';

export class GambarSalah extends Error {}

/** Jenis gambar dari byte awal file; null bila bukan JPG/PNG/WEBP. */
export function jenisGambar(b: Uint8Array): JenisGambar | null {
    const awal = (...x: number[]) => x.every((v, i) => b[i] === v);
    if (awal(0xff, 0xd8, 0xff)) return 'image/jpeg';
    if (awal(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
    if (awal(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
    return null;
}

/** Simpan gambar baru; melempar GambarSalah bila bukan gambar yang sah atau terlalu besar. */
export async function simpanGambar(db: Db, isi: Uint8Array) {
    if (isi.length === 0) throw new GambarSalah('Gambar kosong');
    if (isi.length > MAKS_GAMBAR) throw new GambarSalah('Gambar terlalu besar setelah dikecilkan (maksimal 400 KB)');
    const jenis = jenisGambar(isi);
    if (!jenis) throw new GambarSalah('Gambar harus berformat JPG, PNG, atau WEBP');
    const token = crypto.randomBytes(16).toString('hex');
    const r = await db.query('INSERT INTO pengumuman_gambar (token, isi, jenis) VALUES ($1, $2, $3) RETURNING id', [token, Buffer.from(isi), jenis]);
    return { id: Number(r.rows[0].id), token };
}

export async function tautkanGambar(db: Db, jenis: JenisRef, refId: number, gambarId: number) {
    await db.query(
        `INSERT INTO pengumuman_gambar_ref (jenis, ref_id, gambar_id) VALUES ($1, $2, $3)
         ON CONFLICT (jenis, ref_id) DO UPDATE SET gambar_id = EXCLUDED.gambar_id`, [jenis, refId, gambarId]);
}

/** Lepas gambar dari satu pengumuman, lalu hapus gambar yang tidak dipakai siapa pun. */
export async function lepasGambar(db: Db, jenis: JenisRef, refId: number) {
    try {
        await db.query('DELETE FROM pengumuman_gambar_ref WHERE jenis = $1 AND ref_id = $2', [jenis, refId]);
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return; // tabel belum dipasang: tidak ada gambar
        throw e;
    }
    await bersihkanYatim(db);
}

export async function bersihkanYatim(db: Db) {
    await db.query('DELETE FROM pengumuman_gambar g WHERE NOT EXISTS (SELECT 1 FROM pengumuman_gambar_ref r WHERE r.gambar_id = g.id)');
}

/** Id gambar yang menempel pada satu pengumuman, atau null. */
export async function gambarIdUntuk(db: Db, jenis: JenisRef, refId: number) {
    const r = await db.query('SELECT gambar_id FROM pengumuman_gambar_ref WHERE jenis = $1 AND ref_id = $2', [jenis, refId]);
    return r.rows[0] ? Number(r.rows[0].gambar_id) : null;
}

/** Token gambar per ref_id (yang tidak punya gambar tidak ada di hasil). Kosong bila tabel belum dipasang. */
export async function tokenGambar(db: Db, jenis: JenisRef, refIds: number[]) {
    const hasil = new Map<number, string>();
    if (refIds.length === 0) return hasil;
    try {
        const r = await db.query(
            `SELECT r.ref_id, g.token FROM pengumuman_gambar_ref r JOIN pengumuman_gambar g ON g.id = r.gambar_id
              WHERE r.jenis = $1 AND r.ref_id = ANY($2::bigint[])`, [jenis, refIds]);
        for (const x of r.rows) hasil.set(Number(x.ref_id), x.token);
    } catch (e) {
        if ((e as { code?: string }).code !== '42P01') throw e;
    }
    return hasil;
}
