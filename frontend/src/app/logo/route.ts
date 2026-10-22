import { NextResponse, type NextRequest } from "next/server"
import { query } from "@/lib/db"
import { jenisGambar } from "@/lib/gambar"
import { LOGO_BAWAAN } from "@/lib/koperasi"

// Logo koperasi dari perusahaan.logo. Publik (di luar matcher proxy.ts) karena dipakai halaman login dan favicon.
export async function GET(request: NextRequest) {
    const [p] = await query<{ logo: Buffer | null }>("SELECT logo FROM perusahaan ORDER BY id LIMIT 1")
    const jenis = p?.logo ? jenisGambar(p.logo) : null
    if (!p?.logo || !jenis) return NextResponse.redirect(new URL(LOGO_BAWAAN, request.url))
    return new Response(new Uint8Array(p.logo), {
        headers: {
            "Content-Type": jenis,
            "X-Content-Type-Options": "nosniff",
            // URL berversi (?v=sidik) boleh disimpan lama; tanpa versi selalu diperiksa ulang.
            "Cache-Control": request.nextUrl.searchParams.has("v") ? "public, max-age=31536000, immutable" : "no-cache",
        },
    })
}
