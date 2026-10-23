import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CircleCheck, CircleDashed } from "lucide-react"
import { Baris, Blok, Kartu, Kemajuan, Kepala, Kosong } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { rincianPinjaman } from "@/lib/data"
import { rupiah, tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Rincian Pinjaman" }

export default async function RincianPinjamanPage(props: PageProps<"/pinjaman/[jenis]/[id]">) {
    const a = await wajibAnggota()
    const { jenis, id } = await props.params
    const tab = (await props.searchParams).tab === "bayar" ? "bayar" : "jadwal"
    if ((jenis !== "tunai" && jenis !== "kpr") || !/^\d{1,12}$/.test(id)) notFound()
    // Hanya pinjaman milik anggota yang login; id pinjaman orang lain menghasilkan 404.
    const r = await rincianPinjaman(a.anggotaId, jenis, Number(id))
    if (!r) notFound()
    const { pinjaman: p, jadwal, bayar } = r
    const sisaJadwal = jadwal.filter((j) => !j.lunas)
    const berikut = sisaJadwal[0]
    const sisaJasa = sisaJadwal.reduce((t, j) => t + j.jasa, 0)
    const lunas = p.sisa <= 100 || p.jml_cicilan >= p.lama_angsuran
    const tabKelas = (aktif: boolean) =>
        `flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${aktif ? "bg-permukaan text-teks shadow-sm" : "text-redup"}`

    return (
        <main>
            <Kepala judul={p.nama_kredit ?? "Pinjaman"} sub={p.no_pinjaman} kembali="/pinjaman" />
            <div className="px-5">
                <Blok>
                    <p className="text-sm text-redup">{lunas ? "Pinjaman lunas" : "Sisa pokok"}</p>
                    <p className="angka mt-1 text-[1.75rem] font-bold leading-tight tracking-tight">{rupiah(p.sisa)}</p>
                    <div className="mt-4 flex items-center gap-3">
                        <Kemajuan ke={p.jml_cicilan} dari={p.lama_angsuran} />
                        <span className="angka shrink-0 text-xs text-redup">Cicilan {p.jml_cicilan} dari {p.lama_angsuran}</span>
                    </div>
                    <dl className="mt-3 divide-y divide-garis border-t border-garis">
                        <Baris label="Pokok pinjaman" nilai={rupiah(p.pokok)} />
                        <Baris label="Tanggal pinjaman" nilai={tanggal(p.tgl_pinjaman)} />
                        {p.persen_bunga !== null && <Baris label="Jasa" nilai={`${p.persen_bunga.toLocaleString("id-ID")}%`} />}
                        <Baris label="Sisa angsuran" nilai={lunas ? "Lunas" : `${sisaJadwal.length} kali`} />
                        {!lunas && berikut && <Baris label="Angsuran berikutnya" nilai={`${rupiah(berikut.total)} · ${tanggal(berikut.tanggal_angsuran)}`} />}
                        {!lunas && sisaJasa > 0 && <Baris label="Sisa jasa" nilai={rupiah(sisaJasa)} />}
                    </dl>
                </Blok>

                <nav aria-label="Tampilan" className="mt-6 flex gap-1 rounded-xl bg-garis/60 p-1">
                    <Link href="?tab=jadwal" replace scroll={false} className={tabKelas(tab === "jadwal")} aria-current={tab === "jadwal" ? "page" : undefined}>
                        Jadwal angsuran
                    </Link>
                    <Link href="?tab=bayar" replace scroll={false} className={tabKelas(tab === "bayar")} aria-current={tab === "bayar" ? "page" : undefined}>
                        Pembayaran
                    </Link>
                </nav>

                {tab === "jadwal" ? (
                    jadwal.length === 0 ? <Kartu className="mt-3"><Kosong judul="Jadwal belum tersedia" /></Kartu> : (
                        <Kartu className="mt-3 divide-y divide-garis">
                            {jadwal.map((j) => (
                                <div key={j.angsuran_ke} className="flex items-center gap-3 px-5 py-3">
                                    {j.lunas
                                        ? <CircleCheck size={20} strokeWidth={1.75} className="shrink-0 text-masuk" aria-label="Sudah dibayar" />
                                        : <CircleDashed size={20} strokeWidth={1.75} className="shrink-0 text-redup" aria-label="Belum dibayar" />}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[0.9375rem] font-medium">Angsuran ke-{j.angsuran_ke}</p>
                                        <p className="text-xs text-redup">
                                            {tanggal(j.tanggal_angsuran)}
                                            {j.biaya > 0 && ` · termasuk biaya ${rupiah(j.biaya)}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`angka text-[0.9375rem] font-semibold ${j.lunas ? "text-redup line-through decoration-1" : ""}`}>{rupiah(j.total)}</p>
                                        <p className="angka text-xs text-redup">Pokok {rupiah(j.pokok)}</p>
                                    </div>
                                </div>
                            ))}
                        </Kartu>
                    )
                ) : (
                    bayar.length === 0 ? <Kartu className="mt-3"><Kosong judul="Belum ada pembayaran" /></Kartu> : (
                        <Kartu className="mt-3 divide-y divide-garis">
                            {bayar.map((b) => (
                                <div key={`${b.no_bukti}-${b.angsuran_ke}`} className="flex items-start justify-between gap-4 px-5 py-3">
                                    <div className="min-w-0">
                                        <p className="text-[0.9375rem] font-medium">Angsuran ke-{b.angsuran_ke}</p>
                                        <p className="truncate text-xs text-redup">{tanggal(b.tanggal_angsuran)} · {b.no_bukti}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="angka text-[0.9375rem] font-semibold">{rupiah(b.pokok + b.jasa)}</p>
                                        <p className="angka text-xs text-redup">Pokok {rupiah(b.pokok)} · Jasa {rupiah(b.jasa)}</p>
                                    </div>
                                </div>
                            ))}
                        </Kartu>
                    )
                )}
            </div>
        </main>
    )
}
