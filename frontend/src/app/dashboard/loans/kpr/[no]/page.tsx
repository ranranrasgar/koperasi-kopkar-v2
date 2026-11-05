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

export const dynamic = "force-dynamic"

const Isi = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="min-w-0">
        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 truncate text-sm font-medium">{children}</dd>
    </div>
)

/** Detail satu KPR: ringkasan, jadwal angsuran, dan riwayat dari buku KPR. */
export default async function DetailKprPage(props: { params: Promise<{ no: string }> }) {
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

    // Aturan terlambat sama dengan detail pinjaman tunai: bulan jatuh tempo sudah berakhir (potongan gaji dibukukan akhir bulan).
    const hari = hariIni(), awalBulan = `${hari.slice(0, 7)}-01`
    const bayarKe = new Map(rincian.filter((b) => b.angsuran_ke > 0).map((b) => [b.angsuran_ke, b]))
    const status = (ke: number, tgl: string) => ke <= r.jml_cicilan ? "Terbayar" : lunas ? "Lunas"
        : tgl < awalBulan ? "Terlambat" : tgl <= hari ? "Jatuh tempo bulan ini" : "Belum jatuh tempo"
    let saldo = 0
    const riwayat = rincian.map((b) => { saldo += b.kredit_pokok - b.debit_pokok; return { ...b, saldo } })

    const judulCetak = `Detail KPR ${r.no_pinjaman}`, subjudulCetak = `${r.nama} (${r.nik ?? "-"} | ${r.kode_agt})`
    const bagian = [
        { judul: "Ringkasan", polos: true, baris: [["Keterangan", "Nilai"], ["Status", lunas ? "Lunas" : "Berjalan"], ["Jenis", `${r.nama_kredit ?? "-"} (${r.kode_kredit ?? "-"})`],
            ["Tgl Realisasi", formatTanggal(r.tgl_pinjaman, "long")], ["Lama Angsuran", `${r.lama_angsuran} bulan, terbayar ${r.jml_cicilan}`], ["Pokok", String(r.rp_pinjaman_pokok)],
            ["Angsuran/Bulan", String(r.rp_angsuran_per_bulan)], ["Sudah Dibayar", String(r.bayar)], ["Sisa Pokok", String(r.sisa)]] },
        { judul: "Jadwal Angsuran", baris: [["Ke", "Jatuh Tempo", "Angsuran", "Status", "Tgl Bayar", "No. Bukti"],
            ...jadwal.map((j) => [String(j.ke), j.tanggal, j.total, status(j.ke, j.tanggal), bayarKe.get(j.ke)?.tanggal_angsuran ?? "", bayarKe.get(j.ke)?.no_bukti ?? ""])] },
        { judul: "Riwayat Buku KPR", baris: [["Ke", "Tanggal", "No. Bukti", "Keterangan", "Bayar", "Cair", "Sisa Pokok"],
            ...riwayat.map((b) => [String(b.angsuran_ke), b.tanggal_angsuran, b.no_bukti ?? "", b.deskripsi ?? "", String(b.debit_pokok), String(b.kredit_pokok), String(b.saldo)])] },
    ]
    const th = "px-3 py-2 text-xs font-semibold", kartu = "overflow-x-auto rounded-lg border bg-background shadow-sm"

    return (
        <div className="space-y-4">
            <Link href={bolehDaftar ? "/dashboard/loans/kpr" : "/dashboard/loans/cari"} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" /> {bolehDaftar ? "Daftar KPR" : "Cari Pinjaman"}
            </Link>

            <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-mono text-2xl font-semibold tracking-tight">{r.no_pinjaman}</h1>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{lunas ? "Lunas" : "Berjalan"}</span>
                <div className="ml-auto flex flex-wrap items-center gap-2 print:hidden">
                    <TombolCetak judul={judulCetak} subjudul={subjudulCetak} bagian={bagian} />
                    <TombolEkspor nama={`kpr_${r.no_pinjaman}`} judul={judulCetak} subjudul={subjudulCetak} bagian={bagian} />
                    <TombolKirimInfo noPinjaman={r.no_pinjaman} />
                    {bolehBayar && !lunas && <Link href="/dashboard/loans/payment" className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">Bayar Angsuran</Link>}
                    {bolehBatal && r.jml_cicilan === 0 && <TombolBatalBukti no={r.no_pinjaman} label="Batalkan KPR" />}
                </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border bg-background p-4 shadow-sm md:grid-cols-4">
                <Isi label="Anggota">{r.nama}</Isi>
                <Isi label="KPK / Kode">{r.nik ?? "-"} | {r.kode_agt}</Isi>
                <Isi label="Jenis">{r.nama_kredit ?? "-"} ({r.kode_kredit ?? "-"})</Isi>
                <Isi label="Tgl Realisasi">{formatTanggal(r.tgl_pinjaman, "long")}</Isi>
                <Isi label="Pokok">Rp {formatAngka(r.rp_pinjaman_pokok)}</Isi>
                <Isi label="Angsuran / Bulan">Rp {formatAngka(r.rp_angsuran_per_bulan)}</Isi>
                <Isi label="Sudah Dibayar">Rp {formatAngka(r.bayar)} · {r.jml_cicilan}/{r.lama_angsuran} bln</Isi>
                <Isi label="Sisa Pokok">Rp {formatAngka(r.sisa)}</Isi>
            </dl>

            <section className="space-y-2">
                <h2 className="font-semibold">Jadwal Angsuran</h2>
                <div className={kartu}>
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr><th className={`${th} text-center`}>Ke</th><th className={`${th} text-left`}>Jatuh Tempo</th><th className={`${th} text-right`}>Angsuran</th>
                                <th className={`${th} text-left`}>Status</th><th className={`${th} text-left`}>Tgl Bayar</th><th className={`${th} text-left`}>No. Bukti</th></tr>
                        </thead>
                        <tbody>
                            {jadwal.map((j) => {
                                const b = bayarKe.get(j.ke)
                                return (
                                    <tr key={j.ke} className="border-t">
                                        <td className="px-3 py-1.5 text-center tabular-nums">{j.ke}</td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">{formatTanggal(j.tanggal)}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(Number(j.total))}</td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">{status(j.ke, j.tanggal)}</td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">{b ? formatTanggal(b.tanggal_angsuran) : "-"}</td>
                                        <td className="px-3 py-1.5 font-mono text-xs">{b?.no_bukti || "-"}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="space-y-2">
                <h2 className="font-semibold">Riwayat Buku KPR</h2>
                <div className={kartu}>
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground">
                            <tr><th className={`${th} text-center`}>Ke</th><th className={`${th} text-left`}>Tanggal</th><th className={`${th} text-left`}>No. Bukti</th><th className={`${th} text-left`}>Keterangan</th>
                                <th className={`${th} text-right`}>Bayar</th><th className={`${th} text-right`}>Cair</th><th className={`${th} text-right`}>Sisa Pokok</th><th className="w-16 print:hidden" /></tr>
                        </thead>
                        <tbody>
                            {riwayat.map((b, i) => (
                                <tr key={`${b.no_bukti}-${i}`} className="border-t">
                                    <td className="px-3 py-1.5 text-center tabular-nums">{b.angsuran_ke || "-"}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap">{formatTanggal(b.tanggal_angsuran)}</td>
                                    <td className="px-3 py-1.5 font-mono text-xs">{b.no_bukti || "-"}</td>
                                    <td className="px-3 py-1.5">{b.deskripsi ?? ""}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{b.debit_pokok ? formatAngka(b.debit_pokok) : ""}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{b.kredit_pokok ? formatAngka(b.kredit_pokok) : ""}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(b.saldo)}</td>
                                    <td className="px-1 py-1 text-right print:hidden">
                                        {b.angsuran_ke > 0 && b.no_bukti && <TombolKwitansi jenis="kpr" no={b.no_bukti} ikon />}
                                        {bolehBatal && b.angsuran_ke > 0 && b.angsuran_ke === r.jml_cicilan && b.no_bukti && <TombolBatalBukti no={b.no_bukti} label="Batalkan angsuran" ikon />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
