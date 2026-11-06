import { namaPerangkat, tandaiAktif } from "@kopkar/backend/src/aktivitas.ts"
import { anggotaSesi } from "@/lib/anggota"
import { pool } from "@/lib/db"

/** Sinyal online dari PWA yang sedang dibuka (components/SinyalAktif). Identitas dari sesi; hanya bagian menu dari alamat yang disimpan. */
export async function POST(req: Request) {
    const a = await anggotaSesi()
    if (!a) return new Response(null, { status: 401 })
    const h = String((await req.json().catch(() => null))?.h ?? "").match(/^\/[a-z-]{1,30}/)?.[0]
    if (!h) return new Response(null, { status: 400 })
    await tandaiAktif(pool, { kanal: "pwa", penggunaId: a.userId, nama: a.nama, kode: a.kodeAgt, halaman: h, perangkat: namaPerangkat(req.headers.get("user-agent")) })
    return new Response(null, { status: 204 })
}
