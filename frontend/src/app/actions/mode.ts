"use server"

import { revalidatePath } from "next/cache"
import { modeUjiTerkunci, query } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import { MENU } from "@/config/akses"

export type HasilMode = { ok: true; pesan: string } | { ok: false; error: string }

/**
 * Saklar mode uji/live. Sengaja tidak lewat tx(): perubahan mode harus tersimpan walaupun sedang mode uji.
 * Berlaku langsung untuk semua operator, karena tx() membaca mode di setiap transaksi.
 */
export async function aturModeAction(uji: boolean): Promise<HasilMode> {
    try {
        const o = await operatorAktif([MENU.modeAplikasi])
        if (modeUjiTerkunci !== null)
            return { ok: false, error: "Mode dikunci oleh KOPKAR_UJI_ROLLBACK di .env.local server; hapus baris itu dan jalankan ulang server untuk memakai saklar" }
        await query(`INSERT INTO pengaturan_web (kunci, nilai, diubah_oleh, diubah_pada) VALUES ('mode_uji', $1, $2, now())
            ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai, diubah_oleh = EXCLUDED.diubah_oleh, diubah_pada = now()`, [uji ? "1" : "0", o.nama])
        revalidatePath("/", "layout")
        return { ok: true, pesan: uji ? "Mode UJI aktif: transaksi berikutnya dibatalkan dan tidak tersimpan" : "Mode LIVE aktif: transaksi berikutnya tersimpan permanen" }
    } catch (e) {
        if ((e as { code?: string }).code === "42P01") return { ok: false, error: "Tabel pengaturan belum dipasang; jalankan npm run pengaturan:pasang" }
        if (!(e instanceof GalatSesi)) console.error("atur mode gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal mengubah mode" }
    }
}
