import Link from "next/link"
import { notFound } from "next/navigation"
import { FormCard } from "@/components/transaksi/common"
import { ModalPosting, ModalUbah, SaklarDipotong } from "@/components/potongan/FormPotongan"
import { CetakEksporPotongan, FilterPotongan } from "@/components/potongan/AlatPotongan"
import { akunKas } from "@/lib/queries/akuntansi"
import { NAMA_BAGIAN, PERIODE, STATUS_PERIODE, anggotaPeriode, bagianPeriode, kasBawaanPotongan, namaPeriode, rekapPotongan, satuPeriode } from "@/lib/queries/potongan-gaji"
import { formatAngka, formatTanggal } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

// Kolom sama dengan grid Potongan Keseluruhan di desktop.
const KOLOM = [["s_pokok", "Pokok"], ["s_wajib", "Wajib"], ["s_sukarela", "Sukarela"], ["koperasi", "Koperasi"], ["bank", "Bank"],
    ["kpr", "Kpr"], ["adm", "Adm Bank"], ["total", "Total"]] as const

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
    const [p, { rows, jumlah }, rekap, akun, kasBawaan, bagian] = await Promise.all([satuPeriode(periode), anggotaPeriode(periode, f),
        rekapPotongan(periode, f.staff), akunKas(), kasBawaanPotongan(), bagianPeriode(periode)])
    if (!p) notFound()
    const draf = p.status === "draf"
    const sub = `${p.anggota - p.tidak_dipotong} dari ${p.anggota} anggota dipotong`
    const sudah = bagian.filter((b) => b.posting)
    const keterangan = `${namaPeriode(periode).split(" ")[0]} ${periode.slice(2, 4)}` // Oktober 26, sama dengan desktop

    return (
        <div className="space-y-6">
            <FormCard title={`Potongan Gaji ${namaPeriode(periode)}`}
                description={`${STATUS_PERIODE[p.status]}, digenerate ${p.digenerate_pada} oleh ${p.dibuat_oleh}. ${sub}. Total dipotong Rp ${formatAngka(p.total)}.`}>
                {sudah.length > 0 && (
                    <ul className="mb-3 space-y-0.5 text-xs text-muted-foreground">
                        {sudah.map((b) => <li key={b.bagian}><span className="font-medium text-foreground">{NAMA_BAGIAN[b.bagian]}</span>: diposting {formatTanggal(b.posting!.tgl_posting)} ke {b.posting!.kas} oleh {b.posting!.diposting_oleh}, {b.transaksi} transaksi, Rp {formatAngka(Number(b.jumlah))}</li>)}
                    </ul>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="flex flex-wrap items-center gap-3">
                        <Link href="/dashboard/deductions/periode" className="text-blue-600 dark:text-blue-400 hover:underline">&larr; Semua periode</Link>
                        {p.tidak_dipotong > 0 && <Link href={`?tampil=tidak`} className="text-amber-700 dark:text-amber-400 hover:underline">{p.tidak_dipotong} anggota tidak dipotong</Link>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Cetak dan Ekspor: anggota yang dipotong, mengikuti filter Staff (seperti desktop). */}
                        <CetakEksporPotongan periode={periode} judulPeriode={namaPeriode(periode)} keterangan={keterangan} rows={rekap} staff={f.staff} />
                        {p.status !== "diposting" && <ModalPosting periode={periode} akun={akun} kasBawaan={kasBawaan} tanggalBawaan={akhirBulan(periode)}
                            ringkas={`${sub}, total Rp ${formatAngka(p.total)}. Anggota dengan saklar mati tidak ikut diposting.`}
                            bagian={bagian.map((b) => ({ bagian: b.bagian, nama: NAMA_BAGIAN[b.bagian], transaksi: b.transaksi, jumlah: Number(b.jumlah), posting: b.posting }))} />}
                    </div>
                </div>
            </FormCard>

            <FormCard title="Daftar Potongan" description={draf
                ? "Saklar Dipotong langsung tersimpan; anggota yang dimatikan tidak ikut diposting. Klik nama anggota untuk mengubah nominal. Jumlah di bawah hanya anggota yang dipotong."
                : "Sudah diposting; klik nama anggota untuk melihat nomor bukti setoran dan angsurannya."}>
                <div className="rounded-md border overflow-clip">
                <FilterPotongan />
                <div className="max-h-[70vh] overflow-auto">
                    <table className="w-full whitespace-nowrap text-xs">
                        <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
                            <tr>
                                <th className="px-2 py-2 text-center print:hidden">Dipotong</th>
                                <th className="px-2 py-2 text-left">KPK</th>
                                <th className="px-2 py-2 text-left">Nama</th>
                                <th className="px-2 py-2 text-center" title="Cara bayar">CB</th>
                                <th className="px-2 py-2 text-left">Accrek</th>
                                <th className="px-2 py-2 text-left">Namarek</th>
                                <th className="px-2 py-2 text-left">Bank</th>
                                <th className="px-2 py-2 text-left">Kota</th>
                                {KOLOM.map(([k, l]) => <th key={k} className="px-2 py-2 text-right">{l}</th>)}
                                <th className="px-2 py-2 text-left">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.kode_agt} className={`border-t ${r.dipotong ? "" : "bg-muted/50 text-muted-foreground"}`}>
                                    <td className="px-2 py-1 print:hidden">
                                        <SaklarDipotong periode={periode} kodeAgt={r.kode_agt} nama={r.nama} dipotong={r.dipotong} bisaUbah={draf} />
                                    </td>
                                    <td className="px-2 py-1 font-mono">{r.nik}</td>
                                    <td className="px-2 py-1"><ModalUbah periode={periode} kodeAgt={r.kode_agt} nama={r.nama} draf={draf} /></td>
                                    <td className="px-2 py-1 text-center">P</td>
                                    <td className="px-2 py-1 font-mono">{r.bank_no_rek}</td>
                                    <td className="px-2 py-1">{r.bank_atas_nama}</td>
                                    <td className="px-2 py-1">{r.bank_nama}</td>
                                    <td className="px-2 py-1">{r.kota}</td>
                                    {KOLOM.map(([k]) => <td key={k} className={`px-2 py-1 text-right tabular-nums ${k === "total" ? "font-semibold" : ""}`}>{formatAngka(r[k])}</td>)}
                                    <td className="px-2 py-1">{keterangan}
                                        {!r.dipotong && <span className="ml-1 text-amber-700 dark:text-amber-400">Tidak dipotong{r.alasan ? `: ${r.alasan}` : ""}</span>}
                                        {r.dipotong && r.diubah_oleh && <span className="ml-1 text-blue-700 dark:text-blue-400">Diubah {r.diubah_oleh}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="sticky bottom-0 bg-muted font-semibold">
                            <tr className="border-t">
                                <td className="px-2 py-2 print:hidden" />
                                <td className="px-2 py-2" colSpan={7}>Jumlah dipotong ({rows.filter((r) => r.dipotong).length} anggota)</td>
                                {KOLOM.map(([k]) => <td key={k} className="px-2 py-2 text-right tabular-nums">{formatAngka(jumlah[k])}</td>)}
                                <td />
                            </tr>
                        </tfoot>
                    </table>
                </div>
                </div>
            </FormCard>
        </div>
    )
}
