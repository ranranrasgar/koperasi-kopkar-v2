import Link from "next/link"
import { Minus, Plus } from "lucide-react"
import { FormCard } from "@/components/transaksi/common"
import { rekapBerjangka } from "@/lib/queries/simpanan-lap"
import { formatAngka, formatTanggal } from "@/lib/format"
import { MENU } from "@/config/akses"
import { wajibIzin } from "@/lib/operator"

export default async function SimpananBerjangkaPage() {
    const o = await wajibIzin("/dashboard/savings/time-deposits") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const data = await rekapBerjangka()
    const total = data.reduce((s, r) => s + r.saldo, 0)
    return (
        <FormCard title="Simpanan Berjangka" description="Saldo simpanan berjangka (jenis 05) per anggota. Setoran dan pengambilan memakai form simpanan dengan jenis Berjangka.">
            <div className="space-y-3">
                <div className="flex justify-end gap-2">
                    {o.izin.includes(MENU.pencairanSimpanan) && (
                        <Link href="/dashboard/savings/withdraw?jenis=05" className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border text-sm hover:bg-muted">
                            <Minus className="h-4 w-4" /> Pengambilan
                        </Link>
                    )}
                    {o.izin.includes(MENU.setoranSimpanan) && (
                        <Link href="/dashboard/savings/deposit?jenis=05" className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                            <Plus className="h-4 w-4" /> Setoran Berjangka
                        </Link>
                    )}
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr>
                                <th className="px-3 py-2 text-left">Anggota</th>
                                <th className="px-3 py-2 text-right">Setor</th>
                                <th className="px-3 py-2 text-right">Ambil</th>
                                <th className="px-3 py-2 text-right">Saldo</th>
                                <th className="px-3 py-2 text-left">Transaksi Terakhir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 && (
                                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Belum ada transaksi simpanan berjangka.</td></tr>
                            )}
                            {data.map((r) => (
                                <tr key={r.kode_agt} className="border-t">
                                    <td className="px-3 py-2">
                                        <Link href={`/dashboard/savings/cards?kode=${encodeURIComponent(r.kode_agt)}`} className="font-medium hover:underline">{r.nama}</Link>
                                        <div className="text-[11px] text-muted-foreground font-mono">{r.kode_agt} | {r.nik ?? "-"}</div>
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(r.setor)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(r.ambil)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatAngka(r.saldo)}</td>
                                    <td className="px-3 py-2">{formatTanggal(r.terakhir)}</td>
                                </tr>
                            ))}
                        </tbody>
                        {data.length > 0 && (
                            <tfoot className="bg-muted/50 font-semibold">
                                <tr><td className="px-3 py-2">Total</td><td colSpan={2}></td><td className="px-3 py-2 text-right tabular-nums">{formatAngka(total)}</td><td></td></tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </FormCard>
    )
}
