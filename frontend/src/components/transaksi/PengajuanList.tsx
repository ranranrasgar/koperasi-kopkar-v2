"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"
import { putuskanPengajuanAction, type HasilPengajuan } from "@/app/actions/pengajuan"
import type { Pengajuan } from "@/lib/queries/keanggotaan"
import { formatRupiah, formatTanggal, formatAngka2 } from "@/lib/format"
import { FormCard, selectClass } from "./common"

const STATUS: Record<string, { label: string; cls: string }> = {
    P: { label: "Menunggu", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
    Y: { label: "Disetujui", cls: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" },
    N: { label: "Ditolak", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
}

export function PengajuanList({ data, bolehCair }: { data: Pengajuan[]; bolehCair: boolean }) {
    const router = useRouter()
    const sp = useSearchParams()
    const [hasil, setHasil] = useState<HasilPengajuan | null>(null)
    const [sibuk, setSibuk] = useState<number | null>(null)
    const [, startTransition] = useTransition()
    const status = sp.get("status") ?? "P"

    const putuskan = (p: Pengajuan, setuju: boolean) => {
        if (!confirm(`${setuju ? "Setujui" : "Tolak"} pengajuan ${p.nama} sebesar ${formatRupiah(p.rp_pinjaman_pokok)}?`)) return
        setSibuk(p.id)
        startTransition(async () => {
            setHasil(await putuskanPengajuanAction(p.id, setuju))
            setSibuk(null)
            router.refresh()
        })
    }

    return (
        <FormCard title="Pengajuan Kredit" description="Pengajuan pinjaman dari aplikasi mobile. Setujui atau tolak; pengajuan yang disetujui dicairkan di form pencairan.">
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <select aria-label="Status" className={`${selectClass} w-48`} value={status}
                        onChange={(e) => router.push(`?status=${e.target.value}`)}>
                        <option value="P">Menunggu</option>
                        <option value="Y">Disetujui</option>
                        <option value="N">Ditolak</option>
                        <option value="">Semua</option>
                    </select>
                    <span className="text-sm text-muted-foreground">{data.length} pengajuan{data.length === 300 ? " (300 terbaru)" : ""}</span>
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
                                <th className="px-3 py-2 text-left">Tanggal</th>
                                <th className="px-3 py-2 text-left">Anggota</th>
                                <th className="px-3 py-2 text-left">Jenis</th>
                                <th className="px-3 py-2 text-right">Pokok</th>
                                <th className="px-3 py-2 text-center">Lama</th>
                                <th className="px-3 py-2 text-right">Bunga</th>
                                <th className="px-3 py-2 text-left">Keperluan</th>
                                <th className="px-3 py-2 text-center">Status</th>
                                <th className="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Tidak ada pengajuan.</td></tr>}
                            {data.map((p) => (
                                <tr key={p.id} className="border-t hover:bg-muted/30">
                                    <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(p.tgl_realisasi)}</td>
                                    <td className="px-3 py-2">
                                        <div className="font-medium">{p.nama}</div>
                                        <div className="text-[11px] text-muted-foreground font-mono">{p.kd_anggota} | {p.nik ?? "-"}</div>
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
            </div>
        </FormCard>
    )
}
