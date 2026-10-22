"use client"

import React, { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { CheckCircle2, AlertCircle, Loader2, Search, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { cariAnggotaAction, type Hasil } from "@/app/actions/transaksi"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import { formatRupiah, formatTanggal } from "@/lib/format"
import { cn } from "@/lib/utils"

export const selectClass =
    "flex h-9 w-full rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"

export interface Akun { id: number; kode_perkiraan: string; nama_perkiraan: string }

export function Field({ label, htmlFor, children, hint, className }: {
    label: string; htmlFor?: string; children: React.ReactNode; hint?: React.ReactNode; className?: string
}) {
    return (
        <div className={cn("space-y-1.5", className)}>
            <Label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">{label}</Label>
            {children}
            {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
        </div>
    )
}

export function KasSelect({ akun, name = "kas", defaultValue }: { akun: Akun[]; name?: string; defaultValue?: number }) {
    return (
        <select id={name} name={name} required className={selectClass} defaultValue={defaultValue ?? akun[0]?.id}>
            {akun.map((a) => <option key={a.id} value={a.id}>{a.kode_perkiraan} {a.nama_perkiraan}</option>)}
        </select>
    )
}

export function FormCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <Card className="shadow-sm border">
            <CardHeader>
                <CardTitle className="text-lg font-bold">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

/** Hasil posting: kartu hijau dengan rincian, atau pesan galat dari mesin posting. */
export function HasilTransaksi({ hasil }: { hasil: Hasil }) {
    if (!hasil) return null
    if (!hasil.ok) {
        return (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/40 p-3 text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{hasil.error}</span>
            </div>
        )
    }
    return (
        <div role="status" className="rounded-md border border-green-300 bg-green-50 dark:bg-green-500/10 dark:border-green-500/40 p-3 text-sm">
            <div className="flex items-center gap-2 font-semibold text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" /> {hasil.pesan}
            </div>
            {hasil.rincian && (
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {Object.entries(hasil.rincian).map(([k, v]) => (
                        <React.Fragment key={k}>
                            <dt className="text-muted-foreground">{k}</dt>
                            <dd className="font-semibold tabular-nums">{typeof v === "number" ? formatRupiah(v) : v}</dd>
                        </React.Fragment>
                    ))}
                </dl>
            )}
            {hasil.jadwal && <JadwalTable jadwal={hasil.jadwal} />}
        </div>
    )
}

export function JadwalTable({ jadwal }: { jadwal: { ke: number; tanggal: string; pokok: number; jasa: number; adm?: number; provisi?: number }[] }) {
    const adaBiaya = jadwal.some((j) => (j.adm ?? 0) > 0 || (j.provisi ?? 0) > 0)
    return (
        <div className="mt-3 max-h-72 overflow-auto rounded border bg-background">
            <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted text-muted-foreground">
                    <tr>
                        <th className="px-2 py-1.5 text-center">Ke</th>
                        <th className="px-2 py-1.5 text-left">Jatuh Tempo</th>
                        <th className="px-2 py-1.5 text-right">Pokok</th>
                        <th className="px-2 py-1.5 text-right">Jasa</th>
                        {adaBiaya && <th className="px-2 py-1.5 text-right">Adm + Provisi</th>}
                        <th className="px-2 py-1.5 text-right">Jumlah</th>
                    </tr>
                </thead>
                <tbody>
                    {jadwal.map((j) => (
                        <tr key={j.ke} className="border-t">
                            <td className="px-2 py-1 text-center">{j.ke}</td>
                            <td className="px-2 py-1">{formatTanggal(j.tanggal)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{formatRupiah(j.pokok)}</td>
                            <td className="px-2 py-1 text-right tabular-nums">{formatRupiah(j.jasa)}</td>
                            {adaBiaya && <td className="px-2 py-1 text-right tabular-nums">{formatRupiah((j.adm ?? 0) + (j.provisi ?? 0))}</td>}
                            <td className="px-2 py-1 text-right tabular-nums font-semibold">{formatRupiah(j.pokok + j.jasa + (j.adm ?? 0) + (j.provisi ?? 0))}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

/** Pencarian anggota (kode, KPK, atau nama); nilai terpilih dikirim lewat input tersembunyi `kodeAgt`. */
export function AnggotaPicker({ value, onChange }: { value: AnggotaRingkas | null; onChange: (a: AnggotaRingkas | null) => void }) {
    const [kata, setKata] = useState("")
    const [hasil, setHasil] = useState<AnggotaRingkas[]>([])
    const [buka, setBuka] = useState(false)
    const [memuat, startTransition] = useTransition()
    const urut = useRef(0)

    useEffect(() => {
        if (kata.trim().length < 2) return
        const n = ++urut.current
        const t = setTimeout(() => startTransition(async () => {
            const r = await cariAnggotaAction(kata)
            if (n === urut.current) { setHasil(r); setBuka(true) }
        }), 250)
        return () => clearTimeout(t)
    }, [kata])

    if (value) {
        return (
            <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
                <input type="hidden" name="kodeAgt" value={value.kode_agt} />
                <div>
                    <div className="font-semibold text-sm">{value.nama}</div>
                    <div className="text-xs text-muted-foreground font-mono">{value.kode_agt} | KPK {value.nik ?? "-"}</div>
                </div>
                <button type="button" onClick={() => { onChange(null); setKata("") }} className="p-1 rounded hover:bg-muted" title="Ganti anggota">
                    <X className="h-4 w-4" />
                </button>
            </div>
        )
    }
    return (
        <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
                id="anggota" autoComplete="off" value={kata} onChange={(e) => setKata(e.target.value)} onFocus={() => hasil.length && setBuka(true)}
                placeholder="Ketik kode anggota, KPK, atau nama (min. 2 huruf)"
                className="flex h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {memuat && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
            {buka && kata.trim().length >= 2 && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover shadow-lg">
                    {hasil.length === 0 ? (
                        <li className="px-3 py-2 text-sm text-muted-foreground">Anggota aktif tidak ditemukan</li>
                    ) : hasil.map((a) => (
                        <li key={a.kode_agt}>
                            <button type="button" className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                                onClick={() => { onChange(a); setBuka(false) }}>
                                <span className="font-semibold">{a.nama}</span>
                                <span className="ml-2 text-xs text-muted-foreground font-mono">{a.kode_agt} | {a.nik ?? "-"}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export function SubmitButton({ pending, disabled, children }: { pending: boolean; disabled?: boolean; children: React.ReactNode }) {
    return (
        <button type="submit" disabled={pending || disabled}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {children}
        </button>
    )
}

/**
 * Kirim form ke server action tanpa reset otomatis React 19 (form action mengosongkan semua isian,
 * termasuk saat posting ditolak). Isian dikosongkan sendiri oleh form setelah berhasil.
 */
export function useAksiForm(aksi: (prev: Hasil, f: FormData) => Promise<Hasil>) {
    const [hasil, jalankan, pending] = useActionState<Hasil, FormData>(aksi, null)
    const [, startTransition] = useTransition()
    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        startTransition(() => jalankan(data))
    }
    return { hasil, onSubmit, pending }
}
