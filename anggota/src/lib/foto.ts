import "server-only"
import { query } from "@/lib/db"

// Foto profil di tabel app_user_foto (npm run anggota:pasang). Bila tabel belum dipasang, fitur foto tidak tampil.

export const MAKS_FOTO = 5 * 1024 * 1024
export type JenisFoto = "image/jpeg" | "image/png" | "image/webp"

/** Jenis gambar dari byte awal file (bukan nama atau tipe dari browser); null bila bukan JPG/PNG/WEBP. */
export function jenisFoto(b: Uint8Array): JenisFoto | null {
    const awal = (...x: number[]) => x.every((v, i) => b[i] === v)
    if (awal(0xff, 0xd8, 0xff)) return "image/jpeg"
    if (awal(0x89, 0x50, 0x4e, 0x47)) return "image/png"
    if (awal(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp"
    return null
}

export const tabelBelumAda = (e: unknown) => (e as { code?: string }).code === "42P01"

/** Status foto akun: versi (untuk URL, berganti saat foto diganti), atau null bila belum ada; terpasang = tabel ada. */
export async function infoFoto(userId: number) {
    try {
        const [r] = await query<{ v: string }>("SELECT extract(epoch FROM diubah_pada)::bigint::text v FROM app_user_foto WHERE app_user_id = $1", [userId])
        return { terpasang: true, versi: r?.v ?? null }
    } catch (e) {
        if (tabelBelumAda(e)) return { terpasang: false, versi: null }
        throw e
    }
}
