"use client"

import { useState } from "react"
import { Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { bukaCetak, type Orientasi } from "@/lib/cetak-klien"

/**
 * Cetak laporan di halaman ini sebagai dokumen cetak sendiri (kop surat dari Pengaturan Perusahaan, orientasi kertas otomatis,
 * tanpa form dan tombol). Isi yang dicetak: elemen induk blok `KopLaporan` (judul dan periode diambil darinya), atau elemen
 * bertanda `data-area-cetak` (judul dari `data-judul-cetak`, keterangan dari `data-subjudul-cetak`).
 */
export function TombolCetak({ label = "Cetak", orientasi = "auto" }: { label?: string; orientasi?: Orientasi }) {
    const [sibuk, setSibuk] = useState(false)
    const cetak = async () => {
        const kop = document.querySelector<HTMLElement>("[data-kop-laporan]")
        const area = kop?.parentElement ?? document.querySelector<HTMLElement>("[data-area-cetak]")
        if (!area) { window.print(); return }
        const judul = kop?.dataset.judul ?? area.dataset.judulCetak ?? document.title
        const subjudul = kop?.dataset.periode ?? area.dataset.subjudulCetak
        setSibuk(true)
        const galat = await bukaCetak({ judul, subjudul, orientasi, isi: area })
        setSibuk(false)
        if (galat) alert(galat)
    }
    return (
        <Button type="button" onClick={cetak} disabled={sibuk} variant="outline" size="sm" className="h-9 font-medium shadow-sm print:hidden">
            {sibuk ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />} {label}
        </Button>
    )
}
