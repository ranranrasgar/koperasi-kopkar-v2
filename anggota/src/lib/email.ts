import "server-only"
import { headers } from "next/headers"
import { antreEmail, prosesAntrean, smtpSiap } from "@kopkar/backend/src/email/antrean.ts"
import { pool } from "@/lib/db"

// Email dari aplikasi anggota (reset password, email diganti) masuk ke antrean email bersama (tabel email_antrean),
// sama seperti notifikasi, lalu langsung diproses supaya cepat sampai. Pengiriman sungguhan memakai SMTP dari env
// (SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM); tanpa itu email hanya dicatat di log server.

export interface Email { ke: string; judul: string; teks: string; tautan?: string }

export const emailSiap = smtpSiap

/** Proses antrean sekarang (tanpa menunggu pekerja 20 detik). Tidak pernah melempar galat. */
export async function kirimSekarang() {
    try {
        const h = await prosesAntrean(pool, { batas: 5 })
        return { terkirim: h.terkirim > 0 }
    } catch (e) {
        console.error("proses antrean email gagal:", (e as Error).message)
        return { terkirim: false }
    }
}

export async function kirimEmail(e: Email): Promise<{ terkirim: boolean }> {
    await antreEmail(pool, { jenis: "sistem", ke: e.ke, judul: e.judul, teks: e.teks, tautan: e.tautan ?? null })
    return kirimSekarang()
}

/**
 * Alamat dasar aplikasi untuk tautan di email. ANGGOTA_URL (mis. https://anggota.kopkarmjsmattel.com) dipakai bila ada;
 * selain itu dari header permintaan (di belakang Nginx: X-Forwarded-Proto/Host).
 */
export async function alamatAplikasi() {
    if (process.env.ANGGOTA_URL) return process.env.ANGGOTA_URL.replace(/\/+$/, "")
    const h = await headers()
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3200"
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
    return `${proto}://${host}`
}
