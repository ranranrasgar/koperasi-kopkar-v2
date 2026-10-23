import "server-only"
import { cache } from "react"
import { query } from "@/lib/db"

/** Nama koperasi dari Pengaturan Perusahaan (sama dengan aplikasi admin). */
export const namaKoperasi = cache(async () => {
    const [p] = await query<{ nama: string | null }>("SELECT nama_perusahaan AS nama FROM perusahaan ORDER BY id LIMIT 1")
    return p?.nama?.trim() || "KOPKAR MJS 2000"
})

/** Nomor WhatsApp koperasi dari Pengaturan di admin (pengaturan_web.wa_kontak), hanya angka berawalan 62; null bila belum diisi. */
export const kontakWa = cache(async () => {
    try {
        const [p] = await query<{ nilai: string }>("SELECT nilai FROM pengaturan_web WHERE kunci = 'wa_kontak'")
        const n = (p?.nilai ?? "").replace(/\D/g, "").replace(/^0/, "62")
        return n.length >= 9 ? n : null
    } catch {
        return null
    }
})
