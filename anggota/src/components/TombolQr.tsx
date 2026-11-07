"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2, QrCode, RefreshCw, X } from "lucide-react"
import qrcode from "qrcode-generator"
import { buatQrAction } from "@/app/actions/qr"

function gambarQr(teks: string) {
    const q = qrcode(0, "M")
    q.addData(teks)
    q.make()
    return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true })
}

/** Tombol QR saya di kartu saldo: QR satu untuk semua transaksi di kasir. Berlaku 5 menit. */
export function TombolQr({ nama }: { nama: string }) {
    const judul = "QR saya", sub = nama
    const [buka, setBuka] = useState(false)
    const [svg, setSvg] = useState("")
    const [sisa, setSisa] = useState(0)
    const [galat, setGalat] = useState("")
    const [sibuk, mulai] = useTransition()

    const muat = () => mulai(async () => {
        setGalat("")
        const r = await buatQrAction()
        if (!r.ok) { setSvg(""); setGalat(r.error); return }
        setSvg(gambarQr(r.teks))
        setSisa(r.detik)
    })
    useEffect(() => {
        if (!buka || sisa <= 0) return
        const t = setTimeout(() => setSisa(sisa - 1), 1000)
        return () => clearTimeout(t)
    }, [buka, sisa])

    const bukaQr = () => { setBuka(true); muat() }
    const habis = !sibuk && !galat && svg !== "" && sisa <= 0
    return (
        <>
            <button type="button" onClick={bukaQr} aria-label="Tampilkan QR saya" className="grid size-10 place-items-center rounded-full opacity-80 hover:opacity-100">
                <QrCode size={19} strokeWidth={1.75} />
            </button>
            {buka && (
                <div role="dialog" aria-modal="true" aria-label={`QR ${judul}`} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5">
                    <div className="w-full max-w-sm rounded-[var(--radius-kartu)] bg-permukaan p-5 text-center text-teks">
                        <div className="flex items-start justify-between gap-3 text-left">
                            <div className="min-w-0">
                                <p className="font-bold leading-snug">{judul}</p>
                                <p className="truncate text-xs text-redup">{sub}</p>
                            </div>
                            <button type="button" onClick={() => setBuka(false)} aria-label="Tutup" className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full active:bg-garis/40"><X size={19} /></button>
                        </div>
                        <div className="relative mx-auto mt-4 aspect-square w-full max-w-64 rounded-2xl bg-white p-4">
                            {svg && <div className={habis ? "opacity-10" : ""} dangerouslySetInnerHTML={{ __html: svg }} />}
                            {sibuk && <Loader2 className="absolute inset-0 m-auto animate-spin text-black" />}
                        </div>
                        {galat && <p role="alert" className="mt-3 text-sm text-keluar">{galat}</p>}
                        {habis ? (
                            <button type="button" onClick={muat} className="mt-4 inline-flex items-center gap-2 rounded-full bg-utama px-5 py-2.5 text-sm font-semibold text-white">
                                <RefreshCw size={16} /> Buat QR baru
                            </button>
                        ) : !galat && (
                            <p className="mt-3 text-sm text-redup">Tunjukkan ke kasir. Berlaku <span className="angka font-semibold">{Math.floor(sisa / 60)}:{String(sisa % 60).padStart(2, "0")}</span></p>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
