"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { pesanBaruAdminAction } from "@/app/actions/pesan"

export interface PesanAdminTampil { id: number; pengirim: "anggota" | "admin"; opr_nama: string | null; isi: string; dibuat_pada: string }

const JEDA_MS = 2500
export const PERISTIWA_SEGARKAN = "pesan:segarkan"

/**
 * Isi percakapan yang diperbarui langsung: selama tab terlihat, pesan baru diambil tiap 2,5 detik (polling ringan,
 * tahan di balik proxy), dan segera setelah operator mengirim balasan (peristiwa pesan:segarkan dari BalasPesan).
 */
export function PercakapanLangsung({ id, namaAnggota, awal }: { id: number; namaAnggota: string; awal: PesanAdminTampil[] }) {
    const [pesan, setPesan] = useState(awal)
    const terakhir = useRef(awal.at(-1)?.id ?? 0)
    const sedangAmbil = useRef(false)
    const ujung = useRef<HTMLDivElement>(null)
    const dekatBawah = useRef(true)

    const ambil = useCallback(async () => {
        if (sedangAmbil.current || document.visibilityState !== "visible") return
        sedangAmbil.current = true
        try {
            const baru = await pesanBaruAdminAction(id, terakhir.current)
            if (!baru || baru.length === 0) return
            terakhir.current = baru[baru.length - 1].id
            dekatBawah.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200
            setPesan((lama) => [...lama, ...baru.filter((b) => !lama.some((l) => l.id === b.id))])
        } catch { /* koneksi putus sebentar: coba lagi pada putaran berikutnya */ } finally {
            sedangAmbil.current = false
        }
    }, [id])

    useEffect(() => {
        const t = setInterval(ambil, JEDA_MS)
        window.addEventListener(PERISTIWA_SEGARKAN, ambil)
        document.addEventListener("visibilitychange", ambil)
        return () => { clearInterval(t); window.removeEventListener(PERISTIWA_SEGARKAN, ambil); document.removeEventListener("visibilitychange", ambil) }
    }, [ambil])

    useEffect(() => {
        if (pesan.length > awal.length && dekatBawah.current) ujung.current?.scrollIntoView({ block: "end", behavior: "smooth" })
    }, [pesan, awal.length])

    return (
        <>
            <ol className="space-y-3" aria-live="polite">
                {pesan.map((m) => {
                    const admin = m.pengirim === "admin"
                    return (
                        <li key={m.id} className={`flex ${admin ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${admin ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border bg-muted/40"}`}>
                                <p className={`mb-0.5 text-xs font-semibold ${admin ? "text-white/80" : "text-muted-foreground"}`}>{admin ? (m.opr_nama || "Koperasi") : namaAnggota}</p>
                                <p className="whitespace-pre-line leading-relaxed">{m.isi}</p>
                                <p className={`mt-1 text-[11px] ${admin ? "text-white/70" : "text-muted-foreground"}`}>{m.dibuat_pada}</p>
                            </div>
                        </li>
                    )
                })}
            </ol>
            <div ref={ujung} />
        </>
    )
}
