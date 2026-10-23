import type { Metadata } from "next"
import { AktifkanNotifikasi } from "@/components/AktifkanNotifikasi"
import Link from "next/link"
import { batasBaris, Kartu, Kepala, Kosong, MuatLagi } from "@/components/ui"
import { kunciPublikPush } from "@kopkar/backend/src/anggota/push.ts"
import { wajibAnggota } from "@/lib/anggota"
import { daftarNotifikasi } from "@/lib/data"
import { tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Notifikasi" }

const LANGKAH = 20

export default async function NotifikasiPage(props: PageProps<"/notifikasi">) {
    const a = await wajibAnggota()
    const batas = batasBaris((await props.searchParams).n, LANGKAH)
    const semua = await daftarNotifikasi(a.anggotaId, batas + 1)
    const baris = semua.slice(0, batas)

    return (
        <main>
            <Kepala judul="Notifikasi" kembali="/beranda" />
            <div className="px-5">
                <AktifkanNotifikasi kunciPublik={kunciPublikPush()} percobaan={process.env.NODE_ENV !== "production"} />
                {baris.length === 0 ? <Kartu><Kosong judul="Belum ada notifikasi" isi="Pemberitahuan dari koperasi akan tampil di sini." /></Kartu> : (
                    <Kartu className="divide-y divide-garis">
                        {baris.map((n) => (
                            <Link key={n.id} href={`/notifikasi/${n.id}`} className="block px-5 py-3.5 transition-colors active:bg-garis/40">
                                <div className="flex items-baseline justify-between gap-3">
                                    <h2 className="text-[0.9375rem] font-semibold">{n.title || "Pemberitahuan"}</h2>
                                    <time dateTime={n.datetimes} className="shrink-0 text-xs text-redup">{tanggal(n.datetimes)}</time>
                                </div>
                                {n.pesan && <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm leading-relaxed text-redup">{n.pesan}</p>}
                            </Link>
                        ))}
                    </Kartu>
                )}
                <MuatLagi href={`/notifikasi?n=${batas + LANGKAH}`} sisa={semua.length - baris.length} />
            </div>
        </main>
    )
}
