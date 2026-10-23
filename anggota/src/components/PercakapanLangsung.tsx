"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { pesanBaruAction } from "@/app/actions/pesan"
import { tanggal } from "@/lib/format"

export interface PesanTampil { id: number; pengirim: "anggota" | "admin"; isi: string; dibuat_pada: string }

const JEDA_MS = 2500
export const PERISTIWA_SEGARKAN = "pesan:segarkan"

/**
 * Isi percakapan yang diperbarui langsung: selama halaman terlihat, pesan baru diambil tiap 2,5 detik (polling ringan,
 * tahan di balik proxy), dan segera setelah pengguna mengirim pesan (peristiwa pesan:segarkan dari FormPesan).
 */
export function PercakapanLangsung({ id, awal }: { id: number; awal: PesanTampil[] }) {
    const [pesan, setPesan] = useState(awal)
    const terakhir = useRef(awal.at(-1)?.id ?? 0)
    const sedangAmbil = useRef(false)
    const ujung = useRef<HTMLDivElement>(null)
    const dekatBawah = useRef(true)

    const ambil = useCallback(async () => {
        if (sedangAmbil.current || document.visibilityState !== "visible") return
        sedangAmbil.current = true
        try {
            const baru = await pesanBaruAction(id, terakhir.current)
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
                    const saya = m.pengirim === "anggota"
                    return (
                        <li key={m.id} className={`flex ${saya ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${saya ? "rounded-br-md bg-utama text-pada-utama" : "rounded-bl-md border border-garis bg-permukaan"}`}>
                                {!saya && <p className="mb-0.5 text-xs font-semibold text-utama">Koperasi</p>}
                                <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed">{m.isi}</p>
                                <p className={`mt-1 text-[11px] ${saya ? "text-pada-utama/75" : "text-redup"}`}>{tanggal(m.dibuat_pada)} · {m.dibuat_pada.slice(11, 16)}</p>
                            </div>
                        </li>
                    )
                })}
            </ol>
            <div ref={ujung} />
        </>
    )
}
