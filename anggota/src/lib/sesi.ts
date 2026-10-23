import crypto from "node:crypto"

// Sesi anggota: cookie bertanda tangan HMAC-SHA256, tanpa tabel sesi. Dipakai juga oleh proxy.ts,
// jadi modul ini tidak boleh mengimpor database. Rahasia dan nama cookie terpisah dari sesi operator admin.

export const COOKIE_SESI = process.env.KOPKAR_SERVER_UJI ? "kopkar_anggota_uji" : "kopkar_anggota"
/** 30 hari, sama dengan token aplikasi lama (Auth.php). */
export const LAMA_SESI_DETIK = 30 * 24 * 60 * 60

export interface Sesi {
    u: number       // app_user.id
    pv: string      // sidik password_hash saat login; ganti password membatalkan sesi di perangkat lain
    exp: number     // detik epoch
}

function kunci() {
    const s = process.env.ANGGOTA_SESSION_SECRET
    if (!s || s.length < 32) throw new Error("ANGGOTA_SESSION_SECRET belum diset (minimal 32 karakter)")
    return s
}

const tanda = (data: string) => crypto.createHmac("sha256", kunci()).update(data).digest("base64url")

/** Sidik pendek password_hash untuk disimpan di sesi (bukan hash-nya sendiri). */
export const sidikPassword = (passwordHash: string) =>
    crypto.createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16)

export function buatSesi(s: Omit<Sesi, "exp">) {
    const data = Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + LAMA_SESI_DETIK })).toString("base64url")
    return `${data}.${tanda(data)}`
}

/** Sesi yang tandanya sah dan belum kedaluwarsa, atau null. */
export function bacaSesi(nilai: string | undefined): Sesi | null {
    if (!nilai) return null
    const [data, sig] = nilai.split(".")
    if (!data || !sig) return null
    const harap = Buffer.from(tanda(data)), dapat = Buffer.from(sig)
    if (harap.length !== dapat.length || !crypto.timingSafeEqual(harap, dapat)) return null
    try {
        const s = JSON.parse(Buffer.from(data, "base64url").toString()) as Sesi
        if (typeof s.u !== "number" || typeof s.pv !== "string" || typeof s.exp !== "number") return null
        return s.exp > Math.floor(Date.now() / 1000) ? s : null
    } catch {
        return null
    }
}

// Token tautan reset password (lupa password lewat email): 30 menit, sama dengan server lama. Ditandatangani dengan
// awalan berbeda supaya tidak bisa dipakai sebagai cookie sesi. Memuat sidik password, jadi otomatis tidak berlaku
// lagi setelah password diganti (sekali pakai).
const LAMA_RESET_DETIK = 30 * 60
const tandaReset = (data: string) => tanda(`reset:${data}`)

export function buatTokenReset(u: number, passwordHash: string) {
    const data = Buffer.from(JSON.stringify({ u, pv: sidikPassword(passwordHash), exp: Math.floor(Date.now() / 1000) + LAMA_RESET_DETIK }))
        .toString("base64url")
    return `${data}.${tandaReset(data)}`
}

export function bacaTokenReset(nilai: string | undefined): Sesi | null {
    const [data, sig] = (nilai ?? "").split(".")
    if (!data || !sig) return null
    const harap = Buffer.from(tandaReset(data)), dapat = Buffer.from(sig)
    if (harap.length !== dapat.length || !crypto.timingSafeEqual(harap, dapat)) return null
    try {
        const s = JSON.parse(Buffer.from(data, "base64url").toString()) as Sesi
        if (typeof s.u !== "number" || typeof s.pv !== "string" || typeof s.exp !== "number") return null
        return s.exp > Math.floor(Date.now() / 1000) ? s : null
    } catch {
        return null
    }
}
