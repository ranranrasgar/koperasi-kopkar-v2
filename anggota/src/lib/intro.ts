import "server-only"
import { pool } from "@/lib/db"

/** Apakah akun ini sudah melihat halaman pengantar. Bila tabel belum dipasang, dianggap sudah (pengantar tidak muncul). */
export async function sudahLihatIntro(userId: number) {
    try {
        const r = await pool.query("SELECT 1 FROM app_user_intro WHERE app_user_id = $1", [userId])
        return r.rows.length > 0
    } catch (e) {
        if ((e as { code?: string }).code === "42P01") return true
        throw e
    }
}

export async function tandaiIntroDilihat(userId: number) {
    try {
        await pool.query("INSERT INTO app_user_intro (app_user_id) VALUES ($1) ON CONFLICT DO NOTHING", [userId])
    } catch (e) {
        if ((e as { code?: string }).code !== "42P01") throw e
    }
}
