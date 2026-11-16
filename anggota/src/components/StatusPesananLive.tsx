"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { batalPesananAction } from "@/app/actions/kantin"

/** Muat ulang status pesanan tiap 10 detik selama belum selesai, dan tombol batal selama kantin belum memprosesnya. */
export function StatusPesananLive({ id, bolehBatal, aktif }: { id: number; bolehBatal: boolean; aktif: boolean }) {
    const router = useRouter()
    const [galat, setGalat] = useState("")
    const [sibuk, mulai] = useTransition()
    useEffect(() => {
        if (!aktif) return
        const t = setInterval(() => router.refresh(), 10_000)
        return () => clearInterval(t)
    }, [aktif, router])
    if (!bolehBatal) return null
    return (
        <div className="pt-2">
            <button type="button" disabled={sibuk} onClick={() => { if (confirm("Batalkan pesanan ini?")) mulai(async () => { const r = await batalPesananAction(id); if (r.ok) router.refresh(); else setGalat(r.error) }) }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-keluar py-3 text-sm font-semibold text-keluar">
                {sibuk && <Loader2 size={16} className="animate-spin" />} Batalkan pesanan
            </button>
            {galat && <p role="alert" className="mt-2 text-sm text-keluar">{galat}</p>}
        </div>
    )
}
