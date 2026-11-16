"use server"

import { buatQr, tokenQr } from "@kopkar/backend/src/anggota/qr.ts"
import { anggotaSesi } from "@/lib/anggota"
import { pool, query } from "@/lib/db"

export type HasilQrBayar = { ok: true; teks: string; detik: number } | { ok: false; error: string }
export type StatusBayar = { lunas: false } | { lunas: true; noBukti: string; kantin: string; total: number; status: string }

/** QR bayar belanja kantin dari Simpanan Sukarela: 60 detik, sekali pakai. anggotaId selalu dari sesi. */
export async function buatQrBayarAction(): Promise<HasilQrBayar> {
    const a = await anggotaSesi()
    if (!a?.anggotaId) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    const qr = await buatQr(pool, a.anggotaId, "bayar")
    return qr ? { ok: true, ...qr } : { ok: false, error: "Data tidak ditemukan." }
}

/** Apakah QR bayar ini sudah dipakai kasir untuk nota milik anggota yang sedang masuk. */
export async function statusBayarAction(teks: string): Promise<StatusBayar> {
    const a = await anggotaSesi()
    const token = tokenQr(teks)
    if (!a?.anggotaId || !token) return { lunas: false }
    const [p] = await query<{ no_bukti: string; kantin: string; total: number; status: string }>(
        `SELECT p.no_bukti, u.nama kantin, p.total, p.status FROM kantin_penjualan p JOIN unit_usaha u ON u.id = p.unit_usaha_id
          WHERE p.qr_token = $1 AND p.anggota_id = $2`, [token, a.anggotaId])
    return p ? { lunas: true, noBukti: p.no_bukti, kantin: p.kantin, total: Number(p.total), status: p.status } : { lunas: false }
}
