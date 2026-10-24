"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Printer, Trash2 } from "lucide-react"
import { hapusJurnalAction } from "@/app/actions/transaksi"
import { TombolJurnalUbah } from "@/components/transaksi/JurnalForm"
import { cetakVoucher } from "@/lib/cetak-voucher"
import { hariIni } from "@/lib/format"

const tombol = "grid h-8 w-8 place-items-center rounded-md hover:bg-muted/50 disabled:opacity-50"

/** Cetak voucher satu bukti; dipakai di daftar jurnal dan di modal Bank Book. */
export function TombolVoucher({ nomorBukti }: { nomorBukti: string }) {
    const [sibuk, setSibuk] = useState(false)
    return (
        <button type="button" title="Cetak voucher" disabled={sibuk} className={`${tombol} text-gray-600`} onClick={async () => {
            setSibuk(true)
            const galat = await cetakVoucher(nomorBukti)
            setSibuk(false)
            if (galat) alert(galat)
        }}>
            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        </button>
    )
}

/**
 * Aksi per baris daftar Jurnal Umum: cetak voucher untuk semua bukti; ubah (hanya JU/) dan hapus (JU/ dan BB/) untuk bukti yang boleh.
 * Bukti transaksi lain ditolak server dengan pesan alasannya.
 */
export function AksiJurnal({ item }: { item: Record<string, unknown> }) {
    const router = useRouter()
    const [sibuk, mulai] = useTransition()
    const nomor = String(item.nomor_bukti ?? "")
    const ju = nomor.startsWith("JU/"), bb = nomor.startsWith("BB/")
    const hapus = () => {
        if (!confirm(`Hapus bukti ${nomor}? Semua barisnya ikut terhapus dan tidak bisa dibatalkan.`)) return
        mulai(async () => {
            const h = await hapusJurnalAction(nomor)
            if (h) alert(h.ok ? h.pesan : h.error)
            router.refresh()
        })
    }
    return (
        <>
            <TombolVoucher nomorBukti={nomor} />
            {ju && <TombolJurnalUbah nomorBukti={nomor} hariIni={hariIni()} />}
            {(ju || bb) && (
                <button type="button" title="Hapus bukti" onClick={hapus} disabled={sibuk} className={`${tombol} text-red-600`}>
                    {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
            )}
        </>
    )
}
