import "server-only"
import { cache } from "react"
import { query } from "@/lib/db"
import { jenisGambar } from "@/lib/gambar"

export const LOGO_BAWAAN = "/logo-removebg-preview.png"

export interface Identitas { nama: string; logo: string; logoSendiri: boolean }

/**
 * Nama dan logo koperasi dari Pengaturan Perusahaan (tabel perusahaan), dipakai sidebar, halaman login,
 * dan ikon tab browser. URL logo membawa sidik isi sehingga cache browser berganti saat logo diubah.
 * Logo yang jenisnya tidak dikenali jenisGambar (mis. BMP lama dari desktop) diganti logo bawaan.
 */
export const identitasKoperasi = cache(async (): Promise<Identitas> => {
    const [p] = await query<{ nama: string | null; versi: string | null; awal: Buffer | null }>(
        "SELECT nama_perusahaan AS nama, left(md5(logo), 12) AS versi, substring(logo from 1 for 12) AS awal FROM perusahaan ORDER BY id LIMIT 1")
    const logoSendiri = !!(p?.versi && p.awal && jenisGambar(p.awal))
    return { nama: p?.nama?.trim() || "KOPKAR MJS", logo: logoSendiri ? `/logo?v=${p!.versi}` : LOGO_BAWAAN, logoSendiri }
})
