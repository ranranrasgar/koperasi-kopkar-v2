"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { aturSelesaiAction, balasPesanAction } from "@/app/actions/pesan"
import type { Hasil } from "@/app/actions/transaksi"
import { Textarea } from "@/components/ui/textarea"
import { Field, HasilTransaksi, SubmitButton, useAksiForm } from "@/components/transaksi/common"
import { PERISTIWA_SEGARKAN } from "./PercakapanLangsung"

export function BalasPesan({ id, selesai, maks }: { id: number; selesai: boolean; maks: number }) {
    const router = useRouter()
    const form = useRef<HTMLFormElement>(null)
    const { hasil, onSubmit, pending } = useAksiForm(balasPesanAction)
    const [isi, setIsi] = useState("")
    const [hasilStatus, setHasilStatus] = useState<Hasil>(null)
    const [sibuk, mulai] = useTransition()

    useEffect(() => {
        if (hasil?.ok && !hasil.pesan.startsWith("MODE UJI")) { setIsi(""); window.dispatchEvent(new Event(PERISTIWA_SEGARKAN)) }
    }, [hasil, router])

    const ubahStatus = () => mulai(async () => {
        const h = await aturSelesaiAction(id, !selesai)
        setHasilStatus(h)
        if (h?.ok) router.refresh()
    })

    return (
        <div className="space-y-3">
            <form ref={form} onSubmit={onSubmit} className="space-y-3">
                <input type="hidden" name="id" value={id} />
                <Field label="Balas anggota" htmlFor="isi" hint={`${isi.length}/${maks}. Anggota menerima notifikasi di HP-nya.`}>
                    <Textarea id="isi" name="isi" rows={4} maxLength={maks} required value={isi} onChange={(e) => setIsi(e.target.value)} />
                </Field>
                <HasilTransaksi hasil={hasil} />
                <SubmitButton pending={pending}>Kirim balasan</SubmitButton>
            </form>
            <div className="flex items-center gap-3">
                <button type="button" onClick={ubahStatus} disabled={sibuk} className="h-9 rounded-md border px-3 text-sm font-semibold hover:bg-muted disabled:opacity-60">
                    {selesai ? "Buka kembali" : "Tandai selesai"}
                </button>
                {hasilStatus && <span role="status" className="text-sm text-muted-foreground">{hasilStatus.ok ? hasilStatus.pesan : hasilStatus.error}</span>}
            </div>
        </div>
    )
}
