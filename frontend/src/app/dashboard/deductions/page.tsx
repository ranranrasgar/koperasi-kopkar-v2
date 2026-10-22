import { FormCard, selectClass } from "@/components/transaksi/common"
import { TombolCetak } from "@/components/ui/TombolCetak"
import { KopLaporan } from "@/components/laporan/Periode"
import { Input } from "@/components/ui/input"
import { proyeksiPotongan } from "@/lib/queries/pinjaman-lap"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

const KOLOM = [
    { k: "s_wajib", l: "S. Wajib" }, { k: "s_sukarela", l: "S. Sukarela" }, { k: "koperasi", l: "Pinj. Koperasi" },
    { k: "bank", l: "Pinj. Bank" }, { k: "kpr", l: "KPR" }, { k: "adm", l: "Adm Bank" }, { k: "total", l: "Total" },
] as const

export default async function PotonganPage(props: PageProps<"/dashboard/deductions">) {
    await wajibIzin("/dashboard/deductions") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const cari = sp(s, "q").toLowerCase(), staff = sp(s, "staff")
    const semua = await proyeksiPotongan()
    const data = semua.filter((p) => (!staff || p.status_staff === staff)
        && (!cari || p.nama.toLowerCase().includes(cari) || p.kode_agt.toLowerCase().includes(cari) || (p.nik ?? "").includes(cari)))
    const total = Object.fromEntries(KOLOM.map((c) => [c.k, data.reduce((t, p) => t + p[c.k], 0)]))
    const beda = data.filter((p) => p.snap_total !== null && Math.round(p.snap_total) !== Math.round(p.total)).length

    return (
        <FormCard title="Transaksi Potongan Gaji"
            description="Proyeksi potongan gaji bulan berjalan untuk anggota aktif, dihitung langsung dari data (rumus sama dengan hasil generate desktop).">
            <form method="get" className="flex flex-wrap items-end gap-3 print:hidden">
                <Input name="q" defaultValue={sp(s, "q")} placeholder="Cari kode, KPK, atau nama" className="w-64" />
                <select name="staff" defaultValue={staff} className={`${selectClass} w-40`} aria-label="Status staff">
                    <option value="">Semua staff</option><option value="Staff">Staff</option><option value="No Staff">Non staff</option>
                </select>
                <button type="submit" className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Tampilkan</button>
                <TombolCetak />
            </form>
            <div className="mt-4">
                <KopLaporan judul="Daftar Potongan Gaji" periode={`Proyeksi per ${formatTanggal(hariIni(), "long")}`} />
                <p className="text-xs text-muted-foreground mb-2 print:hidden">
                    {data.length} anggota. Kolom &quot;Generate terakhir&quot; adalah total dari hasil generate terakhir aplikasi desktop (temp_potongan_all);
                    {beda} anggota berbeda karena ada pembayaran atau pinjaman baru setelah generate itu.
                </p>
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr>
                                <th className="px-2 py-2 text-left">Anggota</th>
                                <th className="px-2 py-2 text-left">Rekening</th>
                                {KOLOM.map((c) => <th key={c.k} className="px-2 py-2 text-right whitespace-nowrap">{c.l}</th>)}
                                <th className="px-2 py-2 text-right whitespace-nowrap print:hidden">Generate terakhir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((p) => (
                                <tr key={p.kode_agt} className="border-t">
                                    <td className="px-2 py-1">
                                        <div className="font-medium">{p.nama}</div>
                                        <div className="text-[11px] text-muted-foreground font-mono">{p.kode_agt} | {p.nik ?? "-"}</div>
                                    </td>
                                    <td className="px-2 py-1 text-xs">{p.bank_nama} {p.bank_no_rek}</td>
                                    {KOLOM.map((c) => (
                                        <td key={c.k} className={`px-2 py-1 text-right tabular-nums ${c.k === "total" ? "font-semibold" : ""}`}>{p[c.k] ? formatAngka(p[c.k]) : ""}</td>
                                    ))}
                                    <td className={`px-2 py-1 text-right tabular-nums print:hidden ${p.snap_total !== null && Math.round(p.snap_total) !== Math.round(p.total) ? "text-amber-700" : "text-muted-foreground"}`}>
                                        {p.snap_total === null ? "-" : formatAngka(p.snap_total)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t-2 bg-muted/40 font-semibold">
                            <tr>
                                <td colSpan={2} className="px-2 py-2 text-right">Total</td>
                                {KOLOM.map((c) => <td key={c.k} className="px-2 py-2 text-right tabular-nums">{formatAngka(total[c.k])}</td>)}
                                <td className="print:hidden"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </FormCard>
    )
}
