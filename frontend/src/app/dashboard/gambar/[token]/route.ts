import { query } from "@/lib/db"

// Pratinjau gambar pengumuman untuk operator (alamat /dashboard/* hanya bisa dibuka setelah login, lihat proxy.ts).
export async function GET(_: Request, ctx: { params: Promise<{ token: string }> }) {
    const { token } = await ctx.params
    if (!/^[0-9a-f]{32}$/.test(token)) return new Response(null, { status: 404 })
    const [g] = await query<{ isi: Buffer; jenis: string }>("SELECT isi, jenis FROM pengumuman_gambar WHERE token = $1", [token])
    if (!g) return new Response(null, { status: 404 })
    return new Response(new Uint8Array(g.isi), {
        headers: { "Content-Type": g.jenis, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=3600" },
    })
}
