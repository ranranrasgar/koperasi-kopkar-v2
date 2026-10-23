"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { masukAnggota } from "@kopkar/backend/src/anggota/akun.ts"
import { pool } from "@/lib/db"
import { buatSesi, COOKIE_SESI, LAMA_SESI_DETIK, sidikPassword } from "@/lib/sesi"

export type HasilAuth = { error: string; username?: string } | null

// Penguncian sementara setelah gagal berturut-turut, per username (memori proses), seperti login operator admin.
const MAKS_GAGAL = 5
const KUNCI_MS = 5 * 60 * 1000
const gagal = new Map<string, { n: number; sampai: number }>()

export async function masukAction(_: HasilAuth, f: FormData): Promise<HasilAuth> {
    const username = String(f.get("username") ?? "").trim()
    const password = String(f.get("password") ?? "")
    if (!username || !password) return { error: "Username dan password wajib diisi", username }

    const k = username.toLowerCase()
    const g = gagal.get(k)
    if (g && g.n >= MAKS_GAGAL && g.sampai > Date.now()) {
        return { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((g.sampai - Date.now()) / 60000)} menit.`, username }
    }

    const hasil = await masukAnggota(pool, username, password)
    if (!hasil.ok) {
        // Pesan disamarkan (keputusan K7), kecuali akun yang memang dinonaktifkan.
        if (hasil.alasan === "salah") {
            gagal.set(k, { n: (g && g.sampai > Date.now() ? g.n : 0) + 1, sampai: Date.now() + KUNCI_MS })
            return { error: "Username atau password salah", username }
        }
        return { error: "Akun Anda tidak aktif. Hubungi pengurus koperasi.", username }
    }
    gagal.delete(k)

    const { akun } = hasil
    ;(await cookies()).set(COOKIE_SESI, buatSesi({ u: Number(akun.user_id), pv: sidikPassword(akun.password_hash!) }), {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: LAMA_SESI_DETIK,
    })
    // Seperti aplikasi lama: akun tanpa email (kurang dari 5 karakter) wajib mengisi email dulu.
    redirect((akun.email ?? "").trim().length < 5 ? "/lengkapi-email" : "/beranda")
}

export async function keluarAction() {
    (await cookies()).delete(COOKIE_SESI)
    redirect("/masuk")
}
