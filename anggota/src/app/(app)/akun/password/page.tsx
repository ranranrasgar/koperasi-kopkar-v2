import type { Metadata } from "next"
import { Kepala } from "@/components/ui"
import { wajibMasuk } from "@/lib/anggota"
import { FormGantiPassword } from "./FormGantiPassword"

export const metadata: Metadata = { title: "Ganti Password" }

export default async function GantiPasswordPage() {
    await wajibMasuk()
    return (
        <main>
            <Kepala judul="Ganti password" sub="Perangkat lain yang masuk dengan akun ini akan keluar" kembali="/akun" />
            <div className="px-5"><FormGantiPassword /></div>
        </main>
    )
}
