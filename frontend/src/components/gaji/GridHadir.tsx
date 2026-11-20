"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Wand2 } from "lucide-react"
import { aturHadirAction, isiHadirKosongAction } from "@/app/actions/gaji"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { MENU } from "@/config/akses"
import { cn } from "@/lib/utils"
import { KODE_HADIR, type KodeHadir } from "@kopkar/backend/src/gaji/hitung.ts"
import type { BarisHadir } from "@kopkar/backend/src/gaji/periode.ts"

const KODE = Object.keys(KODE_HADIR) as KodeHadir[]
const WARNA: Record<KodeHadir, string> = {
    ATN: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    RD: "bg-muted text-muted-foreground",
    ABS: "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300",
    UNP: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
    ANN: "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300",
    MED: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    MAT: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-300",
}
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

/** Grid kehadiran satu periode: satu kode per karyawan per hari, tersimpan saat dipilih. Periode final hanya dibaca. */
export function GridHadir({ periodeId, tanggal, baris, final }: { periodeId: number; tanggal: string[]; baris: BarisHadir[]; final: boolean }) {
    const boleh = useBolehAksi()
    const router = useRouter()
    const ubahBoleh = !final && boleh([MENU.absensi], "tambah")
    const [isi, setIsi] = useState(() => Object.fromEntries(baris.map((b) => [b.karyawan_id, b.hari])) as Record<string, Record<string, KodeHadir>>)
    const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
    const [sibuk, mulai] = useTransition()

    const atur = (karyawanId: string, t: string, kode: string) => {
        const lama = isi[karyawanId]?.[t]
        setIsi((s) => ({ ...s, [karyawanId]: { ...s[karyawanId], [t]: kode as KodeHadir } }))
        mulai(async () => {
            const r = await aturHadirAction(periodeId, Number(karyawanId), t, kode)
            if (r && !r.ok) {
                setIsi((s) => ({ ...s, [karyawanId]: { ...s[karyawanId], [t]: lama as KodeHadir } }))
                setPesan({ ok: false, teks: r.error })
            } else if (r?.pesan.startsWith("MODE UJI")) setPesan({ ok: true, teks: r.pesan })
        })
    }
    const isiKosong = (karyawanId: string | null) => {
        if (!confirm("Isi hari yang masih kosong: hari dengan pindai QR menjadi ATN, hari kerja lain ATN, hari istirahat RD. Isian yang sudah ada tidak berubah. Lanjut?")) return
        mulai(async () => {
            const r = await isiHadirKosongAction(periodeId, karyawanId ? Number(karyawanId) : null, true)
            if (r) setPesan(r.ok ? { ok: true, teks: r.pesan } : { ok: false, teks: r.error })
            router.refresh()
        })
    }
    const jumlah = (karyawanId: string) => {
        const j: Partial<Record<KodeHadir, number>> = {}
        for (const k of Object.values(isi[karyawanId] ?? {})) if (k) j[k] = (j[k] ?? 0) + 1
        return j
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                {KODE.map((k) => <span key={k} className={cn("rounded px-1.5 py-0.5 font-semibold", WARNA[k])} title={KODE_HADIR[k]}>{k} {KODE_HADIR[k]}</span>)}
                {ubahBoleh && (
                    <button type="button" onClick={() => isiKosong(null)} disabled={sibuk}
                        className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border px-3 font-medium hover:bg-muted disabled:opacity-50">
                        {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Isi hari kosong (semua)
                    </button>
                )}
            </div>
            {pesan && <p role={pesan.ok ? "status" : "alert"} className={cn("rounded-md border px-3 py-2 text-sm", pesan.ok ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400")}>{pesan.teks}</p>}
            <div className="overflow-x-auto rounded-md border">
                <table className="text-xs">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="sticky left-0 z-10 bg-muted px-2 py-1.5 text-left">Karyawan</th>
                            {tanggal.map((t) => {
                                const d = new Date(`${t}T00:00:00Z`).getUTCDay()
                                return <th key={t} className={cn("px-0.5 py-1 text-center font-medium", d === 0 && "text-red-600")}>{HARI[d]}<br />{t.slice(8)}</th>
                            })}
                            {(["ATN", "ABS", "UNP", "ANN", "MED", "MAT", "RD"] as KodeHadir[]).map((k) => <th key={k} className="px-1.5 py-1 text-right">{k}</th>)}
                            {ubahBoleh && <th className="px-1.5 py-1" />}
                        </tr>
                    </thead>
                    <tbody>
                        {baris.length === 0 && <tr><td colSpan={tanggal.length + 9} className="p-6 text-center text-sm text-muted-foreground">Belum ada karyawan aktif. Tambahkan di Kepegawaian, Data Karyawan.</td></tr>}
                        {baris.map((b) => {
                            const j = jumlah(b.karyawan_id)
                            return (
                                <tr key={b.karyawan_id} className="border-t">
                                    <td className="sticky left-0 z-10 bg-background px-2 py-1 whitespace-nowrap">
                                        <span className="font-mono">{b.kode}</span> <span className="font-medium">{b.nama}</span>
                                        {b.tertaut && <span className="ml-1 text-[10px] text-muted-foreground" title="Tertaut anggota: pindai QR mengisi ATN">QR</span>}
                                    </td>
                                    {tanggal.map((t) => {
                                        const k = isi[b.karyawan_id]?.[t]
                                        return (
                                            <td key={t} className="p-0.5">
                                                <select aria-label={`${b.nama} ${t}`} value={k ?? ""} disabled={!ubahBoleh}
                                                    onChange={(e) => atur(b.karyawan_id, t, e.target.value)}
                                                    className={cn("h-7 w-[3.1rem] appearance-none rounded border-0 px-1 text-center text-[11px] font-semibold disabled:opacity-100", k ? WARNA[k] : "bg-background text-muted-foreground ring-1 ring-inset ring-border")}>
                                                    <option value="">-</option>
                                                    {KODE.map((x) => <option key={x} value={x}>{x}</option>)}
                                                </select>
                                            </td>
                                        )
                                    })}
                                    {(["ATN", "ABS", "UNP", "ANN", "MED", "MAT", "RD"] as KodeHadir[]).map((x) => <td key={x} className="px-1.5 text-right tabular-nums font-semibold">{j[x] ?? 0}</td>)}
                                    {ubahBoleh && <td className="px-1"><button type="button" title="Isi hari kosong karyawan ini" onClick={() => isiKosong(b.karyawan_id)} disabled={sibuk} className="rounded p-1 hover:bg-muted"><Wand2 className="h-3.5 w-3.5" /></button></td>}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-muted-foreground">ATN = hari kerja dibayar (tunjangan transport dan makan). ABS dan izin tanpa upah (UNP) memotong upah per hari. Cuti (ANN), sakit (MED), dan melahirkan (MAT) tidak memotong upah dan tidak mendapat tunjangan harian.</p>
        </div>
    )
}
