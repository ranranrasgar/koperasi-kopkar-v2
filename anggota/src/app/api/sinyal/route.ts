import { catatBukaHalaman, namaPerangkat, tandaiAktif } from "@kopkar/backend/src/aktivitas.ts"
import { anggotaSesi } from "@/lib/anggota"
import { pool } from "@/lib/db"

/**
 * Sinyal online dari PWA yang sedang dibuka (components/SinyalAktif). Identitas dari sesi; hanya bagian menu dari alamat yang disimpan.
 * `baru`: halaman baru dibuka (bukan sinyal per menit), dicatat juga di riwayat Aktivitas Pengguna sebagai "Buka halaman".
 */
export async function POST(req: Request) {
    const a = await anggotaSesi()
    if (!a) return new Response(null, { status: 401 })
    const isi = await req.json().catch(() => null)
    const alamat = String(isi?.h ?? "")
    const h = alamat.match(/^\/[a-z-]{1,30}/)?.[0]
    if (!h) return new Response(null, { status: 400 })
    if (isi?.baru === true) await catatBukaHalaman(pool, { penggunaId: a.userId, nama: a.nama, bagian: h, lengkap: alamat.match(/^\/[a-z-]{1,30}\/[a-z-]{1,30}/)?.[0] })
    await tandaiAktif(pool, { kanal: "pwa", penggunaId: a.userId, nama: a.nama, kode: a.kodeAgt, halaman: h, perangkat: namaPerangkat(req.headers.get("user-agent")) })
    return new Response(null, { status: 204 })
}
