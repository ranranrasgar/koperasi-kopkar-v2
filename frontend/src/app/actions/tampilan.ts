"use server"

import { revalidatePath } from "next/cache"
import { temaSah, type Tema } from "@kopkar/backend/src/tampilan.ts"
import { pool } from "@/lib/db"
import { operatorAktif } from "@/lib/operator"

export type HasilTampilan = { ok: true; pesan: string } | { ok: false; error: string }

/**
 * Simpan tema tampilan milik operator yang sedang login. Preferensi pribadi (bukan data koperasi), jadi tidak mengikuti mode uji.
 * Nilai divalidasi ketat (#rrggbb) karena disisipkan ke <style> layout.
 */
export async function simpanTampilanAction(tema: Tema): Promise<HasilTampilan> {
    try {
        const o = await operatorAktif()
        const t = temaSah(tema)
        if (!t) return { ok: false, error: "Warna tidak valid; gunakan format #rrggbb" }
        await pool.query(
            `INSERT INTO opr_tampilan (operator_id, tema) VALUES ($1, $2::jsonb)
             ON CONFLICT (operator_id) DO UPDATE SET tema = EXCLUDED.tema, diubah_pada = now()`, [o.id, JSON.stringify(t)])
        revalidatePath("/dashboard", "layout")
        return { ok: true, pesan: "Tampilan disimpan" }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan tampilan" }
    }
}

/** Kembalikan ke tampilan awal aplikasi (hapus tema tersimpan). */
export async function resetTampilanAction(): Promise<HasilTampilan> {
    try {
        const o = await operatorAktif()
        await pool.query("DELETE FROM opr_tampilan WHERE operator_id = $1", [o.id])
        revalidatePath("/dashboard", "layout")
        return { ok: true, pesan: "Tampilan dikembalikan ke pengaturan awal" }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Gagal mengembalikan tampilan" }
    }
}
