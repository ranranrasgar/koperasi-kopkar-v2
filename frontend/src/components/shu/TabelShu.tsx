"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowDown, ArrowUp, Download, Loader2, Printer, Search } from "lucide-react"
import { dataCetakAction } from "@/app/actions/cetak"
import { TombolVoucher } from "@/components/akuntansi/AksiJurnal"
import { TombolBatal, TombolCairkan } from "@/components/shu/ShuAksi"
import type { Akun } from "@/components/transaksi/common"
import { Paginasi } from "@/components/ui/Paginasi"
import { Button } from "@/components/ui/button"
import { bukaCetak, tabelHtml, type KolomTabel } from "@/lib/cetak-klien"
import { formatAngka, formatAngka2, formatTanggal } from "@/lib/format"
import type { BarisShu } from "@/lib/queries/shu"

interface Data { items: BarisShu[]; total: number; page: number; pageSize: number; totalPages: number; jumlah: { rp_sukarela: number; rp_jasa_uang: number; rp_jasa_barang: number; rp_bagian: number } }

const KOLOM: { key: string; label: string; kanan?: boolean }[] = [
    { key: "nama", label: "Anggota" }, { key: "lama_agt", label: "Lama (bln)", kanan: true }, { key: "rp_sukarela", label: "Saldo Sukarela", kanan: true },
    { key: "rp_jasa_uang", label: "Jasa Uang", kanan: true }, { key: "rp_jasa_barang", label: "Jasa Barang", kanan: true }, { key: "rp_bagian", label: "SHU Anggota", kanan: true },
    { key: "status", label: "Status" },
]

const statusTeks = (a: BarisShu) => (a.status === 1 ? `Dicairkan${a.cara === "sukarela" ? " ke sukarela" : ""}` : "Belum diambil")

/** SHU anggota satu tahun: cari, saring status, urut, halaman, Cetak dan Ekspor seluruh hasil saring, serta aksi cairkan, batal, dan voucher per baris. */
export function TabelShu({ data, tahun, statusTahun, akunKas, hariIni, bolehCair, admin }: {
    data: Data; tahun: number; statusTahun: string; akunKas: Akun[]; hariIni: string; bolehCair: boolean; admin: boolean
}) {
    const router = useRouter(), pathname = usePathname(), sp = useSearchParams()
    const [isPending, mulai] = useTransition()
    const [cari, setCari] = useState(sp.get("q") ?? "")
    const [mencetak, setMencetak] = useState(false)
    const ubah = (u: Record<string, string | number | null>) => {
        const p = new URLSearchParams(sp.toString())
        for (const [k, v] of Object.entries(u)) { if (v === null || v === "") p.delete(k); else p.set(k, String(v)) }
        mulai(() => router.push(`${pathname}?${p.toString()}`))
    }
    const urutKey = sp.get("sortBy") ?? "nama", urutArah = sp.get("sortOrder") ?? "asc"
    const urut = (k: string) => ubah({ sortBy: k, sortOrder: urutKey === k && urutArah === "asc" ? "desc" : "asc", page: 1 })

    const semua = async () => {
        const r = await dataCetakAction("/dashboard/shu", { ...Object.fromEntries(sp.entries()), tahun: String(tahun) })
        return "error" in r ? (alert(r.error), null) : r
    }
    const baris = (items: BarisShu[]) => items.map((a) => [a.kode_agt, a.nik ?? "-", a.nama, a.status_staff ?? "-", String(a.lama_agt), formatAngka(a.rp_sukarela),
        formatAngka(a.rp_jasa_uang), formatAngka(a.rp_jasa_barang), formatAngka2(a.rp_bagian), statusTeks(a), a.no_reff ?? ""])
    const cetak = async () => {
        setMencetak(true)
        try {
            const r = await semua()
            if (!r) return
            const items = r.items as unknown as BarisShu[]
            const kolom: KolomTabel[] = [{ label: "Kode", mono: true }, { label: "KPK", mono: true }, { label: "Nama" }, { label: "Staff", tengah: true }, { label: "Lama (bln)", kanan: true },
                { label: "Saldo Sukarela", kanan: true }, { label: "Jasa Uang", kanan: true }, { label: "Jasa Barang", kanan: true }, { label: "SHU Anggota", kanan: true }, { label: "Status" }, { label: "No. Ref", mono: true }]
            const j = (f: (a: BarisShu) => number) => items.reduce((t, a) => t + f(a), 0)
            const total = ["", "", `Total (${items.length.toLocaleString("id-ID")} anggota)`, "", "", formatAngka(j((a) => a.rp_sukarela)), formatAngka(j((a) => a.rp_jasa_uang)),
                formatAngka(j((a) => a.rp_jasa_barang)), formatAngka2(j((a) => a.rp_bagian)), "", ""]
            const sub = [`Tahun buku ${tahun}`, sp.get("q") ? `Pencarian: ${sp.get("q")}` : "", sp.get("status") === "0" ? "Belum diambil" : sp.get("status") === "1" ? "Sudah dicairkan" : ""].filter(Boolean).join(" · ")
            const galat = await bukaCetak({ judul: "SHU Anggota", subjudul: sub, isi: tabelHtml(kolom, baris(items), r.total, { total }) })
            if (galat) alert(galat)
        } finally { setMencetak(false) }
    }
    const ekspor = async () => {
        const r = await semua()
        if (!r) return
        const kepala = ["Kode", "KPK", "Nama", "Staff", "Lama (bln)", "Saldo Sukarela", "Jasa Uang", "Jasa Barang", "SHU Anggota", "Status", "No. Ref"]
        const csv = [kepala, ...baris(r.items as unknown as BarisShu[])].map((x) => x.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
        const a = document.createElement("a")
        a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
        a.download = `shu-anggota_${tahun}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
    }
    const dapatDicairkan = statusTahun === "posting" && bolehCair

    return (
        <div className="rounded-lg border border-outline-variant bg-background shadow-sm overflow-clip">
            <div className="p-3 border-b flex flex-wrap items-center gap-2 print:hidden">
                <form className="relative w-full md:w-[260px]" onSubmit={(e) => { e.preventDefault(); ubah({ q: cari, page: 1 }) }}>
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input type="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode, KPK, atau nama"
                        className="w-full pl-9 pr-3 h-9 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-background" />
                </form>
                <select value={sp.get("status") ?? ""} onChange={(e) => ubah({ status: e.target.value, page: 1 })} aria-label="Status pencairan"
                    className="h-9 border rounded-md px-3 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">Semua status</option><option value="0">Belum diambil</option><option value="1">Sudah dicairkan</option>
                </select>
                <div className="ml-auto flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-9 font-medium shadow-sm" onClick={cetak} disabled={mencetak || data.total === 0}>
                        {mencetak ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />} Cetak
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-9 font-medium shadow-sm" onClick={ekspor} disabled={data.total === 0}>
                        <Download className="mr-1.5 h-4 w-4" /> Ekspor
                    </Button>
                </div>
            </div>
            <div className={`overflow-x-auto ${isPending ? "opacity-60" : ""}`}>
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/40 text-muted-foreground">
                        <tr className="border-b font-bold">
                            <th className="px-3 py-3 w-10 text-center">No.</th>
                            {KOLOM.map((k) => (
                                <th key={k.key} className={`px-3 py-3 ${k.kanan ? "text-right" : ""}`}>
                                    <button type="button" onClick={() => urut(k.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                                        {k.label}{urutKey === k.key && (urutArah === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                                    </button>
                                </th>
                            ))}
                            <th className="px-3 py-3">No. Ref</th>
                            <th className="px-3 py-3 print:hidden"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.length === 0 && <tr><td colSpan={KOLOM.length + 3} className="p-10 text-center text-muted-foreground">Tidak ada data SHU yang cocok.</td></tr>}
                        {data.items.map((a, i) => (
                            <tr key={a.kode_agt} className="border-b hover:bg-muted/30">
                                <td className="px-3 py-2 text-center text-muted-foreground">{(data.page - 1) * data.pageSize + i + 1}</td>
                                <td className="px-3 py-2">
                                    <div className="font-medium">{a.nama}</div>
                                    <div className="text-[11px] text-muted-foreground font-mono">{a.kode_agt} | KPK {a.nik ?? "-"} | {a.status_staff ?? "-"}</div>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{a.lama_agt}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatAngka(a.rp_sukarela)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatAngka(a.rp_jasa_uang)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatAngka(a.rp_jasa_barang)}</td>
                                <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatAngka2(a.rp_bagian)}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${a.status === 1 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{statusTeks(a)}</span>
                                    {a.tgl_cair && <div className="text-[11px] text-muted-foreground">{formatTanggal(a.tgl_cair)}</div>}
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">{a.no_reff}</td>
                                <td className="px-2 py-1 whitespace-nowrap text-right print:hidden">
                                    {a.status === 0 && dapatDicairkan && a.rp_bagian >= 0.005 && (
                                        <TombolCairkan tahun={tahun} kodeAgt={a.kode_agt} nama={a.nama} jumlah={formatAngka2(a.rp_bagian)} akunKas={akunKas} hariIni={hariIni} />
                                    )}
                                    {a.status === 1 && a.no_reff && (
                                        <span className="inline-flex items-center">
                                            <TombolVoucher nomorBukti={a.no_reff} />
                                            {admin && bolehCair && <TombolBatal tahun={tahun} kodeAgt={a.kode_agt} nama={a.nama} />}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {data.total > 0 && (
                        <tfoot className="border-t-2 bg-muted/40 font-semibold">
                            <tr>
                                <td colSpan={3} className="px-3 py-2.5 text-right">Total seluruh hasil saring ({formatAngka(data.total)} anggota)</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{formatAngka(data.jumlah.rp_sukarela)}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{formatAngka(data.jumlah.rp_jasa_uang)}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{formatAngka(data.jumlah.rp_jasa_barang)}</td>
                                <td className="px-3 py-2.5 text-right tabular-nums">{formatAngka2(data.jumlah.rp_bagian)}</td>
                                <td colSpan={3}></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <Paginasi page={data.page} totalPages={data.totalPages} pageSize={data.pageSize} total={data.total} disabled={isPending}
                onHalaman={(p) => ubah({ page: p })} onBaris={(v) => ubah({ pageSize: v, page: 1 })} className="border-t" />
        </div>
    )
}
