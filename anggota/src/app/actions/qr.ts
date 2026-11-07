"use server"

import { buatQr } from "@kopkar/backend/src/anggota/qr.ts"
import { anggotaSesi } from "@/lib/anggota"
import { pool } from "@/lib/db"

export type HasilQr = { ok: true; teks: string; detik: number } | { ok: false; error: string }

/** QR saya untuk ditunjukkan ke kasir, berlaku untuk semua transaksi. anggotaId selalu dari sesi. */
export async function buatQrAction(): Promise<HasilQr> {
    const a = await anggotaSesi()
    if (!a?.anggotaId) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    const qr = await buatQr(pool, a.anggotaId, "anggota")
    return qr ? { ok: true, ...qr } : { ok: false, error: "Data tidak ditemukan." }
}
