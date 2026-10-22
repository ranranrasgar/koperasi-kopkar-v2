"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { query } from "@/lib/db"
import { cariOpr, oprAktif, operatorSesi } from "@/lib/operator"
import { cekPasswordBaru, cocokPassword, hashPassword } from "@/lib/password"
import { buatSesi, COOKIE_SESI, LAMA_SESI_DETIK, sidikPassword } from "@/lib/sesi"

export type HasilAuth = { error: string } | null

// Penguncian sementara setelah gagal berturut-turut, per nama operator (memori proses).
const MAKS_GAGAL = 5
const KUNCI_MS = 5 * 60 * 1000
const gagal = new Map<string, { n: number; sampai: number }>()
// Hash pengganti supaya nama yang tidak ada tetap memakan waktu scrypt yang sama.
const HASH_SEMU = "scrypt$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000"

async function pasangSesi(o: { id: number; nama: string; password_hash: string }) {
    (await cookies()).set(COOKIE_SESI, buatSesi({ id: o.id, nama: o.nama, pv: sidikPassword(o.password_hash) }), {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: LAMA_SESI_DETIK,
    })
}

const tujuanAman = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "")
    return s.startsWith("/dashboard") && !s.startsWith("//") ? s : "/dashboard"
}

export async function loginAction(_: HasilAuth, f: FormData): Promise<HasilAuth> {
    const nama = String(f.get("nama") ?? "").trim()
    const password = String(f.get("password") ?? "")
    if (!nama || !password) return { error: "Nama operator dan password wajib diisi" }

    const k = nama.toLowerCase()
    const g = gagal.get(k)
    if (g && g.n >= MAKS_GAGAL && g.sampai > Date.now()) {
        return { error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${Math.ceil((g.sampai - Date.now()) / 60000)} menit.` }
    }

    const o = await cariOpr({ nama })
    const cocok = await cocokPassword(password, o?.password_hash ?? HASH_SEMU)
    if (!o || !o.password_hash || !cocok || !oprAktif(o)) {
        const n = (g && g.sampai > Date.now() ? g.n : 0) + 1
        gagal.set(k, { n, sampai: Date.now() + KUNCI_MS })
        return { error: "Nama operator atau password salah, atau akun tidak aktif" }
    }
    gagal.delete(k)
    await pasangSesi({ id: o.id, nama: o.nama, password_hash: o.password_hash })
    redirect(o.wajib_ganti_password ? "/ganti-password" : tujuanAman(f.get("next")))
}

export async function logoutAction() {
    (await cookies()).delete(COOKIE_SESI)
    redirect("/login")
}

export async function gantiPasswordAction(_: HasilAuth, f: FormData): Promise<HasilAuth> {
    const sesi = await operatorSesi()
    if (!sesi) redirect("/login")
    const lama = String(f.get("lama") ?? ""), baru = String(f.get("baru") ?? ""), ulang = String(f.get("ulang") ?? "")

    const o = await cariOpr({ id: sesi.id })
    if (!o?.password_hash || !(await cocokPassword(lama, o.password_hash))) return { error: "Password lama salah" }
    if (baru !== ulang) return { error: "Ulangi password baru dengan sama persis" }
    const salah = cekPasswordBaru(baru)
    if (salah) return { error: salah }
    if (baru === lama) return { error: "Password baru harus berbeda dari password lama" }

    const hash = await hashPassword(baru)
    await query("UPDATE opr SET password_hash = $1, wajib_ganti_password = false WHERE id = $2", [hash, o.id])
    await pasangSesi({ id: o.id, nama: o.nama, password_hash: hash })
    redirect("/dashboard")
}
