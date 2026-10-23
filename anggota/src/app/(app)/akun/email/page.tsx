import type { Metadata } from "next"
import { FormEmail } from "@/components/FormEmail"
import { Kepala } from "@/components/ui"
import { wajibMasuk } from "@/lib/anggota"

export const metadata: Metadata = { title: "Email" }

export default async function EmailPage() {
    const a = await wajibMasuk()
    return (
        <main>
            <Kepala judul="Email" sub="Satu email hanya untuk satu akun" kembali="/akun" />
            <div className="px-5"><FormEmail awal={a.email} /></div>
        </main>
    )
}
