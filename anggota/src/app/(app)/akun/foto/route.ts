import { anggotaSesi } from "@/lib/anggota"
import { query } from "@/lib/db"
import { tabelBelumAda } from "@/lib/foto"

// Foto profil milik akun yang login saja (tidak ada URL foto orang lain).
export async function GET() {
    const a = await anggotaSesi()
    if (!a) return new Response(null, { status: 401 })
    try {
        const [f] = await query<{ isi: Buffer; jenis: string }>("SELECT isi, jenis FROM app_user_foto WHERE app_user_id = $1", [a.userId])
        if (!f) return new Response(null, { status: 404 })
        return new Response(new Uint8Array(f.isi), {
            headers: { "Content-Type": f.jenis, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=86400" },
        })
    } catch (e) {
        if (tabelBelumAda(e)) return new Response(null, { status: 404 })
        throw e
    }
}
