import "server-only"
import { headers } from "next/headers"

// Pengiriman email (reset password, notifikasi email diganti). Akun SMTP koperasi belum ada (keputusan K9), jadi
// untuk sementara email TIDAK dikirim: isinya ditulis ke log server supaya alur bisa diuji. Setelah akun siap:
// pasang pustaka SMTP (mis. nodemailer), isi SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM di anggota/.env.local,
// lalu ganti bagian "belum dikirim" di bawah. Kredensial hanya di env server, tidak di kode.

export interface Email { ke: string; judul: string; teks: string }

export const emailSiap = () => false

export async function kirimEmail(e: Email): Promise<{ terkirim: boolean }> {
    if (!emailSiap()) {
        console.info(`[email belum dikirim: SMTP belum diatur] ke=${e.ke} judul="${e.judul}"\n${e.teks}`)
        return { terkirim: false }
    }
    throw new Error("Pengiriman SMTP belum dipasang")
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
