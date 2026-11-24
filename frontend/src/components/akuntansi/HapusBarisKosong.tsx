"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { hapusBarisJurnalAction, hapusSemuaBarisKosongAction } from "@/app/actions/transaksi"
import { beriTahu, tanyaYa } from "@/components/ui/Tanya"

/** Hapus satu baris kosong (debit dan kredit nol) di Jurnal Bermasalah; baris lain di bukti itu tidak tersentuh. */
export function TombolHapusKosong({ nomor, urutan }: { nomor: string; urutan: number }) {
    const [sibuk, mulai] = useTransition()
    const router = useRouter()
    const hapus = async () => {
        if (!(await tanyaYa(`Hapus baris kosong ini dari bukti ${nomor}? Baris lain di bukti itu tidak berubah.`))) return
        mulai(async () => {
            const h = await hapusBarisJurnalAction(nomor, urutan)
            if (h && !h.ok) void beriTahu(h.error, { ok: false })
            router.refresh()
        })
    }
    return (
        <button type="button" onClick={hapus} disabled={sibuk} title="Hapus baris kosong" aria-label={`Hapus baris kosong bukti ${nomor}`}
            className="grid h-7 w-7 place-items-center rounded-md text-red-600 hover:bg-muted disabled:opacity-50">
            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
    )
}

/** Hapus semua baris kosong ke akun yang tidak ada di COA, sampai tanggal laporan. */
export function TombolHapusSemuaKosong({ sampai, jumlah }: { sampai: string; jumlah: number }) {
    const [sibuk, mulai] = useTransition()
    const router = useRouter()
    const hapus = async () => {
        if (!(await tanyaYa(`Hapus ${jumlah} baris kosong? Hanya baris bernilai nol yang dihapus; baris berisi di bukti yang sama tidak berubah.`))) return
        mulai(async () => {
            const h = await hapusSemuaBarisKosongAction(sampai)
            if (h) void beriTahu(h.ok ? h.pesan : h.error, { ok: !!h.ok })
            router.refresh()
        })
    }
    return (
        <button type="button" onClick={hapus} disabled={sibuk} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-red-300 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10">
            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Hapus {jumlah} baris kosong
        </button>
    )
}
