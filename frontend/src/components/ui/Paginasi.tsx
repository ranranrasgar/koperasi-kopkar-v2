"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { PilihBaris } from "@/components/ui/PilihBaris"
import { formatAngka } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Nomor halaman yang ditampilkan: pertama, terakhir, dan jendela di sekitar halaman aktif; "…" untuk celah. */
function nomorHalaman(aktif: number, total: number): (number | "…")[] {
    const set = new Set<number>([1, total, aktif, aktif - 1, aktif + 1, aktif - 2, aktif + 2])
    const urut = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
    const hasil: (number | "…")[] = []
    urut.forEach((n, i) => { if (i > 0 && n - urut[i - 1] > 1) hasil.push("…"); hasil.push(n) })
    return hasil
}

/**
 * Bilah halaman: baris per halaman, keterangan "Menampilkan x - y dari z", tombol awal/sebelumnya/nomor/berikutnya/akhir,
 * dan loncat ke halaman tertentu. Dipakai di atas dan di bawah tabel.
 */
export function Paginasi({ page, totalPages, pageSize, total, onHalaman, onBaris, disabled, className, awal }: {
    page: number; totalPages: number; pageSize: number; total: number
    onHalaman: (p: number) => void; onBaris: (nilai: string) => void; disabled?: boolean; className?: string
    /** Kontrol tambahan di awal baris (mis. menu Kolom), supaya tidak memakai baris sendiri. */
    awal?: React.ReactNode
}) {
    const [loncat, setLoncat] = useState("")
    if (total === 0) return null
    const dari = (page - 1) * pageSize + 1
    const sampai = Math.min(page * pageSize, total)
    const tombol = "grid h-8 min-w-8 place-items-center rounded-md px-2 text-xs font-medium text-on-surface transition-colors hover:bg-surface-variant disabled:pointer-events-none disabled:opacity-30"
    const pergi = (e: React.FormEvent) => {
        e.preventDefault()
        const n = Math.min(totalPages, Math.max(1, parseInt(loncat, 10) || 0))
        if (n >= 1 && n !== page) onHalaman(n)
        setLoncat("")
    }
    return (
        <div className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-2 p-3 print:hidden", className)}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {awal}
                <PilihBaris pageSize={pageSize} total={total} onUbah={onBaris} disabled={disabled} />
                <span className="text-xs text-on-surface-variant">
                    Menampilkan <b className="text-on-surface">{formatAngka(dari)}</b> - <b className="text-on-surface">{formatAngka(sampai)}</b> dari{" "}
                    <b className="text-on-surface">{formatAngka(total)}</b> data
                </span>
            </div>
            <nav aria-label="Halaman" className="flex flex-wrap items-center gap-1">
                <button type="button" className={tombol} disabled={disabled || page <= 1} onClick={() => onHalaman(1)} aria-label="Halaman pertama" title="Halaman pertama">
                    <ChevronsLeft className="h-4 w-4" />
                </button>
                <button type="button" className={tombol} disabled={disabled || page <= 1} onClick={() => onHalaman(page - 1)} aria-label="Halaman sebelumnya" title="Sebelumnya">
                    <ChevronLeft className="h-4 w-4" />
                </button>
                {nomorHalaman(page, totalPages).map((n, i) => n === "…"
                    ? <span key={`g${i}`} className="px-1 text-xs text-on-surface-variant">…</span>
                    : (
                        <button key={n} type="button" disabled={disabled} onClick={() => onHalaman(n)} aria-current={n === page ? "page" : undefined}
                            className={cn(tombol, n === page && "bg-primary text-white hover:bg-primary")}>
                            {formatAngka(n)}
                        </button>
                    ))}
                <button type="button" className={tombol} disabled={disabled || page >= totalPages} onClick={() => onHalaman(page + 1)} aria-label="Halaman berikutnya" title="Berikutnya">
                    <ChevronRight className="h-4 w-4" />
                </button>
                <button type="button" className={tombol} disabled={disabled || page >= totalPages} onClick={() => onHalaman(totalPages)} aria-label="Halaman terakhir" title="Halaman terakhir">
                    <ChevronsRight className="h-4 w-4" />
                </button>
                {totalPages > 7 && (
                    <form onSubmit={pergi} className="ml-2 flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <label htmlFor="loncat-halaman">Ke halaman</label>
                        <input id="loncat-halaman" inputMode="numeric" value={loncat} onChange={(e) => setLoncat(e.target.value.replace(/\D/g, ""))} placeholder={`1-${totalPages}`}
                            className="h-8 w-16 rounded-md border border-outline-variant bg-surface-container-lowest px-2 text-center text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" />
                    </form>
                )}
            </nav>
        </div>
    )
}
