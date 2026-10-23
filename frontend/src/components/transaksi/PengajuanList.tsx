"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Check, Loader2, Search, X } from "lucide-react"
import { putuskanPengajuanAction, type HasilPengajuan } from "@/app/actions/pengajuan"
import { Button } from "@/components/ui/button"
import { PilihBaris } from "@/components/ui/PilihBaris"
import type { PageData } from "@/config/modules"
import type { Pengajuan } from "@/lib/queries/keanggotaan"
import { formatRupiah, formatTanggal, formatAngka, formatAngka2 } from "@/lib/format"
import { FormCard, selectClass } from "./common"

const STATUS: Record<string, { label: string; cls: string }> = {
    P: { label: "Menunggu", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
    Y: { label: "Disetujui", cls: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" },
    N: { label: "Ditolak", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
}

const KOLOM: { key: string; label: string; kelas: string; urut?: boolean }[] = [
    { key: "tgl_realisasi", label: "Tanggal", kelas: "text-left", urut: true },
    { key: "nama", label: "Anggota", kelas: "text-left", urut: true },
    { key: "nama_kredit", label: "Jenis", kelas: "text-left", urut: true },
    { key: "rp_pinjaman_pokok", label: "Pokok", kelas: "text-right", urut: true },
    { key: "lama_angsuran", label: "Lama", kelas: "text-center", urut: true },
    { key: "persen_bunga", label: "Bunga", kelas: "text-right", urut: true },
    { key: "keterangan", label: "Keperluan", kelas: "text-left" },
    { key: "status", label: "Status", kelas: "text-center", urut: true },
]

const kolomInput = "h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"

export function PengajuanList({ data, jenis, bolehCair }: { data: PageData<Pengajuan>; jenis: { id: number; kode: string; nama: string }[]; bolehCair: boolean }) {
    const router = useRouter()
    const pathname = usePathname()
    const sp = useSearchParams()
    const [hasil, setHasil] = useState<HasilPengajuan | null>(null)
    const [sibuk, setSibuk] = useState<number | null>(null)
    const [isPending, startTransition] = useTransition()
    const [cari, setCari] = useState(sp.get("search") ?? "")
    const status = sp.get("status") ?? "P"
    const urutKey = sp.get("sortBy"), urutArah = sp.get("sortOrder")
    const adaFilter = !!(sp.get("search") || sp.get("jenis") || sp.get("dari") || sp.get("sampai") || sp.get("status") !== null && sp.get("status") !== "P")

    const ubah = (u: Record<string, string | number | null>) => {
        const params = new URLSearchParams(sp.toString())
        for (const [k, v] of Object.entries(u)) {
            if (v === null || v === "") params.delete(k); else params.set(k, String(v))
        }
        if (!("page" in u)) params.delete("page") // filter/urutan berubah: kembali ke halaman 1
        startTransition(() => router.push(`${pathname}?${params.toString()}`))
    }
    // Status "Menunggu" adalah bawaan (tanpa parameter); "Semua" ditulis status= kosong.
    const ubahStatus = (v: string) => ubah({ status: v === "P" ? null : v === "" ? "" : v })
    const urut = (key: string) => ubah({ sortBy: key, sortOrder: urutKey === key && urutArah === "asc" ? "desc" : "asc" })

    const putuskan = (p: Pengajuan, setuju: boolean) => {
        if (!confirm(`${setuju ? "Setujui" : "Tolak"} pengajuan ${p.nama} sebesar ${formatRupiah(p.rp_pinjaman_pokok)}?`)) return
        setSibuk(p.id)
        startTransition(async () => {
            setHasil(await putuskanPengajuanAction(p.id, setuju))
            setSibuk(null)
            router.refresh()
        })
    }

    const dari = Math.min(data.total, (data.page - 1) * data.pageSize + 1)
    const sampai = Math.min(data.total, data.page * data.pageSize)

    return (
        <FormCard title="Pengajuan Kredit" description="Pengajuan pinjaman dari aplikasi anggota. Setujui atau tolak; pengajuan yang disetujui dicairkan di form pencairan.">
            <div className="space-y-3">
                <div className="flex flex-wrap items-end gap-2 print:hidden">
                    <form className="relative w-full md:w-[300px]" onSubmit={(e) => { e.preventDefault(); ubah({ search: cari.trim() }) }}>
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input type="search" value={cari} onChange={(e) => setCari(e.target.value)} aria-label="Cari pengajuan"
                            placeholder="KPK, nama, kode anggota, atau NIK"
                            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </form>
                    <select aria-label="Status" className={`${selectClass} w-40`} value={status} onChange={(e) => ubahStatus(e.target.value)}>
                        <option value="P">Menunggu</option>
                        <option value="Y">Disetujui</option>
                        <option value="N">Ditolak</option>
                        <option value="">Semua status</option>
                    </select>
                    <select aria-label="Jenis kredit" className={`${selectClass} w-56`} value={sp.get("jenis") ?? ""} onChange={(e) => ubah({ jenis: e.target.value })}>
                        <option value="">Semua jenis kredit</option>
                        {jenis.map((j) => <option key={j.id} value={j.id}>{j.nama}</option>)}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Realisasi
                        <input type="date" aria-label="Tanggal realisasi dari" className={kolomInput} value={sp.get("dari") ?? ""} onChange={(e) => ubah({ dari: e.target.value })} />
                        s/d
                        <input type="date" aria-label="Tanggal realisasi sampai" className={kolomInput} value={sp.get("sampai") ?? ""} onChange={(e) => ubah({ sampai: e.target.value })} />
                    </label>
                    {adaFilter && (
                        <Button type="button" variant="ghost" size="sm" className="h-9 text-muted-foreground"
                            onClick={() => { setCari(""); startTransition(() => router.push(pathname)) }}>
                            <X className="mr-1 h-4 w-4" /> Atur ulang
                        </Button>
                    )}
                    {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {hasil && (
                    <div role={hasil.ok ? "status" : "alert"} className={`rounded-md border p-2.5 text-sm ${hasil.ok
                        ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-500/10" : "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10"}`}>
                        {hasil.ok ? hasil.pesan : hasil.error}
                    </div>
                )}
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr>
                                {KOLOM.map((k) => (
                                    <th key={k.key} className={`px-3 py-2 ${k.kelas}`} aria-sort={urutKey === k.key ? (urutArah === "desc" ? "descending" : "ascending") : undefined}>
                                        {k.urut ? (
                                            <button type="button" onClick={() => urut(k.key)} className="inline-flex items-center gap-1 font-semibold hover:text-foreground print:pointer-events-none">
                                                {k.label}
                                                {urutKey === k.key && (urutArah === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                                            </button>
                                        ) : k.label}
                                    </th>
                                ))}
                                <th className="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Tidak ada pengajuan{adaFilter ? " yang cocok dengan pencarian" : ""}.</td></tr>}
                            {data.items.map((p) => (
                                <tr key={p.id} className="border-t hover:bg-muted/30">
                                    <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(p.tgl_realisasi)}</td>
                                    <td className="px-3 py-2">
                                        <div className="font-medium">{p.nama}</div>
                                        <div className="text-[11px] text-muted-foreground font-mono">{p.kd_anggota} | KPK {p.nik ?? "-"}</div>
                                    </td>
                                    <td className="px-3 py-2">{p.kd_kredit} {p.nama_kredit}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatRupiah(p.rp_pinjaman_pokok)}</td>
                                    <td className="px-3 py-2 text-center">{p.lama_angsuran}x</td>
                                    <td className="px-3 py-2 text-right">{formatAngka2(p.persen_bunga)}%</td>
                                    <td className="px-3 py-2 max-w-[16rem] truncate" title={p.keterangan ?? ""}>{p.keterangan}</td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS[p.status]?.cls ?? ""}`}>{STATUS[p.status]?.label ?? p.status}</span>
                                    </td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap">
                                        {p.status === "P" && (sibuk === p.id ? <Loader2 className="h-4 w-4 animate-spin inline" /> : (
                                            <>
                                                <button type="button" onClick={() => putuskan(p, true)} disabled={sibuk !== null}
                                                    className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline mr-3"><Check className="h-3.5 w-3.5" />Setujui</button>
                                                <button type="button" onClick={() => putuskan(p, false)} disabled={sibuk !== null}
                                                    className="inline-flex items-center gap-1 text-xs text-red-700 hover:underline"><X className="h-3.5 w-3.5" />Tolak</button>
                                            </>
                                        ))}
                                        {p.status === "Y" && bolehCair && (
                                            <Link href={`/dashboard/loans/create-cash?pengajuan=${p.id}`} className="text-xs text-primary hover:underline">Cairkan</Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <PilihBaris pageSize={data.pageSize} total={data.total} disabled={isPending} onUbah={(v) => ubah({ pageSize: v, page: 1 })} />
                        <div className="text-xs text-muted-foreground">
                            {data.total === 0 ? "Tidak ada data" : <>Menampilkan <span className="font-semibold">{formatAngka(dari)}</span> - <span className="font-semibold">{formatAngka(sampai)}</span> dari <span className="font-semibold">{formatAngka(data.total)}</span> pengajuan</>}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Halaman sebelumnya" disabled={data.page <= 1 || isPending} onClick={() => ubah({ page: data.page - 1 })}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-semibold px-2">Halaman {formatAngka(data.page)} dari {formatAngka(data.totalPages)}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Halaman berikutnya" disabled={data.page >= data.totalPages || isPending} onClick={() => ubah({ page: data.page + 1 })}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </FormCard>
    )
}
