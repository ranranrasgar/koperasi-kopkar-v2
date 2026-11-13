import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { keluarAction } from "@/app/actions/auth"
import { FormGantiPassword } from "@/app/(app)/akun/password/FormGantiPassword"
import { HalamanAuth } from "@/components/HalamanAuth"
import { wajibMasuk } from "@/lib/anggota"

export const metadata: Metadata = { title: "Ganti Password" }

/** Wajib setelah masuk dengan password sementara dari pengurus (User Mobile di admin). */
export default async function GantiPasswordSementaraPage() {
    const a = await wajibMasuk({ bolehTanpaEmail: true, bolehPasswordSementara: true })
    if (!a.wajibGantiPassword) redirect("/beranda")
    return (
        <HalamanAuth judul="Ganti password" sub={`Halo ${a.nama}. Anda masuk dengan password sementara dari pengurus koperasi. Buat password baru Anda sendiri sebelum melanjutkan.`}
            kaki={<form action={keluarAction}><button className="font-semibold text-utama">Keluar</button></form>}>
            <FormGantiPassword sementara />
        </HalamanAuth>
    )
}
