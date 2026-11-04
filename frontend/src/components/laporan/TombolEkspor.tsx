"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { dariMentah, unduhExcel, type BagianMentah } from "@/lib/ekspor-excel"

/**
 * Ekspor Excel dari data server (`baris`, baris pertama = judul kolom; atau beberapa `bagian`), dengan kop dan format seperti dokumen cetak.
 * Judul dan keterangan diambil dari prop, atau dari penanda yang sama dengan TombolCetak (KopLaporan / data-area-cetak).
 */
export function TombolEkspor({ nama, baris, bagian, judul, subjudul }: { nama: string; baris?: string[][]; bagian?: BagianMentah[]; judul?: string; subjudul?: string }) {
    const [sibuk, setSibuk] = useState(false)
    const daftar = bagian ?? [{ baris: baris ?? [] }]
    const ekspor = async () => {
        const kop = document.querySelector<HTMLElement>("[data-kop-laporan]")
        const area = document.querySelector<HTMLElement>("[data-area-cetak]")
        setSibuk(true)
        const galat = await unduhExcel({
            nama, judul: judul ?? kop?.dataset.judul ?? area?.dataset.judulCetak ?? nama,
            subjudul: subjudul ?? kop?.dataset.periode ?? area?.dataset.subjudulCetak, bagian: daftar.map(dariMentah),
        })
        setSibuk(false)
        if (galat) alert(galat)
    }
    return (
        <Button type="button" onClick={ekspor} variant="outline" size="sm" className="h-9 font-medium shadow-sm print:hidden" disabled={sibuk || daftar.every((b) => b.baris.length <= 1)}>
            {sibuk ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Download className="mr-1.5 h-4 w-4" />} Ekspor
        </Button>
    )
}
