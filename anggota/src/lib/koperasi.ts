import "server-only"
import { cache } from "react"
import { query } from "@/lib/db"

/** Nama koperasi dari Pengaturan Perusahaan (sama dengan aplikasi admin). */
export const namaKoperasi = cache(async () => {
    const [p] = await query<{ nama: string | null }>("SELECT nama_perusahaan AS nama FROM perusahaan ORDER BY id LIMIT 1")
    return p?.nama?.trim() || "KOPKAR MJS 2000"
})
