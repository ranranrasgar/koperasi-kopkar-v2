import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Kartu, Kemajuan, Kepala, Kosong } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { pinjamanAktif, type PinjamanAktif } from "@/lib/data"
import { rupiah, tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Pinjaman" }

function KartuPinjaman({ p }: { p: PinjamanAktif }) {
    return (
        <Link href={`/pinjaman/${p.jenis}/${p.id}`} className="block px-4 py-4 transition-colors hover:bg-latar/70">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.nama_kredit ?? "Pinjaman"}</p>
                    <p className="truncate text-xs text-redup">{p.no_pinjaman} · {tanggal(p.tgl_pinjaman)}</p>
                </div>
                <ChevronRight size={18} className="mt-0.5 shrink-0 text-redup" />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3">
                <div>
                    <dt className="text-xs text-redup">Sisa pokok</dt>
                    <dd className="angka text-lg font-bold">{rupiah(p.sisa)}</dd>
                </div>
                <div>
                    <dt className="text-xs text-redup">Angsuran berikutnya</dt>
                    <dd className="angka text-lg font-bold">{p.angsuran !== null ? rupiah(p.angsuran) : "-"}</dd>
                    {p.jatuh_tempo && <dd className="text-xs text-redup">{tanggal(p.jatuh_tempo)}</dd>}
                </div>
            </dl>
            <div className="mt-3 flex items-center gap-3">
                <Kemajuan ke={p.jml_cicilan} dari={p.lama_angsuran} />
                <span className="angka shrink-0 text-xs text-redup">{p.jml_cicilan}/{p.lama_angsuran}</span>
            </div>
        </Link>
    )
}

export default async function PinjamanPage() {
    const a = await wajibAnggota()
    const daftar = await pinjamanAktif(a.anggotaId)
    const tunai = daftar.filter((p) => p.jenis === "tunai"), kpr = daftar.filter((p) => p.jenis === "kpr")
    const sisaTunai = tunai.reduce((t, p) => t + p.sisa, 0), sisaKpr = kpr.reduce((t, p) => t + p.sisa, 0)

    return (
        <main>
            <Kepala judul="Pinjaman" />
            <div className="px-5">
                {/* KPR ditampilkan terpisah dari pinjaman tunai (keputusan K3), hanya bila ada. */}
                <Kartu className={`grid divide-x divide-garis ${kpr.length ? "grid-cols-2" : "grid-cols-1"}`}>
                    <div className="p-4">
                        <p className="text-xs text-redup">Sisa pinjaman tunai</p>
                        <p className="angka mt-1 text-lg font-bold">{rupiah(sisaTunai)}</p>
                    </div>
                    {kpr.length > 0 && (
                        <div className="p-4">
                            <p className="text-xs text-redup">Sisa KPR</p>
                            <p className="angka mt-1 text-lg font-bold">{rupiah(sisaKpr)}</p>
                        </div>
                    )}
                </Kartu>

                {daftar.length === 0 && (
                    <Kartu className="mt-7"><Kosong judul="Tidak ada pinjaman berjalan" isi="Pinjaman yang sudah lunas tidak ditampilkan." /></Kartu>
                )}
                {tunai.length > 0 && (
                    <>
                        <h2 className="mb-2.5 mt-7 px-1 text-[0.9375rem] font-semibold">Pinjaman tunai</h2>
                        <Kartu className="divide-y divide-garis overflow-hidden">{tunai.map((p) => <KartuPinjaman key={p.id} p={p} />)}</Kartu>
                    </>
                )}
                {kpr.length > 0 && (
                    <>
                        <h2 className="mb-2.5 mt-7 px-1 text-[0.9375rem] font-semibold">KPR</h2>
                        <Kartu className="divide-y divide-garis overflow-hidden">{kpr.map((p) => <KartuPinjaman key={p.id} p={p} />)}</Kartu>
                    </>
                )}
            </div>
        </main>
    )
}
