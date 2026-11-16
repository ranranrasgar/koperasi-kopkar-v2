"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Loader2, ScanLine, X } from "lucide-react"
import { bacaTagihanAction, bayarTagihanAction } from "@/app/actions/kantin"
import type { RincianTagihan } from "@kopkar/backend/src/posting/kantin.ts"

const rupiah = (n: number | string) => `Rp ${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`
const JEDA_MS = 250

/**
 * Pindai QR tagihan yang ditampilkan kasir kantin, periksa rinciannya, lalu setujui dengan PIN transaksi. Pembayaran dari Simpanan Sukarela.
 * Bila kamera tidak bisa dibuka, kode di bawah QR kasir bisa diketik.
 */
export function PindaiTagihanKantin() {
    const router = useRouter()
    const [buka, setBuka] = useState(false)
    const [teks, setTeks] = useState("")
    const [rincian, setRincian] = useState<{ data: RincianTagihan; adaPin: boolean } | null>(null)
    const [pin, setPin] = useState("")
    const [galat, setGalat] = useState("")
    const [kamera, setKamera] = useState("")
    const [lunas, setLunas] = useState<{ noBukti: string; total: number; saldo: number; ujicoba: boolean } | null>(null)
    const [sibuk, mulai] = useTransition()
    const video = useRef<HTMLVideoElement>(null)
    const terbaca = useRef(false)

    const tutup = () => { setBuka(false); setRincian(null); setTeks(""); setPin(""); setGalat(""); setLunas(null); terbaca.current = false }
    const baca = (isi: string) => mulai(async () => {
        setGalat("")
        const r = await bacaTagihanAction(isi.trim())
        if (!r.ok) { setGalat(r.error); terbaca.current = false; return }
        setTeks(isi.trim()); setRincian({ data: r.data, adaPin: r.adaPin })
    })
    const bayar = (e: React.FormEvent) => {
        e.preventDefault()
        mulai(async () => {
            setGalat("")
            const r = await bayarTagihanAction(teks, pin)
            if (!r.ok) { setGalat(r.error); setPin(""); return }
            setLunas(r); router.refresh()
        })
    }

    // Kamera belakang + jsQR selama layar pindai terbuka dan belum ada QR yang terbaca.
    useEffect(() => {
        if (!buka || rincian) return
        let berhenti = false, alur: MediaStream | null = null, waktu: ReturnType<typeof setTimeout>
        const mulaiKamera = async () => {
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
                    if (v.videoWidth > 0 && !terbaca.current) {
                        kanvas.width = v.videoWidth; kanvas.height = v.videoHeight
                        ctx.drawImage(v, 0, 0)
                        const h = jsQR(ctx.getImageData(0, 0, kanvas.width, kanvas.height).data, kanvas.width, kanvas.height, { inversionAttempts: "dontInvert" })
                        if (h?.data) { terbaca.current = true; baca(h.data) }
                    }
                    waktu = setTimeout(putar, JEDA_MS)
                }
                putar()
            } catch {
                if (!berhenti) setKamera("Kamera tidak bisa dibuka. Izinkan akses kamera, atau ketik kode di bawah QR kasir.")
            }
        }
        mulaiKamera()
        return () => { berhenti = true; clearTimeout(waktu); alur?.getTracks().forEach((t) => t.stop()) }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- baca memakai keadaan terbaru lewat transisi
    }, [buka, rincian])

    return (
        <>
            <button type="button" onClick={() => setBuka(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-utama px-5 py-3 text-sm font-semibold text-utama active:bg-utama-lembut">
                <ScanLine size={18} /> Pindai QR kantin
            </button>
            {buka && (
                <div role="dialog" aria-modal="true" aria-label="Pindai QR kantin" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5">
                    <div className="w-full max-w-sm rounded-[var(--radius-kartu)] bg-permukaan p-5 text-teks">
                        <div className="flex items-start justify-between gap-3">
                            <p className="font-bold">{lunas ? "Pembayaran berhasil" : rincian ? "Setujui pembayaran" : "Pindai QR kantin"}</p>
                            <button type="button" onClick={tutup} aria-label="Tutup" className="-mr-1 -mt-1 grid size-9 place-items-center rounded-full active:bg-garis/40"><X size={19} /></button>
                        </div>

                        {lunas ? (
                            <div className="py-5 text-center">
                                <CheckCircle2 size={56} className="mx-auto text-masuk" />
                                <p className="angka mt-3 text-2xl font-bold">{rupiah(lunas.total)}</p>
                                <p className="mt-1 text-sm text-redup">{lunas.noBukti} · sisa saldo {rupiah(lunas.saldo)}</p>
                                {lunas.ujicoba && <p className="mt-2 text-xs text-keluar">Mode uji: tidak tersimpan.</p>}
                                <button type="button" onClick={tutup} className="mt-5 rounded-full bg-utama px-6 py-2.5 text-sm font-semibold text-white">Selesai</button>
                            </div>
                        ) : rincian ? (
                            <form onSubmit={bayar} className="mt-3 space-y-3">
                                <div className="rounded-xl border border-garis p-3 text-sm">
                                    <p className="font-semibold">{rincian.data.kantin}</p>
                                    {rincian.data.item.map((it, i) => (
                                        <div key={i} className="mt-1 flex justify-between gap-3 text-redup"><span>{it.nama} · {Number(it.qty)} x {rupiah(it.harga)}</span><span className="angka">{rupiah(Number(it.qty) * Number(it.harga))}</span></div>
                                    ))}
                                    {Number(rincian.data.diskon) > 0 && <div className="mt-1 flex justify-between text-redup"><span>Diskon</span><span className="angka">-{rupiah(rincian.data.diskon)}</span></div>}
                                    <div className="mt-2 flex justify-between border-t border-garis pt-2 text-base font-bold"><span>Total</span><span className="angka">{rupiah(rincian.data.total)}</span></div>
                                </div>
                                {rincian.data.status !== "menunggu" ? (
                                    <p className="text-sm text-keluar">Tagihan ini {rincian.data.status === "lunas" ? "sudah dibayar" : rincian.data.status === "batal" ? "dibatalkan kasir" : "sudah kedaluwarsa"}. Minta kasir menampilkan QR baru.</p>
                                ) : !rincian.adaPin ? (
                                    <p className="text-sm">Anda belum punya PIN transaksi. <Link href="/akun/pin" className="font-semibold text-utama underline">Atur PIN</Link> dulu, lalu pindai lagi.</p>
                                ) : (
                                    <>
                                        <label className="block text-sm text-redup" htmlFor="pin-kantin">PIN transaksi (6 angka)</label>
                                        <input id="pin-kantin" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} autoFocus
                                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                                            className="angka w-full rounded-xl border border-garis bg-transparent px-4 py-3 text-center text-2xl tracking-[0.5em]" />
                                        <button type="submit" disabled={sibuk || pin.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-full bg-utama px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                                            {sibuk && <Loader2 size={16} className="animate-spin" />} Bayar {rupiah(rincian.data.total)}
                                        </button>
                                    </>
                                )}
                                {galat && <p role="alert" className="text-sm text-keluar">{galat}</p>}
                            </form>
                        ) : (
                            <div className="mt-3 space-y-3">
                                {kamera ? <p className="rounded-xl border border-garis p-3 text-sm text-redup">{kamera}</p>
                                    : <video ref={video} muted playsInline aria-label="Tampilan kamera" className="aspect-square w-full rounded-xl bg-black object-cover" />}
                                {sibuk && <p className="flex items-center gap-2 text-sm text-redup"><Loader2 size={16} className="animate-spin" /> Membaca tagihan...</p>}
                                {galat && <p role="alert" className="text-sm text-keluar">{galat}</p>}
                                <form onSubmit={(e) => { e.preventDefault(); if (teks.trim()) baca(teks) }}>
                                    <input value={teks} onChange={(e) => setTeks(e.target.value)} placeholder="Atau ketik kode QR kasir" aria-label="Kode QR kasir" autoComplete="off"
                                        className="w-full rounded-xl border border-garis bg-transparent px-4 py-2.5 text-sm" />
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
