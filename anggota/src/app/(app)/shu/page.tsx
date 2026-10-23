import type { Metadata } from "next"
import Link from "next/link"
import { Info } from "lucide-react"
import { Baris, Kartu, Kepala, Kosong } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { shu, tahunShu } from "@/lib/data"
import { rupiah } from "@/lib/format"

export const metadata: Metadata = { title: "SHU" }

export default async function ShuPage(props: PageProps<"/shu">) {
    const a = await wajibAnggota()
    const daftarTahun = await tahunShu()
    const diminta = String((await props.searchParams).tahun ?? "")
    const tahun = daftarTahun.includes(diminta) ? diminta : daftarTahun[0]

    if (!tahun) {
        return <main><Kepala judul="Sisa Hasil Usaha" kembali="/beranda" /><div className="px-5"><Kartu><Kosong judul="Belum ada data SHU" /></Kartu></div></main>
    }
    const s = await shu(a.anggotaId, tahun)
    const komponen: [string, number][] = [
        ["Jasa simpanan sukarela", s.temp_sukarela], ["Jasa uang (pinjaman)", s.temp_uang],
        ["Jasa barang", s.temp_barang], ["Lama keanggotaan", s.temp_lama],
    ]

    return (
        <main>
            <Kepala judul="Sisa Hasil Usaha" kembali="/beranda" />
            <div className="px-5">
                {daftarTahun.length > 1 && (
                    <nav aria-label="Tahun buku" className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5">
                        {daftarTahun.map((t) => (
                            <Link key={t} href={`/shu?tahun=${t}`} replace aria-current={t === tahun ? "page" : undefined}
                                className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium leading-9
                                    ${t === tahun ? "border-utama bg-utama text-pada-utama" : "border-garis bg-permukaan"}`}>
                                {t}
                            </Link>
                        ))}
                    </nav>
                )}

                <Kartu className="p-5">
                    <p className="text-sm text-redup">SHU tahun buku {tahun}</p>
                    <p className="angka mt-1 text-[1.75rem] font-bold leading-tight tracking-tight">{rupiah(s.diterima)}</p>
                    {s.no_reff && <p className="mt-1 text-xs text-redup">No. referensi {s.no_reff}</p>}
                    {!s.adaData && <p className="mt-2 text-sm text-redup">Anda tidak tercatat dalam pembagian SHU tahun ini.</p>}
                </Kartu>

                {s.total_shu > 0 && (
                    <>
                        <h2 className="mb-2.5 mt-7 px-1 text-[0.9375rem] font-semibold">Komponen</h2>
                        <Kartu className="px-4">
                            <dl className="divide-y divide-garis">
                                {komponen.map(([l, n]) => <Baris key={l} label={l} nilai={rupiah(n)} />)}
                            </dl>
                        </Kartu>
                    </>
                )}

                <div className="mt-6 flex gap-3 rounded-2xl bg-utama-lembut p-4 text-sm leading-relaxed">
                    <Info size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-utama" />
                    <p>SHU dibagikan setelah Rapat Anggota Tahunan (RAT) dan dikreditkan ke simpanan sukarela Anda.</p>
                </div>
            </div>
        </main>
    )
}
