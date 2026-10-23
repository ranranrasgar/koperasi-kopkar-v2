import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { acak, alamatBalik, COOKIE_GOOGLE_OAUTH, googleAktif, urlOtorisasi } from "@/lib/google"
import { buatToken } from "@/lib/sesi"

export const dynamic = "force-dynamic"

/** Mulai masuk/daftar dengan Google: simpan state + verifier PKCE di cookie bertanda tangan, lalu ke halaman Google. */
export async function GET() {
    if (!googleAktif()) redirect("/masuk")
    const state = acak(), verifier = acak(48)
    ;(await cookies()).set(COOKIE_GOOGLE_OAUTH, buatToken("google-oauth", { s: state, v: verifier }, 10 * 60), {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/auth/google", maxAge: 10 * 60,
    })
    redirect(urlOtorisasi(await alamatBalik(), state, verifier))
}
