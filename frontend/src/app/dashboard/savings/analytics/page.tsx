import { FormCard, selectClass } from "@/components/transaksi/common"
import { grafikSimpanan } from "@/lib/queries/simpanan-lap"
import { jenisSimpanan } from "@/lib/queries/simpanan"
import { formatAngka, formatRupiah } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const WARNA: Record<string, string> = { "01": "bg-sky-500", "02": "bg-blue-600", "03": "bg-emerald-500", "04": "bg-amber-500", "05": "bg-violet-500" }

export default async function GrafikSimpananPage(props: PageProps<"/dashboard/savings/analytics">) {
    await wajibIzin("/dashboard/savings/analytics") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const sekarang = new Date().getFullYear()
    const tahun = Math.min(sekarang, Math.max(2017, parseInt(sp(await props.searchParams, "tahun"), 10) || sekarang))
    const [{ bulanan, saldoAwal }, jenis] = await Promise.all([grafikSimpanan(tahun), jenisSimpanan()])

    const perBulan = BULAN.map((_, i) => {
        const b = bulanan.filter((x) => x.bulan === i + 1)
        return { setor: b.reduce((s, x) => s + x.setor, 0), ambil: b.reduce((s, x) => s + x.ambil, 0), perJenis: b }
    })
    let saldo = saldoAwal
    const saldoBulan = perBulan.map((b) => (saldo += b.setor - b.ambil))
    const maksArus = Math.max(1, ...perBulan.map((b) => Math.max(b.setor, b.ambil)))
    const minSaldo = Math.min(...saldoBulan), maksSaldo = Math.max(...saldoBulan)
    const total = { setor: perBulan.reduce((s, b) => s + b.setor, 0), ambil: perBulan.reduce((s, b) => s + b.ambil, 0) }

    return (
        <div className="space-y-6">
            <FormCard title="Grafik Analisa Simpanan" description={`Setoran, pengambilan, dan saldo simpanan tahun ${tahun} (semua anggota).`}>
                <form method="get" className="flex items-end gap-3">
                    <select name="tahun" defaultValue={tahun} className={`${selectClass} w-32`} aria-label="Tahun">
                        {Array.from({ length: sekarang - 2016 }, (_, i) => sekarang - i).map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button type="submit" className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Tampilkan</button>
                </form>
                <div className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
                    <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Saldo awal tahun</div><div className="font-bold tabular-nums">{formatRupiah(saldoAwal)}</div></div>
                    <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Total setoran</div><div className="font-bold tabular-nums text-green-600">{formatRupiah(total.setor)}</div></div>
                    <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Total pengambilan</div><div className="font-bold tabular-nums text-error">{formatRupiah(total.ambil)}</div></div>
                    <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Saldo akhir</div><div className="font-bold tabular-nums">{formatRupiah(saldoBulan[11])}</div></div>
                </div>
            </FormCard>

            <FormCard title="Arus Simpanan per Bulan" description="Batang kiri setoran (berwarna per jenis), batang kanan pengambilan.">
                <div className="flex flex-wrap gap-3 text-xs mb-3">
                    {jenis.map((j) => <span key={j.kode_simpanan} className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-sm ${WARNA[j.kode_simpanan] ?? "bg-gray-400"}`} />{j.nama_simpanan}</span>)}
                    <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-400" />Pengambilan</span>
                </div>
                <div className="flex items-end gap-2 h-64 border-b">
                    {perBulan.map((b, i) => (
                        <div key={i} className="flex-1 flex items-end justify-center gap-0.5 h-full" title={`${BULAN[i]}: setor ${formatAngka(b.setor)}, ambil ${formatAngka(b.ambil)}`}>
                            <div className="w-1/2 max-w-6 flex flex-col-reverse" style={{ height: `${(b.setor / maksArus) * 100}%` }}>
                                {b.perJenis.map((x) => (
                                    <div key={x.jenis} className={WARNA[x.jenis] ?? "bg-gray-400"} style={{ height: `${b.setor ? (x.setor / b.setor) * 100 : 0}%` }} />
                                ))}
                            </div>
                            <div className="w-1/2 max-w-6 bg-red-400" style={{ height: `${(b.ambil / maksArus) * 100}%` }} />
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-1 text-[11px] text-muted-foreground">{BULAN.map((m) => <div key={m} className="flex-1 text-center">{m}</div>)}</div>
            </FormCard>

            <FormCard title="Saldo Akhir per Bulan" description="Saldo seluruh simpanan pada akhir tiap bulan.">
                <div className="flex items-end gap-2 h-48 border-b">
                    {saldoBulan.map((v, i) => (
                        <div key={i} className="flex-1 flex items-end justify-center h-full" title={`${BULAN[i]}: ${formatRupiah(v)}`}>
                            <div className="w-3/4 max-w-10 bg-primary rounded-t" style={{ height: `${maksSaldo === minSaldo ? 100 : 20 + ((v - minSaldo) / (maksSaldo - minSaldo)) * 80}%` }} />
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-1 text-[11px] text-muted-foreground">{BULAN.map((m) => <div key={m} className="flex-1 text-center">{m}</div>)}</div>
                <p className="mt-2 text-[11px] text-muted-foreground">Tinggi batang relatif terhadap saldo terendah dan tertinggi tahun ini.</p>
            </FormCard>

            <FormCard title="Rincian per Bulan" description="Angka di balik grafik.">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground bg-muted">
                            <tr>
                                <th className="px-3 py-2 text-left">Bulan</th>
                                {jenis.map((j) => <th key={j.kode_simpanan} className="px-3 py-2 text-right">Setor {j.nama_simpanan.replace("Simpanan ", "")}</th>)}
                                <th className="px-3 py-2 text-right">Total Setor</th>
                                <th className="px-3 py-2 text-right">Total Ambil</th>
                                <th className="px-3 py-2 text-right">Saldo Akhir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {perBulan.map((b, i) => (
                                <tr key={i} className="border-t">
                                    <td className="px-3 py-1.5">{BULAN[i]}</td>
                                    {jenis.map((j) => <td key={j.kode_simpanan} className="px-3 py-1.5 text-right tabular-nums">{formatAngka(b.perJenis.find((x) => x.jenis === j.kode_simpanan)?.setor ?? 0)}</td>)}
                                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{formatAngka(b.setor)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(b.ambil)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(saldoBulan[i])}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </FormCard>
        </div>
    )
}
