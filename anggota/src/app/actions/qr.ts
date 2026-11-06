"use server"

import { buatQr, type JenisQr } from "@kopkar/backend/src/anggota/qr.ts"
import { anggotaSesi } from "@/lib/anggota"
import { pool } from "@/lib/db"

export type HasilQr = { ok: true; teks: string; detik: number } | { ok: false; error: string }

/** QR untuk ditunjukkan ke kasir. anggotaId selalu dari sesi; kepemilikan pinjaman diperiksa di buatQr. */
export async function buatQrAction(jenis: JenisQr, ref: string): Promise<HasilQr> {
    const a = await anggotaSesi()
    if (!a?.anggotaId) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    const qr = await buatQr(pool, a.anggotaId, jenis, ref)
    return qr ? { ok: true, ...qr } : { ok: false, error: "Data tidak ditemukan." }
}
