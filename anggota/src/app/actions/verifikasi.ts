"use server"

import { headers } from "next/headers"
import { cariAkun } from "@kopkar/backend/src/anggota/akun.ts"
import { kirimKodeVerifikasi, periksaKodeVerifikasi, statusEmail } from "@kopkar/backend/src/anggota/verifikasi-email.ts"
import { cobaLagi, pesanTunggu } from "@/lib/batas"
import { pool } from "@/lib/db"
import { kirimSekarang } from "@/lib/email"
import { bacaTokenVerifikasi } from "@/lib/sesi"

export type HasilVerifikasi = { ok: true; pesan: string; aktivasi: boolean } | { ok: false; error: string } | null

const MENIT = 60_000
const teks = (f: FormData, k: string) => String(f.get(k) ?? "")
const GAGAL_TOKEN = "Tautan tidak berlaku atau sudah kedaluwarsa. Masuk lagi untuk meminta kode baru."

async function ip() {
    const h = await headers()
    return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "lokal").trim()
}

/** Periksa kode 6 angka. Dibatasi per akun dan per alamat IP (selain batas salah per kode di backend). */
export async function verifikasiKodeAction(_: HasilVerifikasi, f: FormData): Promise<HasilVerifikasi> {
    const t = bacaTokenVerifikasi(teks(f, "token"))
    if (!t) return { ok: false, error: GAGAL_TOKEN }
    const tunggu = cobaLagi(`verif:${t.u}`, 12, 15 * MENIT) || cobaLagi(`verif-ip:${await ip()}`, 40, 15 * MENIT)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    const r = await periksaKodeVerifikasi(pool, t.u, teks(f, "kode"))
    if (!r.ok) return r
    return { ok: true, aktivasi: r.aktivasi, pesan: r.aktivasi ? "Email terverifikasi dan akun Anda sudah aktif. Silakan masuk." : "Email terverifikasi. Anda akan menerima notifikasi lewat email ini." }
}

/** Kirim ulang kode (jeda 60 detik per akun di backend, plus batas per jam di sini). */
export async function kirimUlangKodeAction(_: HasilVerifikasi, f: FormData): Promise<HasilVerifikasi> {
    const t = bacaTokenVerifikasi(teks(f, "token"))
    if (!t) return { ok: false, error: GAGAL_TOKEN }
    const tunggu = cobaLagi(`kode-ulang:${t.u}`, 6, 60 * MENIT) || cobaLagi(`kode-ulang-ip:${await ip()}`, 20, 60 * MENIT)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    const st = await statusEmail(pool, t.u)
    const akun = await cariAkun(pool, { id: t.u })
    if (!st.email || !akun) return { ok: false, error: GAGAL_TOKEN }
    const r = await kirimKodeVerifikasi(pool, t.u, st.email, akun.username, { aktivasi: st.menungguAktivasi })
    if (!r.ok) return r
    void kirimSekarang()
    return { ok: true, aktivasi: false, pesan: "Kode baru dikirim ke email Anda." }
}
