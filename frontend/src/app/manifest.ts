import type { MetadataRoute } from "next"
import { identitasKoperasi } from "@/lib/koperasi"

// Manifest PWA admin: aplikasi pengurus bisa dipasang ke layar utama HP/komputer dan dibuka tanpa bilah browser.
// Ikon disalin dari anggota/public/ikon (dibuat anggota/scripts/buat-ikon.mjs dari logo koperasi).
export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const k = await identitasKoperasi()
    return {
        id: "/dashboard",
        name: `${k.nama} · Management System`,
        short_name: "Kopkar Admin",
        description: "Aplikasi pengurus koperasi: anggota, simpanan, pinjaman, akuntansi, dan laporan.",
        lang: "id",
        dir: "ltr",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#1e293b",
        categories: ["finance", "business"],
        icons: [
            { src: "/ikon/ikon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/ikon/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/ikon/ikon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/ikon/ikon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
            { name: "Setoran Angsuran", url: "/dashboard/loans/payment", icons: [{ src: "/ikon/ikon-192.png", sizes: "192x192" }] },
            { name: "Pengajuan Kredit", url: "/dashboard/loans/apply", icons: [{ src: "/ikon/ikon-192.png", sizes: "192x192" }] },
            { name: "Daftar Anggota", url: "/dashboard/members", icons: [{ src: "/ikon/ikon-192.png", sizes: "192x192" }] },
        ],
    }
}
