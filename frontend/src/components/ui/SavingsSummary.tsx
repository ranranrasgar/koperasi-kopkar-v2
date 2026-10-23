"use client"

import React, { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Loader2, Search, ChevronLeft, ChevronRight, ArrowUpDown, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { PilihBaris } from "@/components/ui/PilihBaris"
import type { PageData } from "@/config/modules"
import { formatAngka } from "@/lib/format"

type Totals = {
    Setoran_Pokok: number; Ambil_Pokok: number; Saldo_Pokok: number
    Setoran_Wajib: number; Ambil_Wajib: number; Saldo_Wajib: number
    Setoran_Sukarela: number; Ambil_Sukarela: number; Saldo_Sukarela: number
    Setoran_Khusus: number; Ambil_Khusus: number; Saldo_Khusus: number
    Saldo_Total: number
}
type Row = Totals & { kode_agt: string; nama: string; nik: string | null; status_staff: string | null }

const JENIS = ["Pokok", "Wajib", "Sukarela", "Khusus"] as const

export function SavingsSummary({ data, grandTotal, endDate }: { data: PageData<Row>; grandTotal: Totals; endDate: string }) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [loading, startTransition] = useTransition()
    const [search, setSearch] = useState(searchParams.get("search") ?? "")

    const sortBy = searchParams.get("sortBy") ?? "NAMA"
    const sortOrder = searchParams.get("sortOrder") ?? "asc"
    const hideZero = searchParams.get("hideZero") !== "0"

    const update = (updates: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString())
        for (const [k, v] of Object.entries(updates)) {
            if (v === null || v === "") params.delete(k)
            else params.set(k, String(v))
        }
        if (!("page" in updates)) params.delete("page")
        startTransition(() => router.push(`${pathname}?${params.toString()}`))
    }

    const handleSort = (column: string) =>
        update({ sortBy: column, sortOrder: sortBy === column && sortOrder === "asc" ? "desc" : "asc" })

    const pageTotals = data.items.reduce((acc, row) => {
        for (const k of Object.keys(acc) as (keyof Totals)[]) acc[k] += row[k] || 0
        return acc
    }, Object.fromEntries(Object.keys(grandTotal).map((k) => [k, 0])) as Totals)

    const SortableHeader = ({ column, label, align = "left" }: { column: string; label: string; align?: "left" | "right" }) => (
        <th className={`border p-2 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>
            <div
                className={`flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors select-none ${align === "right" ? "justify-end" : "justify-start"}`}
                onClick={() => handleSort(column)}
            >
                <span>{label}</span>
                <ArrowUpDown className={`h-3 w-3 ${sortBy === column ? "text-foreground" : "opacity-30"}`} />
            </div>
        </th>
    )

    const TotalRow = ({ label, t }: { label: string; t: Totals }) => (
        <tr className="bg-muted font-semibold">
            <td className="border p-3 text-center"></td>
            <td colSpan={3} className="border p-3 text-right">{label}</td>
            {JENIS.map((j) => (
                <React.Fragment key={j}>
                    <td className="border p-2 text-right">{formatAngka(t[`Setoran_${j}`])}</td>
                    <td className="border p-2 text-right">{formatAngka(t[`Ambil_${j}`])}</td>
                    <td className="border p-2 text-right bg-muted/50">{formatAngka(t[`Saldo_${j}`])}</td>
                </React.Fragment>
            ))}
            <td className="border p-2 text-right bg-muted/80">{formatAngka(t.Saldo_Total)}</td>
        </tr>
    )

    return (
        <div className="max-w-full overflow-x-hidden space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Rekap Simpanan Anggota</h1>
                    <p className="text-sm text-muted-foreground">Setoran, pengambilan, dan saldo per jenis simpanan untuk anggota aktif.</p>
                </div>
                <div className="flex gap-2 print:hidden">
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" /> Cetak
                    </Button>
                </div>
            </div>

            <Card className="rounded-md border shadow-sm flex flex-col py-0 gap-0">
                <div className="p-4 border-b bg-muted/10 print:hidden">
                    <form className="flex flex-wrap gap-4 items-end" onSubmit={(e) => { e.preventDefault(); update({ search }) }}>
                        <div className="space-y-1">
                            <Label htmlFor="endDate">S/d Tanggal</Label>
                            <Input id="endDate" type="date" value={endDate} onChange={(e) => update({ endDate: e.target.value })} className="w-[160px]" />
                        </div>
                        <div className="space-y-1 flex-1 min-w-[200px]">
                            <Label htmlFor="cari">No. KPK/Nama</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input id="cari" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="staff">Status Staff</Label>
                            <select id="staff" className="h-9 w-[150px] border border-input rounded-md px-3 text-sm bg-background"
                                value={searchParams.get("status_staff") ?? "ALL"} onChange={(e) => update({ status_staff: e.target.value === "ALL" ? null : e.target.value })}>
                                <option value="ALL">Semua</option>
                                <option value="Staff">Staff</option>
                                <option value="No Staff">Non Staff</option>
                            </select>
                        </div>
                        <label className="flex items-center space-x-2 h-9 border rounded-md px-3 border-input bg-background text-sm cursor-pointer">
                            <input type="checkbox" checked={hideZero} onChange={(e) => update({ hideZero: e.target.checked ? null : "0" })} className="w-4 h-4" />
                            <span>Sembunyikan Saldo 0</span>
                        </label>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Cari
                        </Button>
                    </form>
                </div>

                <div className="overflow-x-auto relative">
                    {loading && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    )}
                    <table className="w-full text-sm">
                        <thead className="bg-muted/70 text-muted-foreground sticky top-0 z-10">
                            <tr>
                                <th rowSpan={2} className="border p-2 text-center font-semibold w-12">No.</th>
                                <th colSpan={3} className="border p-2 text-center border-b-2 font-semibold">Anggota</th>
                                {JENIS.map((j) => <th key={j} colSpan={3} className="border p-2 text-center border-b-2 font-semibold">Simpanan {j}</th>)}
                                <th className="border p-2 text-center border-b-2 font-semibold">Grand Total</th>
                            </tr>
                            <tr className="text-sm uppercase bg-muted/90 text-zinc-600 dark:text-zinc-400">
                                <SortableHeader column="KPK" label="KPK" />
                                <SortableHeader column="NAMA" label="NAMA" />
                                <th className="border p-2 text-left font-semibold">STAFF</th>
                                {JENIS.map((j) => (
                                    <React.Fragment key={j}>
                                        <SortableHeader column={`Setoran_${j}`} label="SETOR" align="right" />
                                        <SortableHeader column={`Ambil_${j}`} label="TARIK" align="right" />
                                        <SortableHeader column={`Saldo_${j}`} label="SALDO" align="right" />
                                    </React.Fragment>
                                ))}
                                <SortableHeader column="Saldo_Total" label="JUMLAH SALDO" align="right" />
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.length === 0 ? (
                                <tr>
                                    <td colSpan={17} className="p-12 text-center text-muted-foreground bg-background">
                                        Tidak ada data ditemukan untuk kriteria pencarian tersebut.
                                    </td>
                                </tr>
                            ) : data.items.map((row, idx) => (
                                <tr key={row.kode_agt} className="hover:bg-muted/30 border-b bg-background transition-colors">
                                    <td className="border-x p-2 text-center text-muted-foreground">{(data.page - 1) * data.pageSize + idx + 1}</td>
                                    <td className="border-x p-2">{row.nik}</td>
                                    <td className="border-x p-2">
                                        <div className="font-medium">{row.nama}</div>
                                        <div className="text-[11px] text-muted-foreground">{row.kode_agt}</div>
                                    </td>
                                    <td className="border-x p-2 text-xs">{row.status_staff}</td>
                                    {JENIS.map((j) => (
                                        <React.Fragment key={j}>
                                            <td className="border-x p-2 text-right">{formatAngka(row[`Setoran_${j}`])}</td>
                                            <td className="border-x p-2 text-right">{formatAngka(row[`Ambil_${j}`])}</td>
                                            <td className="border-x p-2 text-right bg-muted/10">{formatAngka(row[`Saldo_${j}`])}</td>
                                        </React.Fragment>
                                    ))}
                                    <td className="border-x p-2 text-right font-semibold bg-muted/20">{formatAngka(row.Saldo_Total)}</td>
                                </tr>
                            ))}
                        </tbody>
                        {data.items.length > 0 && (
                            <tfoot className="bg-muted/80 font-bold">
                                <TotalRow label="SUBTOTAL HALAMAN INI:" t={pageTotals} />
                                <TotalRow label="TOTAL SEMUA DATA:" t={grandTotal} />
                            </tfoot>
                        )}
                    </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t print:hidden">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <PilihBaris pageSize={data.pageSize} total={data.total} disabled={loading} onUbah={(v) => update({ pageSize: v })} />
                        <div className="text-sm text-muted-foreground">
                            Menampilkan {data.items.length > 0 ? formatAngka((data.page - 1) * data.pageSize + 1) : 0} - {formatAngka(Math.min(data.page * data.pageSize, data.total))} dari {formatAngka(data.total)} data
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" disabled={data.page === 1 || loading} onClick={() => update({ page: data.page - 1 })}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                        </Button>
                        <div className="text-sm font-medium">Hal {data.page} / {data.totalPages}</div>
                        <Button variant="outline" size="sm" disabled={data.page >= data.totalPages || loading} onClick={() => update({ page: data.page + 1 })}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}
