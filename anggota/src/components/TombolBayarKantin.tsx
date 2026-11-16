"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, QrCode, RefreshCw, X } from "lucide-react"
import qrcode from "qrcode-generator"
import { buatQrBayarAction, statusBayarAction, type StatusBayar } from "@/app/actions/kantin"

function gambarQr(teks: string) {
    const q = qrcode(0, "M")
    q.addData(teks)
    q.make()
    return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true })
}
const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`

/**
 * QR bayar belanja kantin dari Simpanan Sukarela. Kasir memindainya, lalu saldo terpotong sebesar belanja. QR berlaku 60 detik dan
 * hanya sekali pakai; selama QR tampil, HP memeriksa tiap 2 detik apakah kasir sudah memakainya.
 */
export function TombolBayarKantin({ saldo }: { saldo: number }) {
    const router = useRouter()
    const [buka, setBuka] = useState(false)
    const [svg, setSvg] = useState("")
    const [sisa, setSisa] = useState(0)
    const [galat, setGalat] = useState("")
    const [lunas, setLunas] = useState<Extract<StatusBayar, { lunas: true }> | null>(null)
    const [sibuk, mulai] = useTransition()
    const teks = useRef("")

    const muat = () => mulai(async () => {
        setGalat(""); setLunas(null)
        const r = await buatQrBayarAction()
        if (!r.ok) { setSvg(""); setGalat(r.error); return }
        teks.current = r.teks
        setSvg(gambarQr(r.teks))
        setSisa(r.detik)
    })
    useEffect(() => {
        if (!buka || sisa <= 0 || lunas) return
        const t = setTimeout(() => setSisa(sisa - 1), 1000)
        return () => clearTimeout(t)
    }, [buka, sisa, lunas])
    // Periksa status selama QR masih berlaku (dan beberapa detik sesudahnya: kasir bisa memindai di detik terakhir).
    useEffect(() => {
        if (!buka || lunas || !teks.current || sisa < -5) return
        const t = setInterval(async () => {
            const s = await statusBayarAction(teks.current)
            if (s.lunas) { setLunas(s); router.refresh() }
        }, 2000)
        return () => clearInterval(t)
    }, [buka, lunas, sisa, router])

    const habis = !sibuk && !galat && svg !== "" && sisa <= 0 && !lunas
    return (
        <>
            <button type="button" onClick={() => { setBuka(true); muat() }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-utama px-5 py-3 text-sm font-semibold text-white active:opacity-90">
                <QrCode size={18} /> Bayar dengan QR
            </button>
            {buka && (
                <div role="dialog" aria-modal="true" aria-label="QR bayar kantin" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-5">
                    <div className="w-full max-w-sm rounded-[var(--radius-kartu)] bg-permukaan p-5 text-center text-teks">
                        <div className="flex items-start justify-between gap-3 text-left">
                            <div className="min-w-0">
                                <p className="font-bold leading-snug">Bayar belanja kantin</p>
                                <p className="text-xs text-redup">Dari Simpanan Sukarela · saldo {rupiah(saldo)}</p>
                            </div>
                            <button type="button" onClick={() => setBuka(false)} aria-label="Tutup" className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full active:bg-garis/40"><X size={19} /></button>
                        </div>
                        {lunas ? (
                            <div className="py-6">
                                <CheckCircle2 size={56} className="mx-auto text-masuk" />
                                <p className="mt-3 text-lg font-bold">Pembayaran berhasil</p>
                                <p className="angka mt-1 text-2xl font-bold">{rupiah(lunas.total)}</p>
                                <p className="mt-1 text-sm text-redup">{lunas.kantin} · {lunas.noBukti}</p>
                                <button type="button" onClick={() => setBuka(false)} className="mt-5 rounded-full bg-utama px-6 py-2.5 text-sm font-semibold text-white">Selesai</button>
                            </div>
                        ) : (
                            <>
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
                                    <p className="mt-3 text-sm text-redup">Tunjukkan ke kasir kantin. Berlaku <span className="angka font-semibold">0:{String(Math.max(sisa, 0)).padStart(2, "0")}</span>, sekali pakai.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
