import type { Metadata } from "next"
import { FormPesan } from "@/components/FormPesan"
import { Kepala } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"

export const metadata: Metadata = { title: "Pesan baru" }

export default async function PesanBaruPage() {
    await wajibAnggota()
    return (
        <main>
            <Kepala judul="Pesan baru" sub="Dibaca pengurus koperasi" kembali="/pesan" />
            <div className="px-5">
                <FormPesan />
                <p className="mt-4 text-xs leading-relaxed text-redup">Jangan menulis password atau nomor PIN di pesan. Pengurus tidak pernah memintanya.</p>
            </div>
        </main>
    )
}
