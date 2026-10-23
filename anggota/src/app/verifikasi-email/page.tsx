import type { Metadata } from "next"
import Link from "next/link"
import { statusEmail } from "@kopkar/backend/src/anggota/verifikasi-email.ts"
import { FormVerifikasi } from "@/components/FormVerifikasi"
import { HalamanAuth } from "@/components/HalamanAuth"
import { pool } from "@/lib/db"
import { bacaTokenVerifikasi } from "@/lib/sesi"

export const metadata: Metadata = { title: "Verifikasi Email" }

const samarkan = (e: string) => {
    const [nama, domain] = e.split("@")
    return `${nama.slice(0, 2)}${"•".repeat(Math.max(2, nama.length - 2))}@${domain}`
}

// Halaman terbuka (tanpa sesi) karena akun pendaftaran belum aktif; dilindungi token bertanda tangan (60 menit) dari
// pendaftaran atau percobaan masuk, lalu kode 6 angka dari email.
export default async function VerifikasiEmailPage(props: PageProps<"/verifikasi-email">) {
    const q = await props.searchParams
    const token = String(Array.isArray(q.u) ? q.u[0] : q.u ?? "")
    const lanjutMentah = String(Array.isArray(q.lanjut) ? q.lanjut[0] : q.lanjut ?? "")
    const lanjut = lanjutMentah.startsWith("/") && !lanjutMentah.startsWith("//") ? lanjutMentah : undefined
    const t = bacaTokenVerifikasi(token)
    const st = t ? await statusEmail(pool, t.u) : null

    if (!t || !st || !st.email) {
        return (
            <HalamanAuth judul="Tautan tidak berlaku" kembali="/masuk" sub="Tautan verifikasi sudah kedaluwarsa. Masuk dengan akun Anda untuk meminta kode baru, atau daftar lagi.">
                <Link href="/masuk" className="inline-flex h-12 items-center rounded-xl bg-utama px-6 font-semibold text-pada-utama">Ke halaman masuk</Link>
            </HalamanAuth>
        )
    }
    if (st.terverifikasi) {
        return (
            <HalamanAuth judul="Email sudah terverifikasi" sub={`${samarkan(st.email)} sudah terverifikasi.`}>
                <Link href={lanjut ?? "/masuk"} className="inline-flex h-12 items-center rounded-xl bg-utama px-6 font-semibold text-pada-utama">{lanjut ? "Lanjut" : "Masuk"}</Link>
            </HalamanAuth>
        )
    }
    return (
        <HalamanAuth judul="Verifikasi email" kembali={lanjut ? undefined : "/masuk"}
            sub={st.menungguAktivasi ? "Satu langkah lagi: masukkan kode yang kami kirim ke email Anda untuk mengaktifkan akun." : "Masukkan kode yang kami kirim ke email Anda untuk memastikan email ini milik Anda."}>
            <FormVerifikasi token={token} emailSamar={samarkan(st.email)} lanjut={lanjut} />
        </HalamanAuth>
    )
}
