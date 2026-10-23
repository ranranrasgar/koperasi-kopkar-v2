"use server"

import { revalidatePath } from "next/cache"
import { kabariOperatorPesanBaru, kirimPesanAnggota, PesanSalah } from "@kopkar/backend/src/anggota/pesan.ts"
import { anggotaSesi } from "@/lib/anggota"
import { modeUji, pool, tx } from "@/lib/db"

export type HasilPesan = { ok: true; id: number | null; pesan: string } | { ok: false; error: string } | null

/**
 * Kirim pesan baru (dengan subjek) atau lanjutkan percakapan sendiri (dengan id). Lewat tx(): mode uji membatalkan
 * simpanan dan tidak memberi tahu operator. Setelah tersimpan, operator berizin menerima Web Push.
 */
export async function kirimPesanAction(_: HasilPesan, f: FormData): Promise<HasilPesan> {
    const a = await anggotaSesi()
    if (!a) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    if (a.anggotaId === null) return { ok: false, error: "Pesan ke koperasi hanya untuk anggota" }
    const anggotaId = a.anggotaId
    const idMentah = Number(f.get("id") || 0)
    const percakapanId = Number.isInteger(idMentah) && idMentah > 0 ? idMentah : null
    try {
        const p = await tx((db) => kirimPesanAnggota(db, {
            anggotaId, appUserId: a.userId, percakapanId, subjek: String(f.get("subjek") ?? ""), isi: String(f.get("isi") ?? ""),
        }))
        if (await modeUji()) return { ok: true, id: null, pesan: "MODE UJI, pesan tidak tersimpan" }
        await kabariOperatorPesanBaru(pool, { percakapanId: p.percakapanId, nama: a.nama, subjek: p.subjek, isi: p.isi })
            .catch((e) => console.error("kabari operator gagal:", e))
        revalidatePath("/pesan")
        return { ok: true, id: p.percakapanId, pesan: "Pesan terkirim" }
    } catch (e) {
        if (e instanceof PesanSalah) return { ok: false, error: e.message }
        throw e
    }
}
