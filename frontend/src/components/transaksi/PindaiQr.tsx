"use client"

import { useEffect, useRef, useState } from "react"
import { bacaQrAction } from "@/app/actions/transaksi"
import { Input } from "@/components/ui/input"
import { ModalForm } from "@/components/ui/Modal"
import type { AnggotaRingkas } from "@/lib/queries/anggota"

const JEDA_MS = 250

/** Pindai QR dari HP anggota lewat kamera (webcam), atau alat pemindai USB yang mengetik ke kotak isian lalu Enter. */
export function PindaiQr({ buka, onTutup, onHasil }: { buka: boolean; onTutup: () => void; onHasil: (a: AnggotaRingkas) => void }) {
    const video = useRef<HTMLVideoElement>(null)
    const [galat, setGalat] = useState("")
    const [kamera, setKamera] = useState("")
    const [teks, setTeks] = useState("")
    const sibuk = useRef(false)

    const proses = async (isi: string) => {
        if (sibuk.current) return
        sibuk.current = true
        const r = await bacaQrAction(isi)
        if (r.ok) { onHasil(r.anggota); onTutup() } else setGalat(r.error)
        setTeks("")
        setTimeout(() => { sibuk.current = false }, r.ok ? 0 : 2000) // QR yang sama tetap terlihat kamera; jangan dibaca berulang
    }
    const prosesTerkini = useRef(proses)
    useEffect(() => { prosesTerkini.current = proses })

    useEffect(() => {
        if (!buka) return
        let berhenti = false, alur: MediaStream | null = null, waktu: ReturnType<typeof setTimeout>
        setGalat(""); setKamera("")
        const mulai = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) throw new Error("tidak tersedia")
                alur = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
                if (berhenti) { alur.getTracks().forEach((t) => t.stop()); return }
                const v = video.current!
                v.srcObject = alur
                await v.play()
                const { default: jsQR } = await import("jsqr")
                const kanvas = document.createElement("canvas")
                const ctx = kanvas.getContext("2d", { willReadFrequently: true })!
                const putar = () => {
                    if (berhenti) return
                    if (v.videoWidth > 0 && !sibuk.current) {
                        kanvas.width = v.videoWidth
                        kanvas.height = v.videoHeight
                        ctx.drawImage(v, 0, 0)
                        const hasil = jsQR(ctx.getImageData(0, 0, kanvas.width, kanvas.height).data, kanvas.width, kanvas.height, { inversionAttempts: "dontInvert" })
                        if (hasil?.data) prosesTerkini.current(hasil.data)
                    }
                    waktu = setTimeout(putar, JEDA_MS)
                }
                putar()
            } catch {
                if (!berhenti) setKamera("Kamera tidak bisa dibuka. Izinkan akses kamera di browser, atau pakai alat pemindai USB di kotak bawah.")
            }
        }
        mulai()
        return () => { berhenti = true; clearTimeout(waktu); alur?.getTracks().forEach((t) => t.stop()) }
    }, [buka])

    return (
        <ModalForm open={buka} onOpenChange={(b) => { if (!b) onTutup() }} kunci={false} judul="Pindai QR anggota" keterangan="Arahkan QR di HP anggota ke kamera. Periksa nama anggota sebelum menyimpan.">
            <div className="space-y-3 text-sm">
                {kamera ? <p className="rounded-md border p-3 text-muted-foreground">{kamera}</p>
                    : <video ref={video} muted playsInline aria-label="Tampilan kamera" className="aspect-video w-full rounded-md bg-black object-cover" />}
                {galat && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-2.5 text-red-700 dark:bg-red-500/10 dark:text-red-400">{galat}</p>}
                <form onSubmit={(e) => { e.preventDefault(); if (teks.trim()) proses(teks) }}>
                    <Input value={teks} onChange={(e) => setTeks(e.target.value)} autoFocus autoComplete="off" aria-label="Hasil alat pemindai USB" placeholder="Alat pemindai USB: pindai di sini" />
                </form>
            </div>
        </ModalForm>
    )
}
