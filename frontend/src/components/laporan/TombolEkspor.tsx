"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Ekspor CSV dari baris yang sudah berupa teks (baris pertama = judul kolom); dibuka rapi di Excel (BOM UTF-8). */
export function TombolEkspor({ nama, baris }: { nama: string; baris: string[][] }) {
    const ekspor = () => {
        const csv = baris.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
        const link = document.createElement("a")
        link.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
        link.download = `${nama}.csv`
        link.click()
        URL.revokeObjectURL(link.href)
    }
    return (
        <Button type="button" onClick={ekspor} variant="outline" size="sm" className="h-9 font-medium shadow-sm print:hidden" disabled={baris.length <= 1}>
            <Download className="mr-1.5 h-4 w-4" /> Ekspor
        </Button>
    )
}
