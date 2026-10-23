import "server-only"
import crypto from "node:crypto"
import { headers } from "next/headers"
import { pool } from "@/lib/db"
import { jenisFoto, MAKS_FOTO } from "@/lib/foto"

// Masuk/daftar dengan Google (OpenID Connect, kode otorisasi + PKCE). Hanya memakai alur server: kode ditukar di server
// dengan GOOGLE_CLIENT_SECRET, sehingga ID token datang langsung dari Google lewat TLS.

export const googleAktif = () => !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET

export const COOKIE_GOOGLE_OAUTH = "google_oauth"
export const COOKIE_GOOGLE_DAFTAR = "google_daftar"

export interface ProfilGoogle { sub: string; email: string; nama: string; foto: string }

/** Alamat balik OAuth: GOOGLE_REDIRECT_URI bila berupa alamat lengkap, selain itu dari host permintaan. Harus terdaftar di Google Console. */
export async function alamatBalik() {
    const env = (process.env.GOOGLE_REDIRECT_URI ?? "").trim()
    if (/^https?:\/\//.test(env)) return env
    const h = await headers()
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3200"
    const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https")
    return `${proto}://${host}/auth/google/callback`
}

export const acak = (n = 32) => crypto.randomBytes(n).toString("base64url")
const tantanganPkce = (verifier: string) => crypto.createHash("sha256").update(verifier).digest("base64url")

export function urlOtorisasi(redirect: string, state: string, verifier: string) {
    const u = new URL("https://accounts.google.com/o/oauth2/v2/auth")
    u.search = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!, redirect_uri: redirect, response_type: "code", scope: "openid email profile",
        state, code_challenge: tantanganPkce(verifier), code_challenge_method: "S256", prompt: "select_account",
    }).toString()
    return u.toString()
}

/** Tukar kode dengan ID token lalu periksa penerbit, audiens, masa berlaku, dan email terverifikasi. Null bila gagal. */
export async function tukarKode(code: string, verifier: string, redirect: string): Promise<ProfilGoogle | null> {
    try {
        const r = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, signal: AbortSignal.timeout(15_000),
            body: new URLSearchParams({
                code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                redirect_uri: redirect, grant_type: "authorization_code", code_verifier: verifier,
            }),
        })
        if (!r.ok) { console.error("google: tukar kode gagal", r.status, await r.text()); return null }
        const idToken = String(((await r.json()) as { id_token?: string }).id_token ?? "")
        const p = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64url").toString()) as {
            iss?: string; aud?: string; exp?: number; sub?: string; email?: string; email_verified?: boolean | string; name?: string; picture?: string
        }
        const verified = p.email_verified === true || p.email_verified === "true"
        if (!["accounts.google.com", "https://accounts.google.com"].includes(p.iss ?? "") || p.aud !== process.env.GOOGLE_CLIENT_ID
            || !p.exp || p.exp * 1000 < Date.now() || !p.sub || !p.email || !verified) return null
        return { sub: p.sub, email: p.email.trim().toLowerCase(), nama: (p.name ?? "").trim(), foto: p.picture ?? "" }
    } catch (e) {
        console.error("google: ID token tidak sah", e)
        return null
    }
}

/** Salin foto profil Google ke app_user_foto (upaya terbaik: gagal tidak membatalkan pendaftaran). */
export async function simpanFotoGoogle(userId: number, url: string) {
    try {
        const u = new URL(url)
        if (u.protocol !== "https:" || !u.hostname.endsWith(".googleusercontent.com")) return
        u.pathname = u.pathname.replace(/=s\d+-c$/, "=s256-c")
        const r = await fetch(u, { signal: AbortSignal.timeout(10_000) })
        if (!r.ok) return
        const isi = new Uint8Array(await r.arrayBuffer())
        if (isi.length === 0 || isi.length > MAKS_FOTO) return
        const jenis = jenisFoto(isi)
        if (!jenis) return
        await pool.query(
            `INSERT INTO app_user_foto (app_user_id, isi, jenis, diubah_pada) VALUES ($1, $2, $3, now())
             ON CONFLICT (app_user_id) DO UPDATE SET isi = EXCLUDED.isi, jenis = EXCLUDED.jenis, diubah_pada = now()`,
            [userId, Buffer.from(isi), jenis])
    } catch (e) {
        console.error("google: foto tidak tersimpan", e)
    }
}
