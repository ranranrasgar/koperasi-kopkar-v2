import crypto from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { MENU, punyaIzin } from "@/config/akses"
import { bacaManifest, batalUnggah, POTONGAN_UNGGAH, ruangKosongCadangan, selesaiUnggah, tulisPotonganUnggah } from "@/lib/cadangan"
import { operatorSesi } from "@/lib/operator"

// Unggah cadangan dari komputer, per potongan (lihat lib/cadangan.ts):
//   POST   ?aksi=mulai             isi: manifest.json      -> { id, potongan, total }   (cek manifest dan ruang disk)
//   PUT    ?id=&berkas=&posisi=    isi: <= 8 MB biner        -> { ukuran }               (tulis berurutan)
//   POST   ?aksi=selesai&id=       isi: manifest.json      -> { nama }                  (lengkap? lalu SHA-256)
//   DELETE ?id=                                              batalkan
// Route handler tidak punya pemeriksaan asal otomatis seperti server action, jadi Origin dicek di sini.

const galat = (pesan: string, status = 400) => NextResponse.json({ error: pesan }, { status })

async function jaga(request: NextRequest) {
    const o = await operatorSesi()
    if (!o || !punyaIzin(o.izin, [MENU.backupRestore])) return galat("Tidak berizin Backup & Restore", 403)
    const asal = request.headers.get("origin")
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
    if (!asal || !host || new URL(asal).host !== host) return galat("Asal permintaan tidak sah", 403)
    return null
}

export async function POST(request: NextRequest) {
    const tolak = await jaga(request)
    if (tolak) return tolak
    const sp = request.nextUrl.searchParams
    const teks = await request.text()
    try {
        if (sp.get("aksi") === "mulai") {
            const { potongan, total } = bacaManifest(teks)
            const kosong = ruangKosongCadangan()
            if (kosong !== null && kosong < total + 100 * 1024 * 1024) {
                return galat(`Ruang kosong di server hanya ${Math.round(kosong / 1048576)} MB, cadangan ini ${Math.round(total / 1048576)} MB`)
            }
            return NextResponse.json({ id: crypto.randomBytes(12).toString("hex"), potongan, total, ukuranPotongan: POTONGAN_UNGGAH })
        }
        if (sp.get("aksi") === "selesai") {
            const h = await selesaiUnggah(sp.get("id") ?? "", teks)
            return h.ok ? NextResponse.json({ nama: h.nama, keluaran: h.keluaran })
                : NextResponse.json({ error: "Berkas yang diunggah tidak cocok dengan manifest (rusak atau tidak lengkap); unggahan dibuang", keluaran: h.keluaran }, { status: 422 })
        }
        return galat("aksi tidak dikenal")
    } catch (e) {
        return galat(e instanceof Error ? e.message : "Gagal")
    }
}

export async function PUT(request: NextRequest) {
    const tolak = await jaga(request)
    if (tolak) return tolak
    const sp = request.nextUrl.searchParams
    const posisi = Number(sp.get("posisi"))
    const panjang = Number(request.headers.get("content-length"))
    if (!Number.isSafeInteger(posisi) || posisi < 0) return galat("posisi tidak sah")
    if (!Number.isSafeInteger(panjang) || panjang <= 0 || panjang > POTONGAN_UNGGAH) return galat(`potongan harus 1 byte sampai ${POTONGAN_UNGGAH} byte`, 413)
    try {
        const isi = new Uint8Array(await request.arrayBuffer())
        // Proxy memotong isi di atas batasnya tanpa galat; pastikan yang diterima utuh.
        if (isi.length !== panjang) return galat(`potongan tidak utuh (${isi.length} dari ${panjang} byte)`)
        return NextResponse.json({ ukuran: tulisPotonganUnggah(sp.get("id") ?? "", sp.get("berkas") ?? "", posisi, isi) })
    } catch (e) {
        return galat(e instanceof Error ? e.message : "Gagal")
    }
}

export async function DELETE(request: NextRequest) {
    const tolak = await jaga(request)
    if (tolak) return tolak
    try {
        batalUnggah(request.nextUrl.searchParams.get("id") ?? "")
        return NextResponse.json({ ok: true })
    } catch (e) {
        return galat(e instanceof Error ? e.message : "Gagal")
    }
}
