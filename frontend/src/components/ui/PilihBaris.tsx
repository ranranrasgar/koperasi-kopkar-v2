"use client"

import { MAKS_SEMUA, PILIHAN_BARIS } from "@/lib/halaman"
import { formatAngka } from "@/lib/format"

/** Pilihan jumlah baris per halaman (25/50/100/200/Semua). onUbah menerima nilai parameter URL pageSize. */
export function PilihBaris({ pageSize, total, onUbah, disabled }: {
    pageSize: number; total: number; onUbah: (nilai: string) => void; disabled?: boolean
}) {
    const nilai = pageSize >= MAKS_SEMUA ? "semua" : String(pageSize)
    // Ukuran bawaan tabel yang tidak ada di pilihan (mis. 20) tetap ditampilkan supaya pilihan saat ini terlihat.
    const angka = [...new Set([...PILIHAN_BARIS, ...(pageSize < MAKS_SEMUA ? [pageSize] : [])])].sort((a, b) => a - b)
    return (
        <label className="flex items-center gap-2 text-xs text-muted-foreground print:hidden">
            <span className="whitespace-nowrap">Baris per halaman</span>
            <select value={nilai} disabled={disabled} onChange={(e) => onUbah(e.target.value)} aria-label="Baris per halaman"
                className="h-8 rounded-md border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500">
                {angka.map((n) => <option key={n} value={n}>{n}</option>)}
                <option value="semua">{total > MAKS_SEMUA ? `Semua (maks. ${formatAngka(MAKS_SEMUA)})` : "Semua"}</option>
            </select>
        </label>
    )
}
