import crypto from "node:crypto"
import { promisify } from "node:util"

const scrypt = promisify(crypto.scrypt) as (password: string, salt: Buffer, keylen: number, options: crypto.ScryptOptions) => Promise<Buffer>
const OPSI = { N: 16384, r: 8, p: 1 }

// Format sama dengan migrasi PostgreSQL (jawaban keamanan): scrypt$<salt hex>$<hash hex>
export async function hashPassword(password: string) {
    const salt = crypto.randomBytes(16)
    const hash = await scrypt(password, salt, 32, OPSI)
    return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`
}

export async function cocokPassword(password: string, tersimpan: string | null) {
    const [jenis, saltHex, hashHex] = (tersimpan ?? "").split("$")
    if (jenis !== "scrypt" || !saltHex || !hashHex) return false
    const harap = Buffer.from(hashHex, "hex")
    const hasil = await scrypt(password, Buffer.from(saltHex, "hex"), harap.length, OPSI)
    return crypto.timingSafeEqual(hasil, harap)
}

/** Aturan minimal password operator. Mengembalikan pesan galat, atau null bila boleh. */
export function cekPasswordBaru(password: string) {
    if (password.length < 8) return "Password minimal 8 karakter"
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password harus berisi huruf dan angka"
    return null
}
