import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Kartu, Kepala } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { detailNotifikasi } from "@/lib/data"
import { tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Notifikasi" }

// Tujuan saat notifikasi push diketuk: isi lengkap pesan. Hanya milik anggota yang login (id lain → 404).
export default async function DetailNotifikasiPage(props: PageProps<"/notifikasi/[id]">) {
    const a = await wajibAnggota()
    const { id } = await props.params
    if (!/^\d{1,12}$/.test(id)) notFound()
    const n = await detailNotifikasi(a.anggotaId, Number(id))
    if (!n) notFound()
    return (
        <main>
            <Kepala judul="Notifikasi" kembali="/notifikasi" />
            <div className="px-5">
                <Kartu className="p-5">
                    <h2 className="text-lg font-bold leading-snug tracking-tight">{n.title || "Pemberitahuan"}</h2>
                    <time dateTime={n.datetimes} className="mt-1 block text-xs text-redup">{tanggal(n.datetimes)} · {n.datetimes.slice(11, 16)}</time>
                    {n.pesan && <p className="mt-4 whitespace-pre-line text-[0.9375rem] leading-relaxed">{n.pesan}</p>}
                </Kartu>
            </div>
        </main>
    )
}
