import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { FormPeriode, KopLaporan } from "@/components/laporan/Periode"
import { neracaLajur } from "@/lib/queries/laporan"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

// Saldo bertanda debit - kredit ditampilkan di sisi debit (positif) atau kredit (negatif).
const sisi = (n: number): [number, number] => (n > 0 ? [n, 0] : n < 0 ? [0, -n] : [0, 0])
const bulatkan = (n: number) => Math.round(n * 100) / 100
const KOLOM = ["Neraca Saldo", "Penyesuaian", "Disesuaikan", "Laba Rugi", "Neraca"] as const

/**
 * Neraca lajur (kertas kerja): saldo sebelum penyesuaian, jurnal penyesuaian (status Penyesuaian), saldo disesuaikan, lalu dipisah ke kolom
 * Laba Rugi (pendapatan dan biaya) dan Neraca (aktiva, hutang, modal). Selisih kolom Laba Rugi ialah laba (rugi) bersih yang dipindah ke Neraca.
 */
export default async function NeracaLajurPage(props: PageProps<"/dashboard/accounting/worksheet">) {
    await wajibIzin("/dashboard/accounting/worksheet") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const sampai = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hariIni()
    const dari = isTanggal(sp(s, "dari")) ? sp(s, "dari") : `${sampai.slice(0, 4)}-01-01`
    const akun = await neracaLajur(dari, sampai)

    const baris = akun.map((a) => {
        const disesuaikan = a.sebelum + a.adjDebit - a.adjKredit
        const lr = a.kode_klasifikasi === 40 || a.kode_klasifikasi === 50
        const nr = a.kode_klasifikasi !== null && !lr
        return {
            a, ns: sisi(a.sebelum), adj: [a.adjDebit, a.adjKredit] as [number, number], nsd: sisi(disesuaikan),
            lr: lr ? sisi(disesuaikan) : ([0, 0] as [number, number]), nr: nr ? sisi(disesuaikan) : ([0, 0] as [number, number]), tanpaCoa: a.kode_klasifikasi === null,
        }
    })
    const jml = (f: (b: (typeof baris)[number]) => number) => bulatkan(baris.reduce((t, b) => t + f(b), 0))
    const tot = {
        nsD: jml((b) => b.ns[0]), nsK: jml((b) => b.ns[1]), adjD: jml((b) => b.adj[0]), adjK: jml((b) => b.adj[1]),
        nsdD: jml((b) => b.nsd[0]), nsdK: jml((b) => b.nsd[1]), lrD: jml((b) => b.lr[0]), lrK: jml((b) => b.lr[1]), nrD: jml((b) => b.nr[0]), nrK: jml((b) => b.nr[1]),
    }
    // Laba bersih = kredit - debit kolom Laba Rugi; masuk ke sisi yang lebih kecil di Laba Rugi dan ke sisi lawannya di Neraca.
    const laba = bulatkan(tot.lrK - tot.lrD)
    const lrTotal = [tot.lrD + Math.max(0, laba), tot.lrK + Math.max(0, -laba)].map(bulatkan)
    const nrTotal = [tot.nrD + Math.max(0, -laba), tot.nrK + Math.max(0, laba)].map(bulatkan)
    const selisihNs = bulatkan(tot.nsD - tot.nsK), selisihNsd = bulatkan(tot.nsdD - tot.nsdK)
    const lajur = (v: number) => (v ? formatAngka(v) : "")

    const ekspor: string[][] = [["Kode", "Nama Akun", "NS Debit", "NS Kredit", "Penyesuaian Debit", "Penyesuaian Kredit", "Disesuaikan Debit", "Disesuaikan Kredit", "Laba Rugi Debit", "Laba Rugi Kredit", "Neraca Debit", "Neraca Kredit"],
        ...baris.map((b) => [b.a.kode_perkiraan, b.a.nama_perkiraan, ...[...b.ns, ...b.adj, ...b.nsd, ...b.lr, ...b.nr].map((v) => String(bulatkan(v)))]),
        ["", laba >= 0 ? "LABA BERSIH" : "RUGI BERSIH", "", "", "", "", "", "", String(laba > 0 ? laba : ""), String(laba < 0 ? -laba : ""), String(laba < 0 ? -laba : ""), String(laba > 0 ? laba : "")]]

    return (
        <HalamanLaporan title="Neraca Lajur" description="Kertas kerja akuntansi: saldo sebelum penyesuaian, jurnal penyesuaian, saldo disesuaikan, laba rugi, dan neraca dalam satu lembar."
            filter={<FormPeriode dari={dari} sampai={sampai} tanpaCetak />} ekspor={{ nama: `neraca-lajur_${sampai}`, baris: ekspor }}>
            <div>
                <KopLaporan judul="Neraca Lajur" periode={`${formatTanggal(dari, "long")} s/d ${formatTanggal(sampai, "long")}`} />
                {(selisihNs !== 0 || selisihNsd !== 0) && (
                    <div role="alert" className="mb-3 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300 print:hidden">
                        Total debit dan kredit tidak sama (Neraca Saldo {formatAngka(selisihNs)}, Disesuaikan {formatAngka(selisihNsd)}). Penyebabnya jurnal lama yang tidak seimbang atau akun di luar COA;
                        lihat halaman <a href={`/dashboard/accounting/journal/tidak-seimbang?sampai=${sampai}`} className="font-semibold underline">Jurnal Bermasalah</a>.
                    </div>
                )}
                {akun.every((a) => a.adjDebit === 0 && a.adjKredit === 0) && (
                    <p className="mb-3 text-xs text-muted-foreground print:hidden">Belum ada jurnal penyesuaian pada periode ini; kolom Penyesuaian kosong dan Disesuaikan sama dengan Neraca Saldo.</p>
                )}
                <div className="overflow-x-auto" data-cetak-kolom>
                    <table className="w-full text-xs">
                        <thead className="bg-muted text-muted-foreground">
                            <tr>
                                <th rowSpan={2} className="px-2 py-2 text-left">Kode</th>
                                <th rowSpan={2} className="px-2 py-2 text-left">Nama Akun</th>
                                {KOLOM.map((k) => <th key={k} colSpan={2} className="border-b border-l px-2 py-1 text-center">{k}</th>)}
                            </tr>
                            <tr>{KOLOM.flatMap((k) => ["Debit", "Kredit"].map((h, i) => <th key={`${k}${h}`} className={`px-2 py-1 text-right ${i === 0 ? "border-l" : ""}`}>{h}</th>))}</tr>
                        </thead>
                        <tbody>
                            {baris.map((b) => (
                                <tr key={b.a.kode_perkiraan} className="border-t">
                                    <td className="px-2 py-1 font-mono">{b.a.kode_perkiraan}</td>
                                    <td className="px-2 py-1">{b.a.nama_perkiraan}{b.tanpaCoa && <span className="ml-1 text-amber-700">(tidak masuk laba rugi/neraca)</span>}</td>
                                    {[...b.ns, ...b.adj, ...b.nsd, ...b.lr, ...b.nr].map((v, i) => (
                                        <td key={i} className={`px-2 py-1 text-right tabular-nums ${i % 2 === 0 ? "border-l" : ""} ${i >= 2 && i < 4 && v ? "font-semibold text-indigo-700 dark:text-indigo-300" : ""}`}>{lajur(v)}</td>
                                    ))}
                                </tr>
                            ))}
                            <tr className="border-t font-semibold">
                                <td colSpan={2} className="px-2 py-1">{laba >= 0 ? "Laba bersih" : "Rugi bersih"}</td>
                                {[0, 0, 0, 0, 0, 0, laba > 0 ? laba : 0, laba < 0 ? -laba : 0, laba < 0 ? -laba : 0, laba > 0 ? laba : 0].map((v, i) => (
                                    <td key={i} className={`px-2 py-1 text-right tabular-nums ${i % 2 === 0 ? "border-l" : ""}`}>{lajur(v)}</td>
                                ))}
                            </tr>
                        </tbody>
                        <tfoot className="border-t-2 bg-muted/40 font-bold">
                            <tr>
                                <td colSpan={2} className="px-2 py-2 text-right">Jumlah</td>
                                {[tot.nsD, tot.nsK, tot.adjD, tot.adjK, tot.nsdD, tot.nsdK, lrTotal[0], lrTotal[1], nrTotal[0], nrTotal[1]].map((v, i) => (
                                    <td key={i} className={`px-2 py-2 text-right tabular-nums ${i % 2 === 0 ? "border-l" : ""}`}>{formatAngka(v)}</td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Kolom Penyesuaian memuat jurnal berstatus Penyesuaian (menu Jurnal Penyesuaian atau jurnal umum yang ditandai). Jurnal tutup buku tidak dihitung agar pendapatan dan biaya tampil utuh.</p>
            </div>
        </HalamanLaporan>
    )
}
