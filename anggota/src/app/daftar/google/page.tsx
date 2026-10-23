import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { HalamanAuth } from "@/components/HalamanAuth"
import { anggotaSesi } from "@/lib/anggota"
import { COOKIE_GOOGLE_DAFTAR } from "@/lib/google"
import { bacaToken } from "@/lib/sesi"
import { FormDaftarGoogle } from "./FormDaftarGoogle"

export const metadata: Metadata = { title: "Lengkapi Pendaftaran" }

export default async function DaftarGooglePage() {
    if (await anggotaSesi()) redirect("/beranda")
    const g = bacaToken("google-daftar", (await cookies()).get(COOKIE_GOOGLE_DAFTAR)?.value)
    if (!g) redirect("/masuk?galat=google")
    // Username awal dari bagian depan email; boleh diubah.
    const usulan = g.email.split("@")[0].replace(/[^A-Za-z0-9._-]/g, "").slice(0, 50)
    return (
        <HalamanAuth judul="Lengkapi pendaftaran" kembali="/masuk"
            sub="Akun Google Anda sudah terverifikasi. Isi NIK karyawan dan buat password untuk masuk tanpa Google."
            kaki={<>Sudah punya akun? <Link href="/masuk" className="font-semibold text-utama">Masuk</Link></>}>
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-garis bg-permukaan p-3">
                {g.foto
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={g.foto} alt="" referrerPolicy="no-referrer" className="size-12 shrink-0 rounded-full object-cover" />
                    : <span className="grid size-12 shrink-0 place-items-center rounded-full bg-utama/10 text-lg font-semibold text-utama">{(g.nama || g.email)[0]?.toUpperCase()}</span>}
                <div className="min-w-0 leading-tight">
                    <p className="truncate font-semibold">{g.nama || g.email}</p>
                    <p className="truncate text-sm text-redup">{g.email}</p>
                </div>
            </div>
            <FormDaftarGoogle usulanUsername={usulan} />
        </HalamanAuth>
    )
}
