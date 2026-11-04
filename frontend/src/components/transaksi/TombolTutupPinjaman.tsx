"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CircleCheck, Loader2, Undo2 } from "lucide-react"
import { batalTutupPinjamanAction, tutupPinjamanAction } from "@/app/actions/master-aksi"

const kelasTombol = "inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50"

/** Tutup pinjaman sebagai lunas tanpa jurnal, untuk pinjaman yang sudah selesai di luar koperasi. Neraca tidak berubah. */
export function TombolTutupPinjaman({ noPinjaman, sisa }: { noPinjaman: string; sisa: string }) {
    const router = useRouter()
    const [sibuk, mulai] = useTransition()
    const tutup = () => {
        const alasan = prompt(`Tutup ${noPinjaman} sebagai LUNAS tanpa jurnal?\n\nSisa pokok ${sisa} tidak dibukukan, jadi neraca dan laporan keuangan tetap. Angsuran pinjaman ini tidak ikut Potongan Gaji lagi.\n\nTulis alasannya:`)
        if (alasan === null) return
        mulai(async () => {
            const h = await tutupPinjamanAction(noPinjaman, alasan)
            alert(h?.ok ? h.pesan : h?.error)
            router.refresh()
        })
    }
    return (
        <button type="button" onClick={tutup} disabled={sibuk} title="Tandai lunas tanpa setoran dan tanpa jurnal" className={kelasTombol}>
            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />} Tutup Pinjaman
        </button>
    )
}

/** Kembalikan pinjaman yang ditutup ke keadaan sebelumnya. */
export function TombolBatalTutup({ noPinjaman }: { noPinjaman: string }) {
    const router = useRouter()
    const [sibuk, mulai] = useTransition()
    const batal = () => {
        if (!confirm(`Batalkan penutupan ${noPinjaman}? Pinjaman kembali berjalan dan ikut Potongan Gaji lagi.`)) return
        mulai(async () => {
            const h = await batalTutupPinjamanAction(noPinjaman)
            alert(h?.ok ? h.pesan : h?.error)
            router.refresh()
        })
    }
    return (
        <button type="button" onClick={batal} disabled={sibuk} className={kelasTombol}>
            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Batalkan Penutupan
        </button>
    )
}
