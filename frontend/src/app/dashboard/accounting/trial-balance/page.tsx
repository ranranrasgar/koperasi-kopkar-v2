import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { FormPeriode, KopLaporan } from "@/components/laporan/Periode"
import { saldoPerAkun } from "@/lib/queries/laporan"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

// Saldo ditampilkan di sisi normal akun: debit untuk akun D, kredit untuk akun C (kredit).
const sisi = (nilai: number) => ({ d: nilai > 0 ? nilai : 0, k: nilai < 0 ? -nilai : 0 })

export default async function NeracaSaldoPage(props: PageProps<"/dashboard/accounting/trial-balance">) {
    await wajibIzin("/dashboard/accounting/trial-balance") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const sampai = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hariIni()
    const dari = isTanggal(sp(s, "dari")) ? sp(s, "dari") : `${sampai.slice(0, 4)}-01-01`
    const akun = (await saldoPerAkun(dari, sampai)).filter((a) => a.awal || a.debit || a.kredit)
    const tot = akun.reduce((t, a) => {
        const aw = sisi(a.awal), ak = sisi(a.akhir)
        return { ad: t.ad + aw.d, ak: t.ak + aw.k, md: t.md + a.debit, mk: t.mk + a.kredit, zd: t.zd + ak.d, zk: t.zk + ak.k }
    }, { ad: 0, ak: 0, md: 0, mk: 0, zd: 0, zk: 0 })
    const selisih = Math.round((tot.zd - tot.zk) * 100) / 100

    return (
        <HalamanLaporan title="Neraca Saldo (Trial Balance)" description="Saldo awal, mutasi, dan saldo akhir per akun dari jurnal umum. Saldo awal tahun diambil dari jurnal tutup buku (TBT)."
            filter={<FormPeriode dari={dari} sampai={sampai} tanpaCetak />}
            ekspor={{ nama: `neraca-saldo_${sampai}`, baris: [["Kode", "Nama Akun", "Awal Debit", "Awal Kredit", "Mutasi Debit", "Mutasi Kredit", "Akhir Debit", "Akhir Kredit"],
                ...akun.map((a) => { const aw = sisi(a.awal), ak = sisi(a.akhir); return [a.kode_perkiraan, a.nama_perkiraan, aw.d, aw.k, a.debit, a.kredit, ak.d, ak.k].map(String) })] }}>
            <div>
                <KopLaporan judul="Neraca Saldo" periode={`${formatTanggal(dari, "long")} s/d ${formatTanggal(sampai, "long")}`} />
                {selisih !== 0 && (
                    <div role="alert" className="mb-3 rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                        Total debit dan kredit saldo akhir berselisih {formatAngka(selisih)}. Selisih ini berasal dari jurnal lama yang tidak seimbang di data
                        (termasuk jurnal ke akun yang tidak ada di COA), bukan dari perhitungan laporan.
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr>
                                <th rowSpan={2} className="px-2 py-2 text-left">Kode</th>
                                <th rowSpan={2} className="px-2 py-2 text-left">Nama Akun</th>
                                <th colSpan={2} className="px-2 py-1 text-center border-b">Saldo Awal</th>
                                <th colSpan={2} className="px-2 py-1 text-center border-b">Mutasi</th>
                                <th colSpan={2} className="px-2 py-1 text-center border-b">Saldo Akhir</th>
                            </tr>
                            <tr>{["Debit", "Kredit", "Debit", "Kredit", "Debit", "Kredit"].map((h, i) => <th key={i} className="px-2 py-1 text-right">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {akun.map((a) => {
                                const aw = sisi(a.awal), ak = sisi(a.akhir)
                                return (
                                    <tr key={a.kode_perkiraan} className="border-t">
                                        <td className="px-2 py-1 font-mono text-xs">{a.kode_perkiraan}</td>
                                        <td className="px-2 py-1">{a.nama_perkiraan}</td>
                                        {[aw.d, aw.k, a.debit, a.kredit, ak.d, ak.k].map((v, i) => (
                                            <td key={i} className="px-2 py-1 text-right tabular-nums">{v ? formatAngka(v) : ""}</td>
                                        ))}
                                    </tr>
                                )
                            })}
                        </tbody>
                        <tfoot className="border-t-2 font-semibold bg-muted/40">
                            <tr>
                                <td colSpan={2} className="px-2 py-2 text-right">Total</td>
                                {[tot.ad, tot.ak, tot.md, tot.mk, tot.zd, tot.zk].map((v, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{formatAngka(v)}</td>)}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </HalamanLaporan>
    )
}
