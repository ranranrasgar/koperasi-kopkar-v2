"use client"

import { useState } from "react"
import { formatAngka } from "@/lib/format"

/**
 * Tab per jenis simpanan di Kartu Simpanan. Semua panel tetap dirender: `data-cetak-tampil` membuat dokumen cetak
 * (bersihkanUntukCetak) memuat semua jenis, bukan hanya tab yang sedang terbuka.
 */
export function TabJenisSimpanan({ tab }: { tab: { kode: string; nama: string; saldo: number; isi: React.ReactNode }[] }) {
    const [pilih, setPilih] = useState(tab[0]?.kode)
    if (tab.length === 0) return null
    return (
        <div className="space-y-3">
            <div role="tablist" aria-label="Jenis simpanan" className="flex gap-1 overflow-x-auto border-b print:hidden">
                {tab.map((t) => {
                    const aktif = t.kode === pilih
                    return (
                        <button key={t.kode} type="button" role="tab" id={`tab-${t.kode}`} aria-selected={aktif} aria-controls={`panel-${t.kode}`} onClick={() => setPilih(t.kode)}
                            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-left text-sm transition-colors ${aktif ? "border-blue-600 font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                            <span className="block whitespace-nowrap">{t.nama}</span>
                            <span className="block text-xs tabular-nums">{formatAngka(t.saldo)}</span>
                        </button>
                    )
                })}
            </div>
            {tab.map((t) => (
                <div key={t.kode} role="tabpanel" id={`panel-${t.kode}`} aria-labelledby={`tab-${t.kode}`} hidden={t.kode !== pilih} data-cetak-tampil>{t.isi}</div>
            ))}
        </div>
    )
}
