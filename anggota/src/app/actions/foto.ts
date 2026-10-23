"use server"

import { revalidatePath } from "next/cache"
import { anggotaSesi } from "@/lib/anggota"
import { pool } from "@/lib/db"
import { jenisFoto, MAKS_FOTO, tabelBelumAda } from "@/lib/foto"

export type HasilFoto = { ok: true } | { ok: false; error: string } | null

/** Unggah foto profil sendiri: JPG/PNG/WEBP maks. 5 MB, jenis dicek dari isi file (paritas updateprofile). */
export async function fotoAction(_: HasilFoto, f: FormData): Promise<HasilFoto> {
    const a = await anggotaSesi()
    if (!a) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    const file = f.get("foto")
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih foto terlebih dahulu" }
    if (file.size > MAKS_FOTO) return { ok: false, error: "Ukuran foto maksimal 5 MB" }
    const isi = new Uint8Array(await file.arrayBuffer())
    const jenis = jenisFoto(isi)
    if (!jenis) return { ok: false, error: "Foto harus berformat JPG, PNG, atau WEBP" }
    try {
        await pool.query(
            `INSERT INTO app_user_foto (app_user_id, isi, jenis, diubah_pada) VALUES ($1, $2, $3, now())
             ON CONFLICT (app_user_id) DO UPDATE SET isi = EXCLUDED.isi, jenis = EXCLUDED.jenis, diubah_pada = now()`,
            [a.userId, Buffer.from(isi), jenis])
    } catch (e) {
        if (tabelBelumAda(e)) return { ok: false, error: "Fitur foto belum dipasang di server" }
        throw e
    }
    revalidatePath("/akun")
    return { ok: true }
}
