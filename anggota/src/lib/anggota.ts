import "server-only"
import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cariAkun } from "@kopkar/backend/src/anggota/akun.ts"
import { pool } from "@/lib/db"
import { bacaSesi, COOKIE_SESI, sidikPassword } from "@/lib/sesi"

export interface Anggota {
    userId: number
    username: string
    /** Null untuk karyawan Mattel yang belum terdaftar sebagai anggota (keputusan K5: akses terbatas). */
    anggotaId: number | null
    kodeAgt: string
    nama: string
    email: string | null
}

/**
 * Anggota dari cookie sesi, diperiksa ulang ke database di setiap request: akun dan anggota masih aktif,
 * password belum diganti sejak login. Semua query data memakai anggotaId dari sini, tidak pernah dari parameter.
 */
export const anggotaSesi = cache(async (): Promise<Anggota | null> => {
    const s = bacaSesi((await cookies()).get(COOKIE_SESI)?.value)
    if (!s) return null
    const a = await cariAkun(pool, { id: s.u })
    if (!a || !a.akun_aktif || !a.password_hash || sidikPassword(a.password_hash) !== s.pv) return null
    if (a.anggota_id && !a.anggota_aktif) return null
    return {
        userId: Number(a.user_id), username: a.username, anggotaId: a.anggota_id ? Number(a.anggota_id) : null,
        kodeAgt: a.kode_agt, nama: a.nama?.trim() || a.username, email: a.email,
    }
})

/** Email dianggap terisi bila minimal 5 karakter, sama dengan aplikasi lama. */
export const punyaEmail = (a: Pick<Anggota, "email">) => (a.email ?? "").trim().length >= 5

/**
 * Untuk halaman di dalam aplikasi: alihkan ke halaman masuk bila sesi tidak sah, dan ke Lengkapi Email bila akun
 * belum punya email (wajib seperti aplikasi lama; dicek di setiap halaman karena layout tidak dijalankan ulang).
 */
export async function wajibMasuk(opsi: { bolehTanpaEmail?: boolean } = {}) {
    const a = await anggotaSesi()
    if (!a) redirect("/masuk")
    if (!opsi.bolehTanpaEmail && !punyaEmail(a)) redirect("/lengkapi-email")
    return a
}

/**
 * Untuk halaman data keuangan: hanya anggota terdaftar. Karyawan Mattel yang belum menjadi anggota
 * dikembalikan ke beranda, yang menjelaskan cara menjadi anggota (keputusan K5).
 */
export async function wajibAnggota() {
    const a = await wajibMasuk()
    if (a.anggotaId === null) redirect("/beranda")
    return { ...a, anggotaId: a.anggotaId }
}
