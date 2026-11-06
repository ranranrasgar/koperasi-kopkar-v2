"use server"

import { revalidatePath } from "next/cache"
import { hapusRiwayat } from "@kopkar/backend/src/aktivitas.ts"
import { catatAksi } from "@/lib/aktivitas"
import { modeUji, tx } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"

export type HasilBersihkan = { ok: true; pesan: string } | { ok: false; error: string }

/** Hapus riwayat aktivitas. Khusus superadmin, dan penghapusannya sendiri selalu meninggalkan satu baris riwayat. hari = 0 berarti semua. */
export async function bersihkanRiwayatAction(hari: number, konfirmasi: string): Promise<HasilBersihkan> {
    try {
        const o = await operatorAktif()
        if (!o.superadmin) throw new GalatSesi("Hanya superadmin yang boleh menghapus riwayat aktivitas")
        if (![0, 7, 30].includes(hari)) return { ok: false, error: "Pilihan rentang tidak dikenal" }
        if (konfirmasi.trim() !== "HAPUS") return { ok: false, error: "Ketik HAPUS untuk memastikan" }
        const n = await tx((db) => hapusRiwayat(db, hari || null))
        const pesan = `${n} riwayat ${hari ? `lebih dari ${hari} hari` : "(semua)"} dihapus`
        await catatAksi("Aktivitas Pengguna", pesan, o)
        revalidatePath("/dashboard/settings/aktivitas")
        return { ok: true, pesan: await modeUji() ? `MODE UJI, tidak terhapus: ${pesan}` : pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("hapus riwayat aktivitas gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal menghapus riwayat" }
    }
}
