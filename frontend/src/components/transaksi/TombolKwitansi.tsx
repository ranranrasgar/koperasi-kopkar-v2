"use client"

import { useTransition } from "react"
import { Loader2, Printer } from "lucide-react"
import { dataBuktiAction } from "@/app/actions/kwitansi"
import { bukaBuku, bukaKwitansi } from "@/lib/cetak-kwitansi"
import type { JenisBukti } from "@/lib/kwitansi-tipe"

/** Cetak kwitansi atau buku pinjaman untuk dot matrix. `ikon`: tombol kecil tanpa teks untuk baris tabel. */
export function TombolKwitansi({ jenis, no, label = "Cetak Kwitansi", ikon = false }: { jenis: JenisBukti; no: string; label?: string; ikon?: boolean }) {
    const [sibuk, mulai] = useTransition()
    const cetak = () => mulai(async () => {
        const r = await dataBuktiAction(jenis, no)
        const galat = "error" in r ? r.error : "buku" in r ? bukaBuku(r.buku, r.kop) : bukaKwitansi(r.kwitansi, r.kop)
        if (galat) alert(galat)
    })
    const Ikon = sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />
    if (ikon) return <button type="button" onClick={cetak} disabled={sibuk} title={label} aria-label={`${label} ${no}`} className="rounded p-1.5 hover:bg-muted disabled:opacity-50">{Ikon}</button>
    return (
        <button type="button" onClick={cetak} disabled={sibuk} className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50">
            {Ikon} {label}
        </button>
    )
}

/** Aksi baris di Buku Simpanan: cetak ulang kwitansi. */
export function AksiBuktiSimpanan({ item }: { item: Record<string, unknown> }) {
    return <TombolKwitansi jenis="simpanan" no={String(item.no_bukti ?? "")} ikon />
}
