import type { MetadataRoute } from "next"
import { namaKoperasi } from "@/lib/koperasi"

// Manifest PWA: aplikasi dipasang ke layar utama dan dibuka tanpa bilah browser. Ikon dibuat dengan
// anggota/scripts/buat-ikon.mjs dari logo koperasi. Sengaja tanpa theme_color: warna bilah status diambil dari
// meta theme-color di layout.tsx (mengikuti mode terang/gelap) supaya menyatu dengan latar halaman.
export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const nama = await namaKoperasi()
    return {
        id: "/",
        name: `${nama} · Aplikasi Anggota`,
        short_name: "Kopkar MJS",
        description: "Simpanan, pinjaman, SHU, dan pengajuan kredit anggota koperasi.",
        lang: "id",
        dir: "ltr",
        start_url: "/beranda",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f5f7f5",
        categories: ["finance"],
        icons: [
            { src: "/ikon/ikon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/ikon/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/ikon/ikon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/ikon/ikon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
            { name: "Simpanan", url: "/simpanan", icons: [{ src: "/ikon/ikon-192.png", sizes: "192x192" }] },
            { name: "Pinjaman", url: "/pinjaman", icons: [{ src: "/ikon/ikon-192.png", sizes: "192x192" }] },
            { name: "Ajukan pinjaman", url: "/ajukan", icons: [{ src: "/ikon/ikon-192.png", sizes: "192x192" }] },
        ],
    }
}
