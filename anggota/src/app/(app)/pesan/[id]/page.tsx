import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { detailPercakapan, tandaiDibaca } from "@kopkar/backend/src/anggota/pesan.ts"
import { FormPesan } from "@/components/FormPesan"
import { Kepala } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { pool } from "@/lib/db"
import { tanggal } from "@/lib/format"

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
                <ol className="space-y-3">
                    {p.isi.map((m) => {
                        const saya = m.pengirim === "anggota"
                        return (
                            <li key={m.id} className={`flex ${saya ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${saya ? "rounded-br-md bg-utama text-pada-utama" : "rounded-bl-md border border-garis bg-permukaan"}`}>
                                    {!saya && <p className="mb-0.5 text-xs font-semibold text-utama">Koperasi</p>}
                                    <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed">{m.isi}</p>
                                    <p className={`mt-1 text-[11px] ${saya ? "text-pada-utama/75" : "text-redup"}`}>{tanggal(m.dibuat_pada)} · {m.dibuat_pada.slice(11, 16)}</p>
                                </div>
                            </li>
                        )
                    })}
                </ol>
                <div className="mt-6 border-t border-garis pt-5">
                    <FormPesan percakapanId={p.id} />
                </div>
            </div>
        </main>
    )
}
