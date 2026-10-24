import type pg from 'pg';

// Foto profil akun anggota di tabel app_user_foto (npm run anggota:pasang). Dipakai PWA anggota dan mobile-api
// (updateprofile aplikasi Android) supaya aturan dan penyimpanannya sama.

export const MAKS_FOTO = 5 * 1024 * 1024;
export type JenisFoto = 'image/jpeg' | 'image/png' | 'image/webp';

/** Jenis gambar dari byte awal file (bukan nama atau tipe dari browser); null bila bukan JPG/PNG/WEBP. */
export function jenisFoto(b: Uint8Array): JenisFoto | null {
    const awal = (...x: number[]) => x.every((v, i) => b[i] === v);
    if (awal(0xff, 0xd8, 0xff)) return 'image/jpeg';
    if (awal(0x89, 0x50, 0x4e, 0x47)) return 'image/png';
    if (awal(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
    return null;
}

export const tabelBelumAda = (e: unknown) => (e as { code?: string }).code === '42P01';

/** Simpan (atau ganti) foto profil akun. Jenis harus dari jenisFoto(). */
export async function simpanFoto(db: pg.Pool | pg.PoolClient, userId: number, isi: Uint8Array, jenis: JenisFoto) {
    await db.query(
        `INSERT INTO app_user_foto (app_user_id, isi, jenis, diubah_pada) VALUES ($1, $2, $3, now())
         ON CONFLICT (app_user_id) DO UPDATE SET isi = EXCLUDED.isi, jenis = EXCLUDED.jenis, diubah_pada = now()`,
        [userId, Buffer.from(isi), jenis]);
}
