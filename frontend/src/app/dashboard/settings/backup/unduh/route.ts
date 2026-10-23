import fs from "node:fs"
import path from "node:path"
import { Readable } from "node:stream"
import { NextResponse, type NextRequest } from "next/server"
import { MENU, punyaIzin } from "@/config/akses"
import { jalurCadangan } from "@/lib/cadangan"
import { operatorSesi } from "@/lib/operator"

// Unduh satu berkas cadangan (potongan .dump.NNN atau manifest.json), dialirkan dari disk tanpa dimuat ke memori,
// sehingga berkas besar pun aman. Hanya operator berizin Backup & Restore.
export async function GET(request: NextRequest) {
    const o = await operatorSesi()
    if (!o || !punyaIzin(o.izin, [MENU.backupRestore])) return new NextResponse("Tidak berizin", { status: 403 })
    const nama = request.nextUrl.searchParams.get("nama") ?? "", berkas = request.nextUrl.searchParams.get("berkas") ?? ""
    if (!/^(data|media)\.dump(\.\d{3})?$|^manifest\.json$/.test(berkas)) return new NextResponse("Berkas tidak sah", { status: 400 })
    let f: string
    try {
        f = path.join(jalurCadangan(nama), berkas)
    } catch {
        return new NextResponse("Nama cadangan tidak sah", { status: 400 })
    }
    if (!fs.existsSync(f)) return new NextResponse("Berkas tidak ditemukan", { status: 404 })
    const ukuran = fs.statSync(f).size
    const unduh = berkas === "manifest.json" ? `${nama}-manifest.json` : berkas
    return new Response(Readable.toWeb(fs.createReadStream(f)) as ReadableStream, {
        headers: {
            "Content-Type": berkas.endsWith(".json") ? "application/json" : "application/octet-stream",
            "Content-Length": String(ukuran),
            "Content-Disposition": `attachment; filename="${unduh}"`,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    })
}
