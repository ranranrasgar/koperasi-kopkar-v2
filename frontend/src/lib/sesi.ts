import crypto from "node:crypto"

// Sesi operator: cookie bertanda tangan HMAC-SHA256, tanpa tabel sesi. Dipakai juga oleh proxy.ts,
// jadi modul ini tidak boleh mengimpor database.

export const COOKIE_SESI = "kopkar_sesi"
export const LAMA_SESI_DETIK = 12 * 60 * 60

export interface Sesi {
    id: number      // opr.id
    nama: string    // opr.nama, dipakai sebagai kolom opr di transaksi
    pv: string      // sidik password_hash saat login; ganti password membatalkan sesi lama
    exp: number     // detik epoch
}

function kunci() {
    const s = process.env.SESSION_SECRET
    if (!s || s.length < 32) throw new Error("SESSION_SECRET belum diset (minimal 32 karakter)")
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
        if (typeof s.id !== "number" || typeof s.nama !== "string" || typeof s.exp !== "number") return null
        return s.exp > Math.floor(Date.now() / 1000) ? s : null
    } catch {
        return null
    }
}
