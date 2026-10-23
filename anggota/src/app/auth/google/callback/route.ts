import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import { cariAkun, cariAkunGoogle } from "@kopkar/backend/src/anggota/akun.ts"
import { cobaLagi } from "@/lib/batas"
import { pool } from "@/lib/db"
import { alamatBalik, COOKIE_GOOGLE_DAFTAR, COOKIE_GOOGLE_OAUTH, tukarKode } from "@/lib/google"
import { bacaToken, buatSesi, buatToken, COOKIE_SESI, LAMA_SESI_DETIK, sidikPassword } from "@/lib/sesi"

export const dynamic = "force-dynamic"

const kue = (maxAge: number) => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge })

/**
 * Hasil Google: akun yang sudah tertaut (atau email-nya sama dengan email akun yang terverifikasi) langsung masuk;
 * selain itu data Google disimpan sementara (30 menit, bertanda tangan) dan pengguna melengkapi NIK dll di /daftar/google.
 */
export async function GET(req: NextRequest) {
    const jar = await cookies()
    const oauth = bacaToken("google-oauth", jar.get(COOKIE_GOOGLE_OAUTH)?.value)
    jar.delete({ name: COOKIE_GOOGLE_OAUTH, path: "/auth/google" })
    const kode = req.nextUrl.searchParams.get("code"), state = req.nextUrl.searchParams.get("state")
    if (req.nextUrl.searchParams.get("error") || !kode || !oauth || oauth.s !== state) redirect("/masuk?galat=google")
    const ip = ((await headers()).get("x-forwarded-for")?.split(",")[0] ?? "lokal").trim()
    if (cobaLagi(`google:${ip}`, 20, 15 * 60_000)) redirect("/masuk?galat=google")

    const profil = await tukarKode(kode, oauth.v, await alamatBalik())
    if (!profil) redirect("/masuk?galat=google")

    const userId = await cariAkunGoogle(pool, profil.sub, profil.email)
    if (userId) {
        const a = await cariAkun(pool, { id: userId })
        if (a?.menunggu_admin && !a.akun_aktif) redirect("/daftar/diterima")
        if (!a || !a.akun_aktif || !a.password_hash || (a.anggota_id && !a.anggota_aktif)) redirect("/masuk?galat=nonaktif")
        jar.set(COOKIE_SESI, buatSesi({ u: userId, pv: sidikPassword(a.password_hash) }), kue(LAMA_SESI_DETIK))
        redirect("/beranda")
    }
    jar.set(COOKIE_GOOGLE_DAFTAR, buatToken("google-daftar", { sub: profil.sub, email: profil.email, nama: profil.nama, foto: profil.foto }, 30 * 60), kue(30 * 60))
    redirect("/daftar/google")
}
