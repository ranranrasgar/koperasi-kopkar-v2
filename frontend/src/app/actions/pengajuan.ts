"use server"

import { revalidatePath } from "next/cache"
import { modeUji, tx } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import { MENU } from "@/config/akses"

export type HasilPengajuan = { ok: true; pesan: string } | { ok: false; error: string }

/**
 * Setujui (Y) atau tolak (N) pengajuan yang masih menunggu (P). Pencairan dilakukan terpisah di form pencairan.
 * Lewat tx() supaya ikut di-rollback di mode uji.
 */
export async function putuskanPengajuanAction(id: number, setuju: boolean): Promise<HasilPengajuan> {
    try {
        await operatorAktif([MENU.pengajuan])
        const r = await tx(async (db) => (await db.query<{ kd_anggota: string }>(
            "UPDATE pengajuan_pinjaman SET status = $1 WHERE id = $2 AND status = 'P' RETURNING kd_anggota", [setuju ? "Y" : "N", id])).rows)
        if (r.length === 0) return { ok: false, error: "Pengajuan tidak ada atau sudah diputuskan" }
        const pesan = `Pengajuan ${r[0].kd_anggota} ${setuju ? "disetujui" : "ditolak"}`
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${pesan}` }
        revalidatePath("/dashboard/loans/apply")
        return { ok: true, pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("putuskan pengajuan gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}
