import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CircleCheck, CircleDashed, Hourglass, Landmark } from "lucide-react"
import { HeroPinjaman } from "@/components/HeroPinjaman"
import { Kartu, Kemajuan, Kepala, Kosong } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { rincianPinjaman } from "@/lib/data"
import { rupiah, tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Rincian Pinjaman" }

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const bulanTahun = (t: string | null | undefined) => (t ? `${BULAN[Number(t.slice(5, 7)) - 1]} ${t.slice(0, 4)}` : "-")
const persen = (n: number | null) => (n === null ? "-" : `${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 3 })}%`)

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
    const lunas = p.sisa <= 100 || p.jml_cicilan >= p.lama_angsuran
    const persenSelesai = p.lama_angsuran > 0 ? Math.min(100, Math.round((Math.min(p.jml_cicilan, p.lama_angsuran) / p.lama_angsuran) * 100)) : 0
    const sisaTenor = Math.max(0, p.lama_angsuran - p.jml_cicilan)
    const targetLunas = jadwal.at(-1)?.tanggal_angsuran
    const tabKelas = (aktif: boolean) =>
        `flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${aktif ? "bg-permukaan text-teks shadow-sm" : "text-redup"}`

    return (
        <main>
            <Kepala judul="Detail pinjaman" kembali="/pinjaman" />
            <div className="px-5">
                <section className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${lunas ? "bg-garis text-redup" : "bg-masuk/15 text-masuk"}`}>
                                <span className={`size-1.5 rounded-full ${lunas ? "bg-redup" : "bg-masuk"}`} />{lunas ? "Lunas" : "Aktif"}
                            </span>
                            <h2 className="mt-2.5 text-[1.375rem] font-bold leading-tight tracking-tight">{p.nama_kredit ?? "Pinjaman"}</h2>
                            <p className="mt-1 text-xs text-redup">{p.no_pinjaman} · Akad {tanggal(p.tgl_pinjaman, true)}</p>
                        </div>
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-utama-lembut text-utama"><Landmark size={20} strokeWidth={1.75} /></span>
                    </div>
                    <div className="mt-4 rounded-2xl bg-utama-lembut p-3.5">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="font-medium">{Math.min(p.jml_cicilan, p.lama_angsuran)} dari {p.lama_angsuran} angsuran selesai</span>
                            <span className="angka font-bold">{persenSelesai}%</span>
                        </div>
                        <div className="mt-2"><Kemajuan ke={Math.min(p.jml_cicilan, p.lama_angsuran)} dari={p.lama_angsuran} /></div>
                        <div className="mt-2.5 flex items-center justify-between gap-3 text-[0.6875rem] text-redup">
                            <span className="flex items-center gap-1"><Hourglass size={12} />{lunas ? "Semua angsuran selesai" : `Sisa tenor: ${sisaTenor} bulan lagi`}</span>
                            <span>Target lunas: <span className="font-semibold text-teks">{bulanTahun(targetLunas)}</span></span>
                        </div>
                    </div>
                </section>

                <div className="mt-4">
                    <HeroPinjaman lunas={lunas} sisa={rupiah(p.sisa)} pokok={rupiah(p.pokok)} jasa={`${persen(p.persen_bunga)}${p.persen_bunga !== null ? " / bln" : ""}`}
                        angsuran={!lunas && berikut ? rupiah(berikut.total) : null} />
                </div>

                <nav aria-label="Tampilan" className="mt-8 flex gap-1 rounded-xl bg-garis/60 p-1">
                    <Link href="?tab=jadwal" replace scroll={false} className={tabKelas(tab === "jadwal")} aria-current={tab === "jadwal" ? "page" : undefined}>
                        Jadwal angsuran
                    </Link>
                    <Link href="?tab=bayar" replace scroll={false} className={tabKelas(tab === "bayar")} aria-current={tab === "bayar" ? "page" : undefined}>
                        Riwayat pembayaran
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
                                <div key={`${b.no_bukti}-${b.angsuran_ke}`} className="flex items-center gap-3 px-5 py-3">
                                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-masuk/15 text-sm font-bold text-masuk">{b.angsuran_ke}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[0.9375rem] font-medium">Angsuran bulan ke-{b.angsuran_ke}</p>
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
