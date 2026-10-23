import type { Metadata } from "next"
import { batasBaris, Kartu, Kepala, Kosong, MuatLagi } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { notifikasi } from "@/lib/data"
import { tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Notifikasi" }

const LANGKAH = 20

export default async function NotifikasiPage(props: PageProps<"/notifikasi">) {
    const a = await wajibAnggota()
    const batas = batasBaris((await props.searchParams).n, LANGKAH)
    const semua = await notifikasi(a.anggotaId, batas + 1)
    const baris = semua.slice(0, batas)

    return (
        <main>
            <Kepala judul="Notifikasi" kembali="/beranda" />
            <div className="px-5">
                {baris.length === 0 ? <Kartu><Kosong judul="Belum ada notifikasi" isi="Pemberitahuan dari koperasi akan tampil di sini." /></Kartu> : (
                    <Kartu className="divide-y divide-garis">
                        {baris.map((n, i) => (
                            <article key={`${n.datetimes}-${i}`} className="px-4 py-3.5">
                                <div className="flex items-baseline justify-between gap-3">
                                    <h2 className="text-[0.9375rem] font-semibold">{n.title || "Pemberitahuan"}</h2>
                                    <time dateTime={n.datetimes} className="shrink-0 text-xs text-redup">{tanggal(n.datetimes)}</time>
                                </div>
                                {n.pesan && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-redup">{n.pesan}</p>}
                            </article>
                        ))}
                    </Kartu>
                )}
                <MuatLagi href={`/notifikasi?n=${batas + LANGKAH}`} sisa={semua.length - baris.length} />
            </div>
        </main>
    )
}
