"use client"

import { useState } from "react"
import { Loader2, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { bukaCetak, type Orientasi } from "@/lib/cetak-klien"
import { cetakBagian, dariMentah, type BagianMentah } from "@/lib/ekspor-excel"

/**
 * Cetak laporan di halaman ini sebagai dokumen cetak sendiri (kop surat dari Pengaturan Perusahaan, orientasi kertas otomatis,
 * tanpa form dan tombol). Isi yang dicetak: elemen induk blok `KopLaporan` (judul dan periode diambil darinya), atau elemen
 * bertanda `data-area-cetak` (judul dari `data-judul-cetak`, keterangan dari `data-subjudul-cetak`).
 * Tabel berhalaman wajib memberi `bagian`: seluruh data sesuai saringan, bukan hanya baris yang tampil di layar.
 */
export function TombolCetak({ label = "Cetak", orientasi = "auto", bagian, judul: judulTetap, subjudul: subjudulTetap }: {
    label?: string; orientasi?: Orientasi; bagian?: BagianMentah[]; judul?: string; subjudul?: string
}) {
    const [sibuk, setSibuk] = useState(false)
    const cetak = async () => {
        const kop = document.querySelector<HTMLElement>("[data-kop-laporan]")
        const area = kop?.parentElement ?? document.querySelector<HTMLElement>("[data-area-cetak]") ?? document.querySelector<HTMLElement>("main")
        if (!area) { window.print(); return }
        const judul = judulTetap ?? kop?.dataset.judul ?? area.dataset.judulCetak ?? document.title
        const subjudul = subjudulTetap ?? kop?.dataset.periode ?? area.dataset.subjudulCetak
        setSibuk(true)
        const galat = bagian ? await cetakBagian({ judul, subjudul, orientasi, bagian: bagian.map(dariMentah) }) : await bukaCetak({ judul, subjudul, orientasi, isi: area })
        setSibuk(false)
        if (galat) alert(galat)
    }
    return (
        <Button type="button" onClick={cetak} disabled={sibuk} variant="outline" size="sm" className="h-9 font-medium shadow-sm print:hidden">
            {sibuk ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />} {label}
        </Button>
    )
}
