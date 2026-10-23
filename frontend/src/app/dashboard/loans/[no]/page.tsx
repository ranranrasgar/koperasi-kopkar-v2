import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { detailPinjaman, type BarisBayar } from "@/lib/queries/pinjaman-detail"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const Lencana = ({ teks, warna }: { teks: string; warna: "hijau" | "merah" | "biru" | "abu" | "kuning" }) => (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", {
        hijau: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
        merah: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
        biru: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
        kuning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
        abu: "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400",
    }[warna])}>{teks}</span>
)

const Isi = ({ label, children, tebal }: { label: string; children: React.ReactNode; tebal?: boolean }) => (
    <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className={cn("mt-0.5 truncate text-sm", tebal && "font-semibold")}>{children}</dd>
    </div>
)

export default async function DetailPinjamanPage(props: { params: Promise<{ no: string }>; searchParams: Promise<{ tab?: string }> }) {
    await wajibIzin("/dashboard/loans") // izin sama dengan Daftar Pinjaman; layout tidak dijalankan ulang pada navigasi antarhalaman
    const { no: mentah } = await props.params
    const no = decodeURIComponent(mentah)
    if (!/^[A-Za-z0-9._\-/ ]{3,25}$/.test(no)) notFound()
    const d = await detailPinjaman(no)
    if (!d) notFound()
    const { ringkas: r, info, jadwal, bayar } = d
    const tab = (await props.searchParams).tab === "pembayaran" ? "pembayaran" : "jadwal"

    // Aturan terlambat sama dengan Daftar Pinjaman: bulan jatuh tempo sudah berakhir (potongan gaji dibukukan akhir bulan).
    const hari = hariIni()
    const awalBulan = `${hari.slice(0, 7)}-01`
    const bayarPerKe = new Map<number, BarisBayar[]>()
    for (const b of bayar) if (b.angsuran_ke > 0) bayarPerKe.set(b.angsuran_ke, [...(bayarPerKe.get(b.angsuran_ke) ?? []), b])
    const status = (ke: number, tgl: string) => {
        if (ke <= r.jml_cicilan) return { t: "Terbayar", w: "hijau" as const }
        if (r.lunas) return { t: "Lunas", w: "abu" as const }
        const jt = tgl.slice(0, 10)
        if (jt < awalBulan) return { t: "Terlambat", w: "merah" as const }
        if (jt <= hari) return { t: "Jatuh tempo bulan ini", w: "kuning" as const }
        return { t: "Belum jatuh tempo", w: "biru" as const }
    }
    const totBayar = bayar.reduce((t, b) => ({ p: t.p + b.debit_pokok, b: t.b + b.debit_bunga }), { p: 0, b: 0 })
    let saldo = 0
    const baris = bayar.map((b) => { saldo += b.kredit_pokok - b.debit_pokok; return { ...b, saldo } })
    const tunggak = Number(r.jml_tunggakan ?? 0)
    const statusUtama = r.lunas ? <Lencana teks="Lunas" warna="abu" /> : tunggak > 0 ? <Lencana teks={`Menunggak ${tunggak} angsuran`} warna="merah" /> : <Lencana teks="Berjalan" warna="hijau" />
    const tabLink = (k: string, label: string, n: number) => (
        <Link href={`?tab=${k}`} scroll={false} aria-current={tab === k ? "page" : undefined}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
            {label} <span className="ml-1 text-xs opacity-70">{n}</span>
        </Link>
    )
    const th = "px-3 py-2 text-xs font-semibold"

    return (
        <div className="space-y-4">
            <Link href="/dashboard/loans" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" /> Daftar Pinjaman
            </Link>

            <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-semibold tracking-tight">{r.no_pinjaman}</h1>
                {statusUtama}
                {!info.aktif && <Lencana teks="Anggota non-aktif" warna="abu" />}
            </div>

            <div className="rounded-lg border bg-background p-4 shadow-sm">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                    <Isi label="Anggota" tebal>{r.nama}</Isi>
                    <Isi label="KPK / Kode">{r.nik ?? "-"} | {r.kode_agt}</Isi>
                    <Isi label="Jenis Kredit">{info.nama_kredit ?? "-"} ({r.kode_kredit ?? "-"})</Isi>
                    <Isi label="Grup">{info.group_pinjaman ?? "-"}</Isi>
                    <Isi label="Tgl Realisasi">{formatTanggal(r.tgl_pinjaman, "long")}</Isi>
                    <Isi label="Lama Angsuran">{r.lama_angsuran} bulan · terbayar {r.jml_cicilan}</Isi>
                    <Isi label="Bunga">{formatAngka(info.persen_bunga)}% / {info.bunga_per} bln</Isi>
                    <Isi label="Operator">{r.opr || "-"}</Isi>
                    <Isi label="Pinjaman" tebal>Rp {formatAngka(r.rp_pinjaman_pokok)}</Isi>
                    <Isi label="Uang Muka">Rp {formatAngka(r.uang_muka)}</Isi>
                    <Isi label="Adm / Provisi">Rp {formatAngka(r.rp_adm)} / Rp {formatAngka(r.rp_provisi)}</Isi>
                    <Isi label="Angsuran / Bulan" tebal>Rp {formatAngka(r.temp_angs_per_bulan)}</Isi>
                    <Isi label="Total Jasa">Rp {formatAngka(r.temp_total_jasa)}</Isi>
                    <Isi label="Sudah Dibayar (pokok + jasa)" tebal>Rp {formatAngka(r.total_bayar)}</Isi>
                    <Isi label="Sisa Pokok" tebal>Rp {formatAngka(r.sisa_pokok)}{r.lunas && Number(r.sisa_buku) > 100 ? " *" : ""}</Isi>
                    <Isi label="Jatuh Tempo Berikut">{r.jatuh_tempo ? formatTanggal(r.jatuh_tempo, "long") : "-"}</Isi>
                </dl>
                {r.lunas && Number(r.sisa_buku) > 100 && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        * Lunas menurut cicilan, tetapi saldo buku pinjaman masih Rp {formatAngka(r.sisa_buku)} (diselesaikan di luar angsuran koperasi: top-up atau pelunasan langsung ke bank, dibereskan lewat jurnal balik).
                    </p>
                )}
            </div>

            <div className="rounded-lg border bg-background shadow-sm overflow-clip">
                <div className="flex flex-wrap items-center gap-1 border-b p-2">
                    {tabLink("jadwal", "Jadwal Angsuran", jadwal.length)}
                    {tabLink("pembayaran", "Riwayat Pembayaran", bayar.length)}
                </div>

                {tab === "jadwal" ? (
                    jadwal.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">Pinjaman ini belum punya jadwal tagih (data pencairan belum lengkap).</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/60 text-muted-foreground">
                                    <tr>
                                        <th className={`${th} text-center w-12`}>Ke</th>
                                        <th className={`${th} text-left`}>Jatuh Tempo</th>
                                        <th className={`${th} text-right`}>Pokok</th>
                                        <th className={`${th} text-right`}>Jasa</th>
                                        <th className={`${th} text-right`}>Angsuran</th>
                                        <th className={`${th} text-left`}>Status</th>
                                        <th className={`${th} text-left`}>Tgl Bayar</th>
                                        <th className={`${th} text-right`}>Dibayar</th>
                                        <th className={`${th} text-left`}>No. Bukti</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jadwal.map((j) => {
                                        const s = status(j.angsuran_ke, j.tanggal_angsuran)
                                        const b = bayarPerKe.get(j.angsuran_ke) ?? []
                                        const dibayar = b.reduce((t, x) => t + x.debit_pokok + x.debit_bunga, 0)
                                        return (
                                            <tr key={j.angsuran_ke} className={cn("border-t", s.w === "merah" && "bg-red-500/5")}>
                                                <td className="px-3 py-2 text-center text-muted-foreground">{j.angsuran_ke}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(j.tanggal_angsuran)}</td>
                                                <td className="px-3 py-2 text-right tabular-nums">{formatAngka(j.debit_pokok)}</td>
                                                <td className="px-3 py-2 text-right tabular-nums">{formatAngka(j.debit_bunga)}</td>
                                                <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatAngka(j.debit_pokok + j.debit_bunga)}</td>
                                                <td className="px-3 py-2"><Lencana teks={s.t} warna={s.w} /></td>
                                                <td className="px-3 py-2 whitespace-nowrap">{b.length ? formatTanggal(b[b.length - 1].tanggal_angsuran) : "-"}</td>
                                                <td className="px-3 py-2 text-right tabular-nums">{b.length ? formatAngka(dibayar) : "-"}</td>
                                                <td className="px-3 py-2 font-mono text-xs">{b.map((x) => x.no_bukti).join(", ")}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot className="border-t-2 bg-muted/60 font-semibold">
                                    <tr>
                                        <td colSpan={2} className="px-3 py-2 text-right">Total jadwal</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(jadwal.reduce((t, j) => t + j.debit_pokok, 0))}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(jadwal.reduce((t, j) => t + j.debit_bunga, 0))}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(jadwal.reduce((t, j) => t + j.debit_pokok + j.debit_bunga, 0))}</td>
                                        <td colSpan={2} className="px-3 py-2 text-right">Total dibayar</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(totBayar.p + totBayar.b)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )
                ) : bayar.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">Belum ada catatan di buku pinjaman ini.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/60 text-muted-foreground">
                                <tr>
                                    <th className={`${th} text-center w-12`}>Ke</th>
                                    <th className={`${th} text-left`}>Tanggal</th>
                                    <th className={`${th} text-left`}>No. Bukti</th>
                                    <th className={`${th} text-left`}>Keterangan</th>
                                    <th className={`${th} text-right`}>Bayar Pokok</th>
                                    <th className={`${th} text-right`}>Bayar Jasa</th>
                                    <th className={`${th} text-right`}>Cair Pokok</th>
                                    <th className={`${th} text-right`}>Jasa Dibebankan</th>
                                    <th className={`${th} text-right`}>Sisa Pokok</th>
                                </tr>
                            </thead>
                            <tbody>
                                {baris.map((b) => (
                                    <tr key={b.urut} className={cn("border-t", b.angsuran_ke === 0 && "bg-muted/30 font-medium")}>
                                        <td className="px-3 py-2 text-center text-muted-foreground">{b.angsuran_ke}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(b.tanggal_angsuran)}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{b.no_bukti}</td>
                                        <td className="px-3 py-2">{b.deskripsi}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{b.debit_pokok ? formatAngka(b.debit_pokok) : ""}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{b.debit_bunga ? formatAngka(b.debit_bunga) : ""}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{b.kredit_pokok ? formatAngka(b.kredit_pokok) : ""}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{b.kredit_bunga ? formatAngka(b.kredit_bunga) : ""}</td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatAngka(b.saldo)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 bg-muted/60 font-semibold">
                                <tr>
                                    <td colSpan={4} className="px-3 py-2 text-right">Total</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(totBayar.p)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(totBayar.b)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(bayar.reduce((t, b) => t + b.kredit_pokok, 0))}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(bayar.reduce((t, b) => t + b.kredit_bunga, 0))}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(saldo)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
