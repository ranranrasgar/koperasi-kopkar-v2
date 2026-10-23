import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { detailPercakapan, tandaiDibaca } from "@kopkar/backend/src/anggota/pesan.ts"
import { FormPesan } from "@/components/FormPesan"
import { PercakapanLangsung } from "@/components/PercakapanLangsung"
import { Kepala } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { pool } from "@/lib/db"

export const metadata: Metadata = { title: "Pesan" }

// Percakapan milik anggota yang login (id orang lain → 404). Dibuka = balasan dianggap terbaca.
export default async function PercakapanPage(props: PageProps<"/pesan/[id]">) {
    const a = await wajibAnggota()
    const { id } = await props.params
    if (!/^\d{1,12}$/.test(id)) notFound()
    const p = await detailPercakapan(pool, Number(id), a.anggotaId)
    if (!p) notFound()
    await tandaiDibaca(pool, p.id, "anggota")

    return (
        <main>
            <Kepala judul={p.subjek} sub={p.status === "selesai" ? "Selesai ditangani" : undefined} kembali="/pesan" />
            <div className="px-5">
                <PercakapanLangsung id={p.id} awal={p.isi.map(({ id, pengirim, isi, dibuat_pada }) => ({ id, pengirim, isi, dibuat_pada }))} />
                <div className="mt-6 border-t border-garis pt-5">
                    <FormPesan percakapanId={p.id} />
                </div>
            </div>
        </main>
    )
}
