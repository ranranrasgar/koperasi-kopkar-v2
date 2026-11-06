import { namaPerangkat, tandaiAktif } from "@kopkar/backend/src/aktivitas.ts"
import { pool } from "@/lib/db"
import { operatorSesi } from "@/lib/operator"

/** Sinyal online dari tab admin yang sedang dibuka (components/layout/SinyalAktif). Identitas selalu dari sesi, hanya alamat halaman yang dari klien. */
export async function POST(req: Request) {
    const o = await operatorSesi()
    if (!o) return new Response(null, { status: 401 })
    const h = String((await req.json().catch(() => null))?.h ?? "")
    if (!/^\/dashboard[A-Za-z0-9._\-/%]{0,100}$/.test(h)) return new Response(null, { status: 400 })
    await tandaiAktif(pool, { kanal: "admin", penggunaId: o.id, nama: o.nama, kode: o.grup, halaman: h, perangkat: namaPerangkat(req.headers.get("user-agent")) })
    return new Response(null, { status: 204 })
}
