"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy, Download, MessageCircle, Printer } from "lucide-react"
import qrcode from "qrcode-generator"
import { Button } from "@/components/ui/button"

// Poster pendaftaran digambar sekali di canvas: pratinjau, cetak, dan gambar unduhan berasal dari hasil yang sama. Ukuran A5 pada 300 dpi.
const LEBAR = 1748, TINGGI = 2480
const BIRU = "#0f2a5f", BIRU_MUDA = "#e8eefb", TEKS = "#1f2937", REDUP = "#4b5563"
const HURUF = "Arial, Helvetica, sans-serif"
const LANGKAH = ["Pindai kode QR dengan kamera HP", "Isi NIK karyawan dan verifikasi email", "Tunggu persetujuan pengurus, lalu masuk"]

/** Baris teks terpusat; terlalu panjang dipecah menjadi beberapa baris. Mengembalikan posisi y berikutnya. */
function teksTengah(c: CanvasRenderingContext2D, teks: string, y: number, jarak: number, lebar: number) {
    const baris: string[] = []
    let isi = ""
    for (const kata of teks.split(" ")) {
        const coba = isi ? `${isi} ${kata}` : kata
        if (isi && c.measureText(coba).width > lebar) { baris.push(isi); isi = kata } else isi = coba
    }
    baris.push(isi)
    for (const b of baris) { c.fillText(b, LEBAR / 2, y); y += jarak }
    return y
}

function gambarQr(c: CanvasRenderingContext2D, url: string, x: number, y: number, sisi: number) {
    const qr = qrcode(0, "M")
    qr.addData(url)
    qr.make()
    const n = qr.getModuleCount(), modul = Math.floor(sisi / n), geser = Math.floor((sisi - modul * n) / 2)
    c.fillStyle = "#000000"
    for (let b = 0; b < n; b++) for (let k = 0; k < n; k++) if (qr.isDark(b, k)) c.fillRect(x + geser + k * modul, y + geser + b * modul, modul, modul)
}

function muatLogo(src: string) {
    return new Promise<HTMLImageElement | null>((selesai) => {
        const g = new Image()
        g.onload = () => selesai(g)
        g.onerror = () => selesai(null)
        g.src = src
    })
}

async function gambarPoster(k: HTMLCanvasElement, o: { url: string; nama: string; logo: string; wa: string | null }) {
    const c = k.getContext("2d")
    if (!c) return
    k.width = LEBAR
    k.height = TINGGI
    c.fillStyle = "#ffffff"
    c.fillRect(0, 0, LEBAR, TINGGI)

    // Kepala: logo dan nama koperasi.
    c.fillStyle = BIRU
    c.fillRect(0, 0, LEBAR, 430)
    const logo = await muatLogo(o.logo)
    if (logo) {
        c.fillStyle = "#ffffff"
        c.beginPath()
        c.arc(LEBAR / 2, 165, 115, 0, Math.PI * 2)
        c.fill()
        const skala = 190 / Math.max(logo.width, logo.height), l = logo.width * skala, t = logo.height * skala
        c.drawImage(logo, LEBAR / 2 - l / 2, 165 - t / 2, l, t)
    }
    c.textAlign = "center"
    c.textBaseline = "alphabetic"
    c.fillStyle = "#ffffff"
    c.font = `bold 66px ${HURUF}`
    teksTengah(c, o.nama, 365, 74, LEBAR - 200)

    // Ajakan.
    c.fillStyle = BIRU
    c.font = `bold 118px ${HURUF}`
    c.fillText("Daftar Aplikasi Anggota", LEBAR / 2, 590)
    c.fillStyle = REDUP
    c.font = `52px ${HURUF}`
    c.fillText("Cek simpanan, pinjaman, dan ajukan kredit dari HP", LEBAR / 2, 675)

    // Kode QR, dengan area kosong di sekelilingnya supaya mudah terbaca.
    const sisi = 860, xQr = (LEBAR - sisi) / 2, yQr = 760
    c.strokeStyle = BIRU
    c.lineWidth = 8
    c.strokeRect(xQr - 46, yQr - 46, sisi + 92, sisi + 92)
    gambarQr(c, o.url, xQr, yQr, sisi)
    c.fillStyle = BIRU
    c.font = `bold 58px ${HURUF}`
    c.fillText("Pindai untuk mendaftar", LEBAR / 2, 1760)
    c.fillStyle = REDUP
    c.font = `42px ${HURUF}`
    c.fillText(o.url.replace(/^https?:\/\//, ""), LEBAR / 2, 1825)

    // Langkah.
    const xKiri = 210, jarak = 128
    let y = 1945
    c.textAlign = "left"
    LANGKAH.forEach((l, i) => {
        c.fillStyle = BIRU
        c.beginPath()
        c.arc(xKiri, y, 42, 0, Math.PI * 2)
        c.fill()
        c.fillStyle = "#ffffff"
        c.font = `bold 50px ${HURUF}`
        c.textAlign = "center"
        c.fillText(String(i + 1), xKiri, y + 18)
        c.textAlign = "left"
        c.fillStyle = TEKS
        c.font = `50px ${HURUF}`
        c.fillText(l, xKiri + 76, y + 18)
        y += jarak
    })

    // Kaki: bantuan WhatsApp bila diatur.
    if (o.wa) {
        c.fillStyle = BIRU_MUDA
        c.fillRect(0, TINGGI - 120, LEBAR, 120)
        c.fillStyle = BIRU
        c.font = `bold 46px ${HURUF}`
        c.textAlign = "center"
        c.fillText(`Bantuan WhatsApp: +${o.wa}`, LEBAR / 2, TINGGI - 44)
    }
}

const tombol = "h-9 font-medium shadow-sm"

/** Poster QR pendaftaran anggota untuk dicetak atau dibagikan pengurus. */
export function PosterDaftar({ url, nama, logo, wa, tanpaEnv }: { url: string; nama: string; logo: string; wa: string | null; tanpaEnv: boolean }) {
    const kanvas = useRef<HTMLCanvasElement>(null)
    const [tersalin, setTersalin] = useState(false)
    useEffect(() => { if (kanvas.current) void gambarPoster(kanvas.current, { url, nama, logo, wa }) }, [url, nama, logo, wa])

    const unduh = () => {
        const a = document.createElement("a")
        a.href = kanvas.current!.toDataURL("image/png")
        a.download = "poster-daftar-anggota.png"
        a.click()
    }
    const cetak = () => {
        const w = window.open("", "_blank")
        if (!w) { alert("Jendela cetak diblokir browser. Izinkan pop-up untuk situs ini."); return }
        w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Poster Daftar Anggota</title><style>@page{size:A5 portrait;margin:0}html,body{margin:0}img{display:block;width:148mm;height:210mm}</style></head><body><img src="${kanvas.current!.toDataURL("image/png")}" onload="window.focus();window.print()"></body></html>`)
        w.document.close()
    }
    const salin = async () => {
        await navigator.clipboard.writeText(url)
        setTersalin(true)
        setTimeout(() => setTersalin(false), 2000)
    }
    const pesanWa = `https://wa.me/?text=${encodeURIComponent(`Yuk daftar aplikasi anggota ${nama}. Cek simpanan, pinjaman, dan ajukan kredit dari HP:\n${url}`)}`

    return (
        <div className="grid gap-5 md:grid-cols-[minmax(0,17rem)_1fr]">
            <canvas ref={kanvas} aria-label="Pratinjau poster pendaftaran anggota" className="w-full rounded-md border shadow-sm" />
            <div className="space-y-3 text-sm">
                <p>Cetak dan tempel di kantor koperasi, atau bagikan ke grup karyawan. Anggota cukup memindai kode QR untuk membuka halaman pendaftaran.</p>
                <p className="break-all rounded-md bg-muted/50 px-3 py-2 font-mono text-xs">{url}</p>
                {tanpaEnv && <p className="text-amber-700 dark:text-amber-400">Env ANGGOTA_URL belum diisi di server ini, jadi dipakai alamat produksi.</p>}
                <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" className={tombol} onClick={cetak}><Printer className="mr-1.5 h-4 w-4" /> Cetak (A5)</Button>
                    <Button type="button" variant="outline" size="sm" className={tombol} onClick={unduh}><Download className="mr-1.5 h-4 w-4" /> Unduh Gambar</Button>
                    <Button type="button" variant="outline" size="sm" className={tombol} onClick={salin}>
                        {tersalin ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />} {tersalin ? "Tersalin" : "Salin Tautan"}
                    </Button>
                    <a href={pesanWa} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium shadow-sm hover:bg-muted">
                        <MessageCircle className="mr-1.5 h-4 w-4" /> Bagikan ke WA
                    </a>
                </div>
                <p className="text-xs text-muted-foreground">WhatsApp hanya mengirim teks dan tautan. Untuk mengirim poster, unduh gambarnya lalu lampirkan di chat.</p>
            </div>
        </div>
    )
}
