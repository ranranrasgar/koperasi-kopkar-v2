import Link from "next/link"
import { notFound } from "next/navigation"
import { FormCard } from "@/components/transaksi/common"
import { ModalPosting, ModalUbah, SaklarDipotong } from "@/components/potongan/FormPotongan"
import { CetakEksporPotongan, FilterPotongan } from "@/components/potongan/AlatPotongan"
import { akunKas } from "@/lib/queries/akuntansi"
import { PERIODE, anggotaPeriode, kasBawaanPotongan, namaPeriode, rekapPotongan, satuPeriode } from "@/lib/queries/potongan-gaji"
import { formatAngka, formatTanggal } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

const KOLOM = [["s_wajib", "S. Wajib"], ["s_sukarela", "S. Sukarela"], ["koperasi", "Pinj. Koperasi"], ["bank", "Pinj. Bank"],
    ["kpr", "KPR"], ["adm", "Adm Bank"], ["total", "Total"]] as const

const akhirBulan = (p: string) => {
    const d = new Date(Date.UTC(Number(p.slice(0, 4)), Number(p.slice(5, 7)), 0))
    return d.toISOString().slice(0, 10)
}

export default async function DetailPeriodePage(props: PageProps<"/dashboard/deductions/periode/[periode]">) {
    await wajibIzin("/dashboard/deductions/periode") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const { periode } = await props.params
    if (!PERIODE.test(periode)) notFound()
    const s = await props.searchParams
    const f = { cari: sp(s, "q"), staff: sp(s, "staff"), tampil: sp(s, "tampil") }
    const [p, { rows, jumlah }, rekap, akun, kasBawaan] = await Promise.all([satuPeriode(periode), anggotaPeriode(periode, f),
        rekapPotongan(periode, f.staff), akunKas(), kasBawaanPotongan()])
    if (!p) notFound()
    const draf = p.status === "draf"
    const sub = `${p.anggota - p.tidak_dipotong} dari ${p.anggota} anggota dipotong`

    return (
        <div className="space-y-6">
            <FormCard title={`Potongan Gaji ${namaPeriode(periode)}`}
                description={draf
                    ? `Draf, digenerate ${p.digenerate_pada} oleh ${p.dibuat_oleh}. ${sub}. Total dipotong Rp ${formatAngka(p.total)}.`
                    : `Diposting ${formatTanggal(p.tgl_posting)} ke ${p.kas} oleh ${p.diposting_oleh} (${p.diposting_pada}). ${sub}. Total dipotong Rp ${formatAngka(p.total)}.`}>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <Link href="/dashboard/deductions/periode" className="text-blue-600 dark:text-blue-400 hover:underline">&larr; Semua periode</Link>
                        {p.tidak_dipotong > 0 && <Link href={`?tampil=tidak`} className="text-amber-700 dark:text-amber-400 hover:underline">{p.tidak_dipotong} anggota tidak dipotong</Link>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Cetak dan Ekspor: anggota yang dipotong, mengikuti filter Staff (seperti desktop). */}
                        <CetakEksporPotongan periode={periode} judulPeriode={namaPeriode(periode)} rows={rekap} staff={f.staff} />
                        {draf && <ModalPosting periode={periode} akun={akun} kasBawaan={kasBawaan} tanggalBawaan={akhirBulan(periode)}
                            ringkas={`${sub}, total Rp ${formatAngka(p.total)}. Anggota dengan saklar mati tidak ikut diposting.`} />}
                    </div>
                </div>
            </FormCard>

            <FormCard title="Daftar Potongan" description={draf
                ? "Saklar Dipotong langsung tersimpan; anggota yang dimatikan tidak ikut diposting. Klik nama anggota untuk mengubah nominal. Jumlah di bawah hanya anggota yang dipotong."
                : "Sudah diposting; klik nama anggota untuk melihat nomor bukti setoran dan angsurannya."}>
                <div className="rounded-md border overflow-clip">
                <FilterPotongan />
                <div className="max-h-[70vh] overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-muted text-muted-foreground text-xs">
                            <tr>
                                <th className="px-2 py-2 text-center print:hidden">Dipotong</th>
                                <th className="px-2 py-2 text-left">Anggota</th>
                                <th className="px-2 py-2 text-left">Rekening</th>
                                {KOLOM.map(([k, l]) => <th key={k} className="px-2 py-2 text-right">{l}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.kode_agt} className={`border-t ${r.dipotong ? "" : "bg-muted/50 text-muted-foreground"}`}>
                                    <td className="px-2 py-1 print:hidden">
                                        <SaklarDipotong periode={periode} kodeAgt={r.kode_agt} nama={r.nama} dipotong={r.dipotong} bisaUbah={draf} />
                                    </td>
                                    <td className="px-2 py-1">
                                        <ModalUbah periode={periode} kodeAgt={r.kode_agt} nama={r.nama} draf={draf} />
                                        <div className="text-[11px] text-muted-foreground font-mono">{r.kode_agt} | {r.nik || "-"} | {r.status_staff || "-"}</div>
                                        {!r.dipotong && <div className="text-[11px] text-amber-700 dark:text-amber-400">Tidak dipotong{r.alasan ? `: ${r.alasan}` : ""}</div>}
                                        {r.dipotong && r.diubah_oleh && <div className="text-[11px] text-blue-700 dark:text-blue-400">Diubah oleh {r.diubah_oleh}</div>}
                                    </td>
                                    <td className="px-2 py-1 text-xs">{r.bank_nama || "-"}<div className="font-mono text-[11px] text-muted-foreground">{r.bank_no_rek}</div></td>
                                    {KOLOM.map(([k]) => <td key={k} className={`px-2 py-1 text-right tabular-nums ${k === "total" ? "font-semibold" : ""}`}>{formatAngka(r[k])}</td>)}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="sticky bottom-0 bg-muted font-semibold text-sm">
                            <tr className="border-t">
                                <td className="px-2 py-2 print:hidden" />
                                <td className="px-2 py-2" colSpan={2}>Jumlah dipotong ({rows.filter((r) => r.dipotong).length} anggota)</td>
                                {KOLOM.map(([k]) => <td key={k} className="px-2 py-2 text-right tabular-nums">{formatAngka(jumlah[k])}</td>)}
                            </tr>
                        </tfoot>
                    </table>
                </div>
                </div>
            </FormCard>
        </div>
    )
}
