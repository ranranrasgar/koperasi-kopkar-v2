"use server"

import { revalidatePath } from "next/cache"
import { MENU } from "@/config/akses"
import { buatCadangan, hapusCadangan, namaDatabaseServer, periksaCadangan, pulihkanCadangan } from "@/lib/cadangan"
import { GalatSesi, operatorAktif } from "@/lib/operator"

export type HasilCadangan = { ok: true; pesan: string; keluaran?: string } | { ok: false; error: string; keluaran?: string }

// Backup & Restore sengaja tidak lewat tx() dan tidak dipengaruhi mode uji: cadangan dan pemulihan selalu sungguhan.

async function jaga(fn: () => Promise<HasilCadangan>): Promise<HasilCadangan> {
    try {
        await operatorAktif([MENU.backupRestore])
        return await fn()
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("backup/restore gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}

export async function buatCadanganAction(tanpaMedia: boolean): Promise<HasilCadangan> {
    return jaga(async () => {
        const r = await buatCadangan(tanpaMedia)
        revalidatePath("/dashboard/settings/backup")
        return r.ok ? { ok: true, pesan: "Cadangan selesai dibuat", keluaran: r.keluaran } : { ok: false, error: "Cadangan gagal dibuat", keluaran: r.keluaran }
    })
}

export async function periksaCadanganAction(nama: string): Promise<HasilCadangan> {
    return jaga(async () => {
        const r = await periksaCadangan(nama)
        return r.ok ? { ok: true, pesan: `${nama}: lengkap dan utuh (SHA-256 cocok)`, keluaran: r.keluaran }
            : { ok: false, error: `${nama}: tidak lengkap atau rusak`, keluaran: r.keluaran }
    })
}

export async function hapusCadanganAction(nama: string): Promise<HasilCadangan> {
    return jaga(async () => {
        hapusCadangan(nama)
        revalidatePath("/dashboard/settings/backup")
        return { ok: true, pesan: `${nama} dihapus` }
    })
}

/** Pulihkan: nama database harus diketik ulang persis (sama dengan restore.mjs --yakin). */
export async function pulihkanCadanganAction(nama: string, yakin: string): Promise<HasilCadangan> {
    return jaga(async () => {
        const db = namaDatabaseServer()
        if (!db || yakin.trim() !== db) return { ok: false, error: `Ketik nama database ${db} dengan tepat untuk memulihkan` }
        const r = await pulihkanCadangan(nama, yakin.trim())
        revalidatePath("/", "layout")
        return r.ok ? { ok: true, pesan: `Database ${db} dipulihkan dari ${nama}`, keluaran: r.keluaran }
            : { ok: false, error: "Pemulihan gagal. Bila gagal sebelum langkah penukaran, database lama tidak diubah; lihat keluaran di bawah.", keluaran: r.keluaran }
    })
}
