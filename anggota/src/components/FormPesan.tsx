"use client"

import { useActionState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { kirimPesanAction } from "@/app/actions/pesan"
import { Kolom, kelasKolom, PesanGalat, tanpaReset, Tombol } from "@/components/form"
import { PERISTIWA_SEGARKAN } from "@/components/PercakapanLangsung"

const MAKS = 1000

/** Pesan baru (dengan subjek) atau balasan di percakapan yang sudah ada (dengan percakapanId). */
export function FormPesan({ percakapanId }: { percakapanId?: number }) {
    const router = useRouter()
    const form = useRef<HTMLFormElement>(null)
    const [hasil, kirim, proses] = useActionState(kirimPesanAction, null)

    useEffect(() => {
        if (!hasil?.ok) return
        if (percakapanId) { form.current?.reset(); window.dispatchEvent(new Event(PERISTIWA_SEGARKAN)) }
        else if (hasil.id) router.replace(`/pesan/${hasil.id}`)
    }, [hasil, percakapanId, router])

    return (
        <form ref={form} onSubmit={tanpaReset(kirim)} className="space-y-4">
            {percakapanId && <input type="hidden" name="id" value={percakapanId} />}
            {!percakapanId && <Kolom label="Subjek" name="subjek" maxLength={100} required placeholder="Contoh: Pertanyaan pengajuan kredit" />}
            <div className="space-y-2">
                <label htmlFor="isi" className="text-sm font-medium">{percakapanId ? "Balas" : "Pesan"}</label>
                <textarea id="isi" name="isi" rows={percakapanId ? 3 : 6} maxLength={MAKS} required className={`${kelasKolom} h-auto py-3 leading-relaxed`} />
            </div>
            <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
            {hasil?.ok && !hasil.id && <p role="status" className="rounded-xl bg-masuk/15 px-4 py-3 text-sm font-medium text-masuk">{hasil.pesan}</p>}
            <Tombol proses={proses} label="Mengirim…">Kirim</Tombol>
        </form>
    )
}
