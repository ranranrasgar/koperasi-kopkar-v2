"use client"

import { useTransition } from "react"
import { Loader2, Mail } from "lucide-react"
import { kirimUlangInfoPinjamanAction } from "@/app/actions/transaksi"

/** Kirim ulang informasi kredit dan jadwal angsuran (notifikasi, email, dan PDF) ke anggota pemilik pinjaman. */
export function TombolKirimInfo({ noPinjaman, kecil = false }: { noPinjaman: string; kecil?: boolean }) {
    const [sibuk, mulai] = useTransition()
    const kirim = () => {
        if (!confirm(`Kirim ulang informasi kredit dan jadwal angsuran ${noPinjaman} ke anggota (notifikasi dan email dengan lampiran PDF)?`)) return
        mulai(async () => {
            const h = await kirimUlangInfoPinjamanAction(noPinjaman)
            if (h) alert(h.ok ? h.pesan : h.error)
        })
    }
    return (
        <button type="button" onClick={kirim} disabled={sibuk} title="Kirim ulang info kredit dan jadwal angsuran ke anggota"
            className={kecil ? "inline-flex items-center gap-1 text-xs text-blue-600 hover:underline disabled:opacity-50"
                : "inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"}>
            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Kirim info ke anggota
        </button>
    )
}
