import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Arus, batasBaris, Blok, Kartu, Kepala, Kosong, MuatLagi } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { mutasiSimpanan } from "@/lib/data"
import { rupiah, tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Mutasi Simpanan" }

const LANGKAH = 20

export default async function MutasiSimpananPage(props: PageProps<"/simpanan/[kode]">) {
    const a = await wajibAnggota()
    const { kode } = await props.params
    const batas = batasBaris((await props.searchParams).n, LANGKAH)
    if (!/^\d{2}$/.test(kode)) notFound()
    const m = await mutasiSimpanan(a.anggotaId, kode, batas)
    if (!m) notFound()
    const saldo = m.baris[0]?.saldo ?? 0

    return (
        <main>
            <Kepala judul={m.nama} sub="Mutasi rekening simpanan" kembali="/simpanan" />
            <div className="px-5">
                <Blok>
                    <p className="text-sm text-redup">Saldo saat ini</p>
                    <p className="angka mt-1 text-[1.75rem] font-bold leading-tight tracking-tight">{rupiah(saldo)}</p>
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-garis pt-3">
                        <div>
                            <dt className="text-xs text-redup">Total setoran</dt>
                            <dd className="angka text-[0.9375rem] font-semibold">{rupiah(m.setoran)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-redup">Total penarikan</dt>
                            <dd className="angka text-[0.9375rem] font-semibold">{rupiah(m.penarikan)}</dd>
                        </div>
                    </dl>
                    <p className="mt-3 text-xs text-redup">{m.total.toLocaleString("id-ID")} transaksi</p>
                </Blok>

                <h2 className="mb-1 mt-8 text-[0.9375rem] font-semibold">Mutasi terbaru</h2>
                {m.baris.length === 0 ? (
                    <Kartu><Kosong judul="Belum ada transaksi" /></Kartu>
                ) : (
                    <Kartu className="divide-y divide-garis">
                        {m.baris.map((r) => (
                            <div key={r.id} className="flex items-start justify-between gap-4 px-5 py-3">
                                <div className="min-w-0">
                                    <p className="text-[0.9375rem] font-medium">{r.rp_setoran > 0 ? "Setoran" : "Penarikan"}</p>
                                    <p className="truncate text-xs text-redup">{tanggal(r.tgl_transaksi)} · {r.no_bukti}</p>
                                    {r.deskripsi?.trim() && <p className="mt-0.5 line-clamp-2 text-xs text-redup">{r.deskripsi.trim()}</p>}
                                </div>
                                <div className="shrink-0 whitespace-nowrap text-right">
                                    <Arus n={r.rp_setoran > 0 ? r.rp_setoran : -r.rp_pengambilan} />
                                    <p className="angka text-xs text-redup">Saldo {rupiah(r.saldo)}</p>
                                </div>
                            </div>
                        ))}
                    </Kartu>
                )}
                <MuatLagi href={`/simpanan/${kode}?n=${batas + LANGKAH}`} sisa={m.total - m.baris.length} />
            </div>
        </main>
    )
}
