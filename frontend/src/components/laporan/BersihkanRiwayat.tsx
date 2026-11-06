"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { bersihkanRiwayatAction } from "@/app/actions/aktivitas"
import { selectClass } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { ModalForm } from "@/components/ui/Modal"

/** Hapus riwayat aktivitas; tombolnya hanya ditampilkan untuk superadmin, dan server memeriksanya lagi. */
export function BersihkanRiwayat() {
    const [buka, setBuka] = useState(false)
    const [hari, setHari] = useState("30")
    const [teks, setTeks] = useState("")
    const [hasil, setHasil] = useState<{ ok: boolean; pesan: string } | null>(null)
    const [sibuk, mulai] = useTransition()
    const router = useRouter()
    const hapus = () => mulai(async () => {
        const r = await bersihkanRiwayatAction(Number(hari), teks)
        setHasil(r.ok ? { ok: true, pesan: r.pesan } : { ok: false, pesan: r.error })
        if (r.ok) { setTeks(""); router.refresh() }
    })
    return (
        <>
            <button type="button" onClick={() => { setBuka(true); setHasil(null); setTeks("") }}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-md border border-red-300 px-3 text-sm font-medium text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10 print:hidden">
                <Trash2 className="h-4 w-4" /> Bersihkan Riwayat
            </button>
            <ModalForm open={buka} onOpenChange={setBuka} kunci={false} judul="Bersihkan riwayat aktivitas"
                keterangan="Riwayat yang dihapus tidak bisa dikembalikan. Penghapusannya tetap tercatat di riwayat.">
                <div className="space-y-3 text-sm">
                    <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Yang dihapus</span>
                        <select value={hari} onChange={(e) => setHari(e.target.value)} className={selectClass}>
                            <option value="30">Lebih dari 30 hari</option>
                            <option value="7">Lebih dari 7 hari</option>
                            <option value="0">Semua riwayat</option>
                        </select>
                    </label>
                    <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Ketik HAPUS untuk memastikan</span>
                        <Input value={teks} onChange={(e) => setTeks(e.target.value)} autoComplete="off" />
                    </label>
                    {hasil && <p role="alert" className={hasil.ok ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>{hasil.pesan}</p>}
                    <div className="flex justify-end">
                        <button type="button" onClick={hapus} disabled={sibuk || teks.trim() !== "HAPUS"}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-red-600 px-4 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Hapus Riwayat
                        </button>
                    </div>
                </div>
            </ModalForm>
        </>
    )
}
