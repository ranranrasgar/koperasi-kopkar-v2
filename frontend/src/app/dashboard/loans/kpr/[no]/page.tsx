import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { TombolBatalBukti } from "@/components/transaksi/BatalBukti"
import { TombolKirimInfo } from "@/components/transaksi/TombolKirimInfo"
import { TombolKwitansi } from "@/components/transaksi/TombolKwitansi"
import { TombolEkspor } from "@/components/laporan/TombolEkspor"
import { TombolCetak } from "@/components/ui/TombolCetak"
import { bolehAksi, MENU } from "@/config/akses"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { detailKpr } from "@/lib/queries/kpr"
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

/** Detail satu KPR, tampilannya sama dengan detail pinjaman: ringkasan, lalu tab Jadwal Angsuran dan Riwayat Pembayaran. */
export default async function DetailKprPage(props: { params: Promise<{ no: string }>; searchParams: Promise<{ tab?: string }> }) {
    const o = await wajibIzin("/dashboard/loans/kpr/[no]") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const no = decodeURIComponent((await props.params).no)
    if (!/^[A-Za-z0-9._\-/ ]{3,25}$/.test(no)) notFound()
    const d = await detailKpr(no)
    if (!d) notFound()
    const { ringkas: r, rincian, jadwal } = d
    const lunas = r.sisa <= 0
    const bolehBatal = bolehAksi(o.izin, o.aksiTolak, [MENU.batalTransaksi], "hapus")
    const bolehBayar = bolehAksi(o.izin, o.aksiTolak, [MENU.angsurKpr], "tambah")
    const bolehDaftar = o.izin.includes(MENU.lapPinjamanKpr)
    const tab = (await props.searchParams).tab === "pembayaran" ? "pembayaran" : "jadwal"

    // Aturan terlambat sama dengan detail pinjaman tunai: bulan jatuh tempo sudah berakhir (potongan gaji dibukukan akhir bulan).
    const hari = hariIni(), awalBulan = `${hari.slice(0, 7)}-01`
    const bayarPerKe = new Map<number, typeof rincian>()
    for (const b of rincian) if (b.angsuran_ke > 0) bayarPerKe.set(b.angsuran_ke, [...(bayarPerKe.get(b.angsuran_ke) ?? []), b])
    const status = (ke: number, tgl: string) => {
        if (ke <= r.jml_cicilan) return { t: "Terbayar", w: "hijau" as const }
        if (lunas) return { t: "Lunas", w: "abu" as const }
        if (tgl < awalBulan) return { t: "Terlambat", w: "merah" as const }
        if (tgl <= hari) return { t: "Jatuh tempo bulan ini", w: "kuning" as const }
        return { t: "Belum jatuh tempo", w: "biru" as const }
    }
    const tunggak = jadwal.filter((j) => status(j.ke, j.tanggal).t === "Terlambat").length
    const berikut = lunas ? undefined : jadwal.find((j) => j.ke > r.jml_cicilan)
    const totBayar = rincian.reduce((t, b) => ({ p: t.p + b.debit_pokok, b: t.b + b.debit_bunga }), { p: 0, b: 0 })
    const totCair = rincian.reduce((t, b) => ({ p: t.p + b.kredit_pokok, b: t.b + b.kredit_bunga }), { p: 0, b: 0 })
    let saldo = 0
    const baris = rincian.map((b) => { saldo += b.kredit_pokok - b.debit_pokok; return { ...b, saldo } })
    const teksStatus = lunas ? "Lunas" : tunggak > 0 ? `Menunggak ${tunggak} angsuran` : "Berjalan"
    const statusUtama = <Lencana teks={teksStatus} warna={lunas ? "abu" : tunggak > 0 ? "merah" : "hijau"} />
    const tabLink = (k: string, label: string, n: number) => (
        <Link href={`?tab=${k}`} scroll={false} aria-current={tab === k ? "page" : undefined}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
            {label} <span className="ml-1 text-xs opacity-70">{n}</span>
        </Link>
    )
    const th = "px-3 py-2 text-xs font-semibold"
    const rp = (v: number | string) => `Rp ${formatAngka(Number(v))}`
    const judulCetak = `Detail KPR ${r.no_pinjaman}`, subjudulCetak = `${r.nama} (${r.nik ?? "-"} | ${r.kode_agt})`
    const totJadwal = jadwal.reduce((t, j) => ({ p: t.p + Number(j.pokok), a: t.a + Number(j.total) }), { p: 0, a: 0 })
    // Cetak dan Ekspor memuat ringkasan, seluruh jadwal, dan seluruh riwayat, tidak tergantung tab yang terbuka.
    const bagian = [
        { judul: "Ringkasan", polos: true, baris: [["Keterangan", "Nilai"], ["Status", teksStatus], ["Jenis Kredit", `${r.nama_kredit ?? "-"} (${r.kode_kredit ?? "-"})`], ["Grup", "KPR"],
            ["Tgl Realisasi", formatTanggal(r.tgl_pinjaman, "long")], ["Lama Angsuran", `${r.lama_angsuran} bulan, terbayar ${r.jml_cicilan}`], ["Pinjaman", rp(r.rp_pinjaman_pokok)],
            ["Angsuran / Bulan", rp(r.rp_angsuran_per_bulan)], ["Total Jasa", rp(r.jasa)], ["Sudah Dibayar", rp(totBayar.p + totBayar.b)], ["Sisa Pokok", rp(r.sisa)],
            ["Jatuh Tempo Berikut", berikut ? formatTanggal(berikut.tanggal, "long") : "-"]] },
        { judul: "Jadwal Angsuran", baris: [["Ke", "Jatuh Tempo", "Pokok", "Jasa", "Angsuran", "Status", "Tgl Bayar", "Dibayar", "No. Bukti"],
            ...jadwal.map((j) => {
                const b = bayarPerKe.get(j.ke) ?? []
                return [String(j.ke), j.tanggal, j.pokok, j.jasa, j.total, status(j.ke, j.tanggal).t, b.length ? b[b.length - 1].tanggal_angsuran : "",
                    b.length ? String(b.reduce((t, x) => t + x.debit_pokok + x.debit_bunga, 0)) : "", b.map((x) => x.no_bukti).join(", ")]
            }),
            ["", "Total", String(totJadwal.p), "0", String(totJadwal.a), "", "", String(totBayar.p + totBayar.b), ""]] },
        { judul: "Riwayat Pembayaran", baris: [["Ke", "Tanggal", "No. Bukti", "Keterangan", "Bayar Pokok", "Bayar Jasa", "Cair Pokok", "Jasa Dibebankan", "Sisa Pokok"],
            ...baris.map((b) => [String(b.angsuran_ke), b.tanggal_angsuran, b.no_bukti ?? "", b.deskripsi ?? "", String(b.debit_pokok), String(b.debit_bunga), String(b.kredit_pokok), String(b.kredit_bunga), String(b.saldo)]),
            ["", "", "", "Total", String(totBayar.p), String(totBayar.b), String(totCair.p), String(totCair.b), String(saldo)]] },
    ]

    return (
        <div className="space-y-4">
            <Link href={bolehDaftar ? "/dashboard/loans/kpr" : "/dashboard/loans/cari"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" /> {bolehDaftar ? "Daftar KPR" : "Cari Pinjaman"}
            </Link>

            <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-semibold tracking-tight">{r.no_pinjaman}</h1>
                {statusUtama}
                {!r.aktif && <Lencana teks="Anggota non-aktif" warna="abu" />}
                <div className="ml-auto flex flex-wrap items-center gap-2 print:hidden">
                    <TombolCetak judul={judulCetak} subjudul={subjudulCetak} bagian={bagian} />
                    <TombolEkspor nama={`kpr_${r.no_pinjaman}`} judul={judulCetak} subjudul={subjudulCetak} bagian={bagian} />
                    <TombolKirimInfo noPinjaman={r.no_pinjaman} />
                    {bolehBayar && !lunas && <Link href="/dashboard/loans/payment" className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium shadow-sm hover:bg-muted">Bayar Angsuran</Link>}
                    {bolehBatal && r.jml_cicilan === 0 && <TombolBatalBukti no={r.no_pinjaman} label="Batalkan KPR" />}
                </div>
            </div>

            <div className="rounded-lg border bg-background p-4 shadow-sm">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                    <Isi label="Anggota" tebal>{r.nama}</Isi>
                    <Isi label="KPK / Kode">{r.nik ?? "-"} | {r.kode_agt}</Isi>
                    <Isi label="Jenis Kredit">{r.nama_kredit ?? "-"} ({r.kode_kredit ?? "-"})</Isi>
                    <Isi label="Grup">KPR</Isi>
                    <Isi label="Tgl Realisasi">{formatTanggal(r.tgl_pinjaman, "long")}</Isi>
                    <Isi label="Lama Angsuran">{r.lama_angsuran} bulan · terbayar {r.jml_cicilan}</Isi>
                    <Isi label="Pinjaman" tebal>{rp(r.rp_pinjaman_pokok)}</Isi>
                    <Isi label="Angsuran / Bulan" tebal>{rp(r.rp_angsuran_per_bulan)}</Isi>
                    <Isi label="Total Jasa">{rp(r.jasa)}</Isi>
                    <Isi label="Sudah Dibayar" tebal>{rp(totBayar.p + totBayar.b)}</Isi>
                    <Isi label="Sisa Pokok" tebal>{rp(r.sisa)}</Isi>
                    <Isi label="Jatuh Tempo Berikut">{berikut ? formatTanggal(berikut.tanggal, "long") : "-"}</Isi>
                </dl>
            </div>

            <div className="rounded-lg border bg-background shadow-sm overflow-clip">
                <div className="flex flex-wrap items-center gap-1 border-b p-2">
                    {tabLink("jadwal", "Jadwal Angsuran", jadwal.length)}
                    {tabLink("pembayaran", "Riwayat Pembayaran", rincian.length)}
                </div>

                {tab === "jadwal" ? (
                    jadwal.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">KPR ini belum punya jadwal angsuran.</p>
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
                                        const s = status(j.ke, j.tanggal)
                                        const b = bayarPerKe.get(j.ke) ?? []
                                        return (
                                            <tr key={j.ke} className={cn("border-t", s.w === "merah" && "bg-red-500/5")}>
                                                <td className="px-3 py-2 text-center text-muted-foreground">{j.ke}</td>
                                                <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(j.tanggal)}</td>
                                                <td className="px-3 py-2 text-right tabular-nums">{formatAngka(Number(j.pokok))}</td>
                                                <td className="px-3 py-2 text-right tabular-nums">{formatAngka(Number(j.jasa))}</td>
                                                <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatAngka(Number(j.total))}</td>
                                                <td className="px-3 py-2"><Lencana teks={s.t} warna={s.w} /></td>
                                                <td className="px-3 py-2 whitespace-nowrap">{b.length ? formatTanggal(b[b.length - 1].tanggal_angsuran) : "-"}</td>
                                                <td className="px-3 py-2 text-right tabular-nums">{b.length ? formatAngka(b.reduce((t, x) => t + x.debit_pokok + x.debit_bunga, 0)) : "-"}</td>
                                                <td className="px-3 py-2 font-mono text-xs">{b.map((x) => x.no_bukti).join(", ")}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                                <tfoot className="border-t-2 bg-muted/60 font-semibold">
                                    <tr>
                                        <td colSpan={2} className="px-3 py-2 text-right">Total jadwal</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(totJadwal.p)}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(0)}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(totJadwal.a)}</td>
                                        <td colSpan={2} className="px-3 py-2 text-right">Total dibayar</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(totBayar.p + totBayar.b)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )
                ) : rincian.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">Belum ada catatan di buku KPR ini.</p>
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
                                    <th className={`${th} print:hidden`}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {baris.map((b, i) => (
                                    <tr key={`${b.no_bukti}-${i}`} className={cn("border-t", b.angsuran_ke === 0 && "bg-muted/30 font-medium")}>
                                        <td className="px-3 py-2 text-center text-muted-foreground">{b.angsuran_ke}</td>
                                        <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(b.tanggal_angsuran)}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{b.no_bukti}</td>
                                        <td className="px-3 py-2">{b.deskripsi}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{b.debit_pokok ? formatAngka(b.debit_pokok) : ""}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{b.debit_bunga ? formatAngka(b.debit_bunga) : ""}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{b.kredit_pokok ? formatAngka(b.kredit_pokok) : ""}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{b.kredit_bunga ? formatAngka(b.kredit_bunga) : ""}</td>
                                        <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatAngka(b.saldo)}</td>
                                        <td className="px-1 py-1 text-right print:hidden">
                                            {b.angsuran_ke > 0 && b.no_bukti && <TombolKwitansi jenis="kpr" no={b.no_bukti} ikon />}
                                            {bolehBatal && b.angsuran_ke > 0 && b.angsuran_ke === r.jml_cicilan && b.no_bukti && <TombolBatalBukti no={b.no_bukti} label="Batalkan angsuran" ikon />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 bg-muted/60 font-semibold">
                                <tr>
                                    <td colSpan={4} className="px-3 py-2 text-right">Total</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(totBayar.p)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(totBayar.b)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(totCair.p)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(totCair.b)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(saldo)}</td>
                                    <td className="print:hidden" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
