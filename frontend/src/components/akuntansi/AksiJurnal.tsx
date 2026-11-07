"use client"

import { useBolehAksi } from "@/components/layout/SidebarContext"
import { MENU } from "@/config/akses"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Printer, Scale, Trash2 } from "lucide-react"
import { hapusBarisJurnalAction, hapusJurnalAction, tandaiPenyesuaianAction } from "@/app/actions/transaksi"
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
    const boleh = useBolehAksi()
    const router = useRouter()
    const [sibuk, mulai] = useTransition()
    const nomor = String(item.nomor_bukti ?? "")
    const jp = nomor.startsWith("JP/"), ju = nomor.startsWith("JU/") || jp, bb = nomor.startsWith("BB/")
    const penyesuaian = jp || item.jenis === "penyesuaian"
    const tandai = () => {
        if (!confirm(penyesuaian ? `Kembalikan ${nomor} menjadi jurnal umum biasa?` : `Tandai ${nomor} sebagai jurnal penyesuaian? Nomor tetap; jurnal ini akan dipisahkan di kolom penyesuaian neraca lajur.`)) return
        mulai(async () => {
            const h = await tandaiPenyesuaianAction(nomor, !penyesuaian)
            if (h) alert(h.ok ? h.pesan : h.error)
            router.refresh()
        })
    }
    const hapus = () => {
        if (!confirm(`Hapus baris ini dari bukti ${nomor}? Tidak bisa dibatalkan.`)) return
        mulai(async () => {
            const h = await hapusBarisJurnalAction(nomor, Number(item.urutan))
            if (h && !h.ok && h.error.includes("tidak seimbang")) {
                // Baris bernilai tidak bisa dihapus sendiri; tawarkan menghapus seluruh bukti seperti sebelumnya.
                if (confirm(`${h.error}. Hapus seluruh bukti ${nomor}? Semua barisnya ikut terhapus dan tidak bisa dibatalkan.`)) {
                    const r = await hapusJurnalAction(nomor)
                    if (r) alert(r.ok ? r.pesan : r.error)
                }
            } else if (h) alert(h.ok ? h.pesan : h.error)
            router.refresh()
        })
    }
    return (
        <>
            <TombolVoucher nomorBukti={nomor} />
            {ju && boleh([MENU.jurnalUmum, MENU.jurnalPenyesuaian], "ubah") && <TombolJurnalUbah nomorBukti={nomor} hariIni={hariIni()} />}
            {nomor.startsWith("JU/") && (
                <button type="button" title={penyesuaian ? "Kembalikan ke jurnal umum biasa" : "Tandai sebagai jurnal penyesuaian"} onClick={tandai} disabled={sibuk}
                    className={`${tombol} ${penyesuaian ? "text-indigo-600" : "text-gray-500"}`}><Scale className="h-4 w-4" /></button>
            )}
            {(ju || bb) && boleh(bb ? [MENU.bankBook] : [MENU.jurnalUmum, MENU.jurnalPenyesuaian], "hapus") && (
                <button type="button" title="Hapus baris ini" onClick={hapus} disabled={sibuk} className={`${tombol} text-red-600`}>
                    {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
            )}
        </>
    )
}
