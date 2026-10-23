import { query } from "@/lib/db"

// Gambar pengumuman: sengaja terbuka tanpa login, karena sistem notifikasi HP mengambilnya langsung. Alamat memakai
// token acak 128 bit dan hanya berisi gambar himbauan, promo, dan notifikasi (tidak ada data keuangan).
export async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await ctx.params
    if (!/^[0-9a-f]{32}$/.test(token)) return new Response(null, { status: 404 })
    try {
        const [g] = await query<{ isi: Buffer; jenis: string }>("SELECT isi, jenis FROM pengumuman_gambar WHERE token = $1", [token])
        if (!g) return new Response(null, { status: 404 })
        return new Response(new Uint8Array(g.isi), {
            headers: { "Content-Type": g.jenis, "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable" },
        })
    } catch (e) {
        if ((e as { code?: string }).code === "42P01") return new Response(null, { status: 404 })
        throw e
    }
}
