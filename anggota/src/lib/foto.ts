import "server-only"
import { query } from "@/lib/db"

import { tabelBelumAda } from "@kopkar/backend/src/anggota/foto.ts"

// Foto profil di tabel app_user_foto (npm run anggota:pasang). Bila tabel belum dipasang, fitur foto tidak tampil.
// Aturan dan penyimpanan ada di backend, dipakai juga oleh mobile-api (aplikasi Android).
export { jenisFoto, MAKS_FOTO, simpanFoto, tabelBelumAda, type JenisFoto } from "@kopkar/backend/src/anggota/foto.ts"

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
